const conn = require('../mysql');
const { logError } = require('../logError');
const { verifyToken } = require('./authUser');
const { textField } = require('./validate');
const { sniffImageMime, parseImageDataUrl } = require('../imageType');
const { renumberReplacements } = require('../emoticonToken');
const { cacheControlFor } = require('../emoticonImage');

/**
 * 이모티콘 한 개의 최대 크기(원본 바이트).
 *
 * 화면에서는 120px 로 그립니다. 그 크기의 PNG 스티커는 보통 30~60KB, 움직이는
 * GIF 라도 200KB 안쪽입니다. 512KB 면 넉넉하면서도, 댓글 한 쪽에 여러 개가
 * 붙었을 때 페이지가 무거워지지 않는 선입니다.
 *
 * data URL(base64)로 올라오므로 본문은 여기의 약 4/3 인 683KB 가 되고,
 * app.js 의 본문 상한 3mb 안에 들어갑니다.
 */
const MAX_EMOTICON_BYTES = 512 * 1024;

/** 이름 상한. 표의 varchar(30) 과 같은 값이어야 합니다. */
const MAX_NAME_LENGTH = 30;

/**
 * 관리자만 지나가는 문.
 *
 * 토큰에도 role 이 실려 있지만 하루짜리라, 권한을 거둔 뒤에도 남은 토큰으로 계속
 * 등록할 수 있으면 안 됩니다. authUser.js 의 IS_ADMIN 과 같은 판단입니다.
 * 등록·삭제는 자주 있는 일이 아니라 조회 한 번이 더 붙어도 부담이 없습니다.
 */
const withAdmin = (req, res, action, run) => {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }

    return conn.query(
        'SELECT role FROM users WHERE user_id = ? AND deleted_at IS NULL',
        [decoded.id],
        (err, rows) => {
            if (err) {
                logError('emoticon:admin', err);
                return res.status(500).json({ message: '서버 오류 발생' });
            }
            if (rows.length === 0 || rows[0].role !== 'admin') {
                return res.status(403).json({ message: `관리자만 이모티콘을 ${action}할 수 있습니다.` });
            }
            return run(decoded.id);
        }
    );
};

/** 경로로 들어온 id. 숫자가 아니면 그런 이모티콘이 없는 것과 같습니다. */
const parseId = (raw) => {
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
};

/**
 * 피커에 뿌릴 목록.
 *
 * 그림은 싣지 않고 id·이름과 그림의 지문(v)만 보냅니다. 스티커 30개를 목록에
 * 실으면 그것만으로 1MB 가 넘고, 정작 화면은 피커를 열기 전까지 한 장도 그리지
 * 않습니다. 그림은 GET /emoticons/:id/image?v=<지문> 으로 한 장씩 받아 갑니다.
 *
 * 지문을 함께 주는 이유는 번호가 고정이 아니기 때문입니다 — 하나를 지우면 뒤엣것이
 * 당겨 와서 같은 번호가 다른 그림을 뜻하게 됩니다. 주소에 지문이 실려 있어야
 * 브라우저가 둘을 다른 그림으로 봅니다.
 */
const listEmoticons = (req, res) => {
    conn.query(
        'SELECT emoticon_id, name, content_hash AS v FROM emoticons ORDER BY emoticon_id',
        (err, rows) => {
            if (err) {
                logError('emoticon:list', err);
                return res.status(500).json({ message: '서버 오류 발생' });
            }

            /*
             * 담아 두되 쓸 때마다 물어봅니다(no-cache).
             *
             * 처음에는 5분, 그다음 1분을 담아 뒀는데 둘 다 틀렸습니다. 이 목록은
             * 그림의 지문을 나르는데, 목록이 낡으면 낡은 지문으로 그림을 부르고
             * 그 주소는 1년짜리로 담기므로 **옛 그림이 자신 있게 나옵니다.**
             * 실제로 그렇게 지우고 새로 올린 자리에 옛 그림이 그대로 떴습니다.
             *
             * 그래서 목록만큼은 늘 확인합니다. 바뀌지 않았으면 express 가 붙인
             * ETag 로 304 만 오가서 본문이 0바이트입니다 — 그림(수십 KB)이 아니라
             * 이름표 몇 줄이라 매번 물어도 쌉니다.
             * 비싼 것(그림)은 영원히 담고, 싼 것(목록)은 매번 확인하는 쪽으로 나눕니다.
             */
            res.set('Cache-Control', 'no-cache');
            return res.json({ emoticons: rows });
        }
    );
};

/**
 * 이모티콘 그림 한 장.
 *
 * data URL 이 아니라 이미지 그대로 내보냅니다. 그래야 브라우저가 보통 이미지처럼
 * 캐시해서, 같은 스티커가 여러 댓글에 나와도 내려받기는 한 번뿐입니다.
 *
 * 주소 끝의 ?v= 는 그림의 지문입니다. 서버가 그것으로 무엇을 고르지는 않습니다 —
 * 번호로만 고릅니다. 오직 **얼마나 오래 담아 둘지**를 정하는 데만 씁니다.
 * 지문이 맞으면 이 주소는 영원히 같은 그림을 뜻하므로 1년을 줍니다.
 * 지문이 없거나 어긋나면 그림은 지금 것을 제대로 주되 담아 두지는 못하게 합니다.
 *
 * 이렇게 하면 번호가 당겨져도 틀린 그림이 보이는 순간이 없습니다. 예전에는
 * 같은 주소에 옛 사본이 남아, 지우고 새로 올린 그림 대신 그 번호에 있던
 * 옛 그림이 나왔습니다 (1,524바이트 PNG 자리에 4,715바이트 GIF).
 */
const getEmoticonImage = (req, res) => {
    const id = parseId(req.params.emoticon_id);
    if (!id) return res.status(404).json({ message: '이모티콘을 찾을 수 없습니다.' });

    conn.query(
        'SELECT mime, data, content_hash FROM emoticons WHERE emoticon_id = ?',
        [id],
        (err, rows) => {
            if (err) {
                logError('emoticon:image', err);
                return res.status(500).json({ message: '서버 오류 발생' });
            }
            if (rows.length === 0) {
                return res.status(404).json({ message: '이모티콘을 찾을 수 없습니다.' });
            }

            res.set('Cache-Control', cacheControlFor(req.query.v, rows[0].content_hash));
            res.type(rows[0].mime);
            return res.send(rows[0].data);
        }
    );
};

/** 이모티콘 등록. 관리자만. */
const createEmoticon = (req, res) =>
    withAdmin(req, res, '등록', (adminId) => {
        const { error, value: name } = textField(req.body.name, {
            label: '이모티콘 이름',
            max: MAX_NAME_LENGTH,
        });
        if (error) return res.status(400).json({ message: error });

        const bytes = parseImageDataUrl(req.body.image);
        if (!bytes) {
            return res.status(400).json({ message: '이미지를 올려주세요.' });
        }

        if (bytes.length > MAX_EMOTICON_BYTES) {
            return res.status(400).json({
                message: `이모티콘은 ${MAX_EMOTICON_BYTES / 1024}KB 까지 올릴 수 있습니다.`,
            });
        }

        const mime = sniffImageMime(bytes);
        if (!mime) {
            return res.status(400).json({ message: 'JPG · PNG · GIF 만 올릴 수 있습니다.' });
        }

        return conn.query(
            'INSERT INTO emoticons (name, mime, data, created_by) VALUES (?, ?, ?, ?)',
            [name, mime, bytes, adminId],
            (err, result) => {
                if (err) {
                    logError('emoticon:create', err);
                    return res.status(500).json({ message: '서버 오류 발생' });
                }

                /*
                 * 지문은 DB 가 data 에서 만들어 내는 값이라(생성 컬럼) 다시 읽어 옵니다.
                 * 여기서 직접 계산해 넣으면 두 곳이 어긋날 수 있고, 어긋나면 방금 올린
                 * 관리자 화면만 그림을 못 담아 두게 됩니다. 기본키 한 행 조회입니다.
                 */
                return conn.query(
                    'SELECT content_hash AS v FROM emoticons WHERE emoticon_id = ?',
                    [result.insertId],
                    (readErr, rows) => {
                        if (readErr) {
                            logError('emoticon:create', readErr);
                            return res.status(500).json({ message: '서버 오류 발생' });
                        }
                        return res.status(201).json({
                            message: '이모티콘을 등록했습니다.',
                            emoticon: {
                                emoticon_id: result.insertId,
                                name,
                                v: rows[0] ? rows[0].v : '',
                            },
                        });
                    }
                );
            }
        );
    });

/**
 * 지운 뒤 댓글에 남은 표시를 옮겨 적는 SQL.
 *
 * 먼저 할 것을 안쪽에 둡니다 — REPLACE 는 안에서 바깥으로 풀리므로, 규칙의 순서가
 * 곧 중첩 순서입니다 (규칙과 순서의 이유는 emoticonToken.js 에 적어 두었습니다).
 * 자리표시자로 넘겨서 번호가 SQL 문장에 직접 박히지 않게 합니다.
 */
const rewriteCommentsSql = (removedId, shiftedIds) => {
    const values = [];
    let expr = 'content';

    renumberReplacements(removedId, shiftedIds).forEach(([from, to]) => {
        expr = `REPLACE(${expr}, ?, ?)`;
        values.push(from, to);
    });

    return {
        sql: `UPDATE comments SET content = ${expr} WHERE content LIKE '%[emoticon:%'`,
        values,
    };
};

/**
 * 이모티콘 삭제. 관리자만.
 *
 * 지운 자리를 비워 두지 않고 뒤엣것을 한 칸씩 당깁니다(1,2,3,4 에서 2를 지우면
 * 1,2,3). 그래서 다른 표와 달리 deleted_at 을 쓰지 않고 진짜로 지웁니다 — 지운
 * 행을 남겨 두면 그 행이 id 를 계속 차지해 당길 수가 없습니다.
 *
 * 당기면 이미 올라간 댓글의 [emoticon:N] 이 전부 어긋나므로, 같은 트랜잭션에서
 * 댓글의 표시도 함께 옮겨 적습니다. 이것을 하지 않으면 스티커가 전부 한 칸씩
 * 밀려서 다른 그림으로 보입니다.
 *
 * 관리자가 어쩌다 한 번 하는 일이라 댓글 표를 한 번 훑는 비용은 받아들입니다.
 * 되돌릴 수 없어서 화면에서 한 번 물어봅니다.
 */
const deleteEmoticon = (req, res) =>
    withAdmin(req, res, '삭제', () => {
        const id = parseId(req.params.emoticon_id);
        if (!id) return res.status(404).json({ message: '이모티콘을 찾을 수 없습니다.' });

        return conn.getConnection((poolErr, db) => {
            if (poolErr) {
                logError('emoticon:delete', poolErr);
                return res.status(500).json({ message: '서버 오류 발생' });
            }

            const run = (sql, values) =>
                new Promise((resolve, reject) => {
                    db.query(sql, values, (err, result) => (err ? reject(err) : resolve(result)));
                });

            const fail = (err) =>
                run('ROLLBACK').catch(() => {}).then(() => {
                    db.release();
                    logError('emoticon:delete', err);
                    return res.status(500).json({ message: '서버 오류 발생' });
                });

            return run('START TRANSACTION')
                .then(async () => {
                    /*
                     * 번호를 새로 매기는 동안 다른 요청이 끼어들면 안 됩니다.
                     * 표가 수십 행이라 통째로 잠가도 부담이 없습니다.
                     */
                    const rows = await run('SELECT emoticon_id FROM emoticons ORDER BY emoticon_id FOR UPDATE');
                    const ids = rows.map((row) => row.emoticon_id);

                    if (!ids.includes(id)) {
                        await run('ROLLBACK');
                        db.release();
                        return res.status(404).json({ message: '이모티콘을 찾을 수 없습니다.' });
                    }

                    const shifted = ids.filter((each) => each > id);

                    const rewrite = rewriteCommentsSql(id, shifted);
                    await run(rewrite.sql, rewrite.values);

                    await run('DELETE FROM emoticons WHERE emoticon_id = ?', [id]);

                    /*
                     * 작은 번호부터 당겨야 합니다. 3을 2로 옮긴 다음에야 4가 3으로
                     * 갈 자리가 생깁니다. 순서가 없으면 중간에 기본키가 겹칩니다.
                     */
                    if (shifted.length > 0) {
                        await run(
                            'UPDATE emoticons SET emoticon_id = emoticon_id - 1 WHERE emoticon_id > ? ORDER BY emoticon_id',
                            [id]
                        );
                    }

                    await run('COMMIT');

                    /*
                     * 다음에 올릴 것이 빈 번호를 이어받게 합니다. 이걸 빼먹으면
                     * 1,2,3 에서 하나 지워 1,2 가 된 다음 새로 올린 것이 4가 되어
                     * 방금 메운 자리가 도로 벌어집니다.
                     * ALTER 는 스스로 커밋하므로 트랜잭션 밖에서 합니다.
                     */
                    await run(`ALTER TABLE emoticons AUTO_INCREMENT = ${ids.length}`);

                    db.release();
                    return res.json({ message: '이모티콘을 삭제했습니다.' });
                })
                .catch(fail);
        });
    });

module.exports = {
    listEmoticons,
    getEmoticonImage,
    createEmoticon,
    deleteEmoticon,
    MAX_EMOTICON_BYTES,
};
