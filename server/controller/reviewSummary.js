/*
 * 시설별 후기 AI 요약 — 만들기와 읽기.
 *
 * 만들기는 후기가 등록·수정·삭제된 뒤 뒤에서 돕니다. 사용자는 기다리지 않고, 다음에
 * 목록을 열 때 새 요약이 보입니다. 읽기는 목록 응답에 그대로 실려 나갑니다 —
 * 요청 하나가 더 나가지 않습니다.
 *
 * 어느 모델을 쓰는지는 여기서 모릅니다 (../ai/index.js 가 고릅니다).
 *
 * 요약 때문에 후기 목록이 실패하는 일은 없어야 합니다. 요약 표가 없거나 모델이
 * 죽어도 목록은 summary: null 로 그대로 나갑니다.
 */
const conn = require('../mysql');
const { logError } = require('../logError');
const ai = require('../ai');
const {
    MIN_REVIEWS,
    MAX_REVIEWS_IN_PROMPT,
    SYSTEM_PROMPT,
    SUMMARY_SCHEMA,
    buildPrompt,
    parseSummary,
} = require('../ai/reviewSummaryPrompt');

const db = conn.promise();

/*
 * 시설별로 한 번에 하나만 돕니다. 도는 중에 또 요청이 오면 표시만 해 두고, 끝난 뒤
 * 한 번 더 돕니다. 후기 세 건이 연달아 와도 모델 호출은 두 번입니다.
 * 프로세스 안의 표시라 인스턴스를 여러 개 띄우면 각자 돕니다 — 결과가 같은 행에
 * 덮어써질 뿐 틀리지는 않습니다.
 */
const inFlight = new Map(); // facility_id -> { again: boolean }

/** json 컬럼은 mysql2 가 풀어서 주지만, 드라이버 설정에 따라 문자열로 올 수도 있습니다. */
const asList = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

const rebuild = async (facilityId) => {
    const [[{ total }]] = await db.query(
        'SELECT COUNT(*) AS total FROM reviews WHERE facility_id = ? AND deleted_at IS NULL',
        [facilityId]
    );

    // 5건 아래로 내려갔으면 요약도 치웁니다. 한두 사람의 글이 전체 인상이 되면 안 됩니다.
    if (total < MIN_REVIEWS) {
        await db.query('DELETE FROM review_summaries WHERE facility_id = ?', [facilityId]);
        return;
    }

    /*
     * 작성자(user_id)는 고르지 않습니다. 요약에 필요 없고, 외부로 보내는 개인정보를
     * 줄입니다. 최신 순으로 상한까지만 봅니다 — 상한의 이유는 reviewSummaryPrompt.js 에.
     */
    const [rows] = await db.query(
        `SELECT review_id, rating, review_content, created_at
           FROM reviews
          WHERE facility_id = ? AND deleted_at IS NULL
          ORDER BY created_at DESC, review_id DESC
          LIMIT ?`,
        [facilityId, MAX_REVIEWS_IN_PROMPT]
    );
    const [facility] = await db.query('SELECT bplcnm FROM medical_facilities WHERE id = ?', [facilityId]);

    const provider = ai.getProvider();
    const { text, model } = await provider.generateJson({
        system: SYSTEM_PROMPT,
        user: buildPrompt(rows, { facilityName: facility[0]?.bplcnm ?? '', total }),
        schema: SUMMARY_SCHEMA,
        maxOutputTokens: 1024,
    });

    // 읽을 수 없는 답이면 이전 요약을 그대로 둡니다. 깨진 글보다 낡은 글이 낫습니다.
    const parsed = parseSummary(text);
    if (!parsed) throw new Error('요약 응답을 형식대로 읽지 못했습니다.');

    const lastReviewId = Math.max(...rows.map((r) => r.review_id));
    await db.query(
        `INSERT INTO review_summaries
            (facility_id, summary, good, caution, review_count, last_review_id, provider, model, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW()) AS new
         ON DUPLICATE KEY UPDATE
            summary = new.summary, good = new.good, caution = new.caution,
            review_count = new.review_count, last_review_id = new.last_review_id,
            provider = new.provider, model = new.model, updated_at = NOW()`,
        [
            facilityId,
            parsed.summary,
            JSON.stringify(parsed.good),
            JSON.stringify(parsed.caution),
            total,
            lastReviewId,
            provider.name,
            String(model).slice(0, 80),
        ]
    );
};

/**
 * 그 시설의 요약을 뒤에서 다시 만듭니다. 바로 돌아옵니다.
 * 키가 없으면(요약 기능이 꺼져 있으면) 아무것도 하지 않습니다.
 */
const refreshSummary = (facilityId) => {
    const id = Number(facilityId);
    if (!Number.isInteger(id) || id <= 0) return;
    if (!ai.isEnabled()) return;

    const state = inFlight.get(id);
    if (state) {
        state.again = true;
        return;
    }
    inFlight.set(id, { again: false });

    rebuild(id)
        .catch((error) => logError('reviewSummary:rebuild', error))
        .finally(() => {
            const done = inFlight.get(id);
            inFlight.delete(id);
            if (done?.again) refreshSummary(id);
        });
};

/** 후기 번호만 아는 자리(수정·삭제)에서 부릅니다. 지운 글도 facility_id 는 남아 있습니다. */
const refreshForReview = (reviewId) => {
    if (!ai.isEnabled()) return;
    conn.query('SELECT facility_id FROM reviews WHERE review_id = ?', [reviewId], (error, rows) => {
        if (error) return logError('reviewSummary:lookup', error);
        if (rows[0]?.facility_id) refreshSummary(rows[0].facility_id);
    });
};

/**
 * 목록 응답에 실을 요약. 없으면 null 을 넘깁니다. 오류가 나도 null 입니다.
 *
 * @param {number} total 지금 살아 있는 후기 수. 저장된 review_count 와 다르면 낡은
 *   것이라 뒤에서 다시 만들고, 이번 응답에는 있는 것을 그대로 실습니다.
 * @param {(summary: object | null) => void} callback
 */
const getSummary = (facilityId, total, callback) => {
    if (total < MIN_REVIEWS) return callback(null);

    conn.query(
        'SELECT summary, good, caution, review_count, updated_at FROM review_summaries WHERE facility_id = ?',
        [facilityId],
        (error, rows) => {
            if (error) {
                // 표가 없어도(마이그레이션 전) 목록은 나가야 합니다.
                logError('reviewSummary:read', error);
                return callback(null);
            }
            const row = rows[0];
            if (!row || row.review_count !== total) refreshSummary(facilityId);
            if (!row) return callback(null);

            return callback({
                summary: row.summary,
                good: asList(row.good),
                caution: asList(row.caution),
                review_count: row.review_count,
                updated_at: row.updated_at,
            });
        }
    );
};

module.exports = { refreshSummary, refreshForReview, getSummary };
