const conn = require('../mysql');
const { logError } = require('../logError');
const { verifyToken } = require('./authUser');
const { textField } = require('./validate');
const { sniffImageMime, parseImageDataUrl } = require('../imageType');

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
        'SELECT emoticon_id, name FROM emoticons WHERE deleted_at IS NULL ORDER BY emoticon_id',
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
        'SELECT mime, data FROM emoticons WHERE emoticon_id = ? AND deleted_at IS NULL',
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
             * 하루만 담아 둡니다.
             *
             * 한 번 올린 그림은 바뀌지 않으니 immutable 로 1년을 걸어도 맞는 것
             * 같지만, 그러면 관리자가 지운 이모티콘이 이미 받아 간 브라우저에는
             * 1년 동안 그대로 남습니다. 잘못 올린 것을 내리는 일이 이 기능에서
             * 유일하게 급한 일이라, 하루 안에는 사라지게 둡니다.
             *
             * 하루가 지나도 express 가 붙인 ETag 로 304 만 오가서(본문 0바이트)
             * 다시 받아 오지 않습니다.
             */
            res.set('Cache-Control', 'public, max-age=86400');
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
 * 이모티콘 삭제. 관리자만.
 *
 * 행은 남기고 deleted_at 만 채웁니다. 이미 그 이모티콘을 쓴 댓글이 있는데 행을
 * 지워 버리면, 옛 댓글이 가리키는 id 가 영영 비어 버립니다.
 */
const deleteEmoticon = (req, res) =>
    withAdmin(req, res, '삭제', () => {
        const id = parseId(req.params.emoticon_id);
        if (!id) return res.status(404).json({ message: '이모티콘을 찾을 수 없습니다.' });

        return conn.query(
            'UPDATE emoticons SET deleted_at = ? WHERE emoticon_id = ? AND deleted_at IS NULL',
            [new Date(), id],
            (err, result) => {
                if (err) {
                    logError('emoticon:delete', err);
                    return res.status(500).json({ message: '서버 오류 발생' });
                }
                if (result.affectedRows === 0) {
                    return res.status(404).json({ message: '이모티콘을 찾을 수 없습니다.' });
                }
                return res.json({ message: '이모티콘을 삭제했습니다.' });
            }
        );
    });

module.exports = {
    listEmoticons,
    getEmoticonImage,
    createEmoticon,
    deleteEmoticon,
    MAX_EMOTICON_BYTES,
};
