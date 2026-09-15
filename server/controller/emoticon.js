const conn = require('../mysql');
const { logError } = require('../logError');
const { verifyToken } = require('./authUser');
const { textField } = require('./validate');
const { sniffImageMime, parseImageDataUrl } = require('../imageType');
const { renumberReplacements } = require('../emoticonToken');

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
 * 그림은 싣지 않고 id 와 이름만 보냅니다. 스티커 30개를 목록에 실으면 그것만으로
 * 1MB 가 넘고, 정작 화면은 피커를 열기 전까지 한 장도 그리지 않습니다.
 * 그림은 GET /emoticons/:id/image 로 필요할 때 한 장씩 받아 갑니다.
 */
const listEmoticons = (req, res) => {
    conn.query(
        'SELECT emoticon_id, name FROM emoticons ORDER BY emoticon_id',
        (err, rows) => {
            if (err) {
                logError('emoticon:list', err);
                return res.status(500).json({ message: '서버 오류 발생' });
            }

            /*
             * 글을 열 때마다 부르지만 내용은 거의 바뀌지 않아 잠깐 담아 둡니다.
             * 로그인 상태에서도 재사용되도록 public 입니다.
             *
             * 1분입니다. 처음에 5분으로 뒀다가 줄였습니다 — 이 목록이 늦는 것을
             * 느끼는 사람은 방금 이모티콘을 올린 관리자뿐인데, 올리고 글로 가서
             * 판을 열었을 때 없으면 등록이 안 된 줄 압니다. 응답이 수백 바이트라
             * 자주 물어도 부담이 없습니다.
             */
            res.set('Cache-Control', 'public, max-age=60');
            return res.json({ emoticons: rows });
        }
    );
};

/**
 * 이모티콘 그림 한 장.
 *
 * data URL 이 아니라 이미지 그대로 내보냅니다. 그래야 브라우저가 보통 이미지처럼
 * 캐시해서, 같은 스티커가 여러 댓글에 나와도 내려받기는 한 번뿐입니다.
 */
const getEmoticonImage = (req, res) => {
    const id = parseId(req.params.emoticon_id);
    if (!id) return res.status(404).json({ message: '이모티콘을 찾을 수 없습니다.' });

    conn.query(
        'SELECT mime, data FROM emoticons WHERE emoticon_id = ?',
        [id],
        (err, rows) => {
            if (err) {
                logError('emoticon:image', err);
                return res.status(500).json({ message: '서버 오류 발생' });
            }
            if (rows.length === 0) {
                return res.status(404).json({ message: '이모티콘을 찾을 수 없습니다.' });
            }

            /*
             * 1분만 담아 둡니다.
             *
             * 주소에 id 가 들어가는데 그 id 가 고정이 아닙니다 — 하나를 지우면
             * 뒤엣것이 한 칸씩 당겨 오므로, 같은 주소가 어제와 다른 그림을 뜻하게
             * 됩니다. 오래 담아 두면 그동안 엉뚱한 스티커가 보입니다.
             * 1분이면 잘못 보일 수 있는 시간이 1분으로 묶입니다.
             *
             * 1분이 지나도 express 가 붙인 ETag 로 304 만 오가서(본문 0바이트)
             * 바뀌지 않았으면 다시 받아 오지 않습니다.
             */
            res.set('Cache-Control', 'public, max-age=60');
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
                return res.status(201).json({
                    message: '이모티콘을 등록했습니다.',
                    emoticon: { emoticon_id: result.insertId, name },
                });
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
