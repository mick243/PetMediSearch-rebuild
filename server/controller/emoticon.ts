import { logError } from '../logError.js';
import { verifyToken } from './authUser.js';
import { textField, pathId } from './validate.js';
import { sniffImageMime, parseImageDataUrl } from '../imageType.js';
import { cacheControlFor } from '../emoticonImage.js';
import emoticons from '../repositories/emoticons.js';
import users from '../repositories/users.js';
import type { Request, Response } from 'express';

/*
 * 이모티콘. DB 는 repositories/emoticons.ts 가 만지고 여기는 토큰 · 검사 · 응답 · 캐시 헤더만 다룹니다.
 */

/**
 * 이모티콘 한 개의 최대 크기(원본 바이트).
 *
 * 화면에서는 120px 로 그립니다. 그 크기의 PNG 스티커는 보통 30~60KB, 움직이는
 * GIF 라도 200KB 안쪽입니다. 512KB 면 넉넉하면서도, 댓글 한 쪽에 여러 개가
 * 붙었을 때 페이지가 무거워지지 않는 선입니다.
 *
 * data URL(base64)로 올라오므로 본문은 여기의 약 4/3 인 683KB 가 되고,
 * app.ts 의 본문 상한 3mb 안에 들어갑니다.
 */
const MAX_EMOTICON_BYTES = 512 * 1024;

/** 이름 상한. 표의 varchar(30) 과 같은 값이어야 합니다. */
const MAX_NAME_LENGTH = 30;

const NOT_FOUND = '이모티콘을 찾을 수 없습니다.';

/**
 * 관리자만 지나가는 문.
 *
 * 토큰에도 role 이 실려 있지만 하루짜리라, 권한을 거둔 뒤에도 남은 토큰으로 계속
 * 등록할 수 있으면 안 됩니다. 등록·삭제는 자주 있는 일이 아니라 조회 한 번이 더 붙어도 부담이 없습니다.
 */
const withAdmin = async (req: Request, res: Response, action: string, run: (adminId: number) => Promise<unknown>) => {
    const decoded = verifyToken(req.headers.authorization?.split(' ')[1]);
    if (!decoded) {
        return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }

    try {
        if ((await users.roleOf(decoded.id)) !== 'admin') {
            return res.status(403).json({ message: `관리자만 이모티콘을 ${action}할 수 있습니다.` });
        }
        return await run(decoded.id);
    } catch (error) {
        logError(`emoticon:${action}`, error);
        return res.status(500).json({ message: '서버 오류 발생' });
    }
};

/**
 * 피커에 뿌릴 목록. 그림은 GET /emoticons/:id/image?v=<지문> 으로 한 장씩 받아 갑니다.
 *
 * 지문을 함께 주는 이유는 번호가 고정이 아니기 때문입니다 — 하나를 지우면 뒤엣것이
 * 당겨 와서 같은 번호가 다른 그림을 뜻하게 됩니다. 주소에 지문이 실려 있어야
 * 브라우저가 둘을 다른 그림으로 봅니다.
 */
const listEmoticons = async (req: Request, res: Response) => {
    try {
        const rows = await emoticons.list();
        /*
         * 담아 두되 쓸 때마다 물어봅니다(no-cache).
         *
         * 처음에는 5분, 그다음 1분을 담아 뒀는데 둘 다 틀렸습니다. 이 목록은
         * 그림의 지문을 나르는데, 목록이 낡으면 낡은 지문으로 그림을 부르고
         * 그 주소는 1년짜리로 담기므로 **옛 그림이 자신 있게 나옵니다.**
         * 실제로 그렇게 지우고 새로 올린 자리에 옛 그림이 그대로 떴습니다.
         *
         * 바뀌지 않았으면 express 가 붙인 ETag 로 304 만 오가서 본문이 0바이트입니다.
         * 비싼 것(그림)은 영원히 담고, 싼 것(목록)은 매번 확인하는 쪽으로 나눕니다.
         */
        res.set('Cache-Control', 'no-cache');
        return res.json({ emoticons: rows });
    } catch (error) {
        logError('emoticon:list', error);
        return res.status(500).json({ message: '서버 오류 발생' });
    }
};

/**
 * 이모티콘 그림 한 장. data URL 이 아니라 이미지 그대로 내보냅니다 — 그래야 브라우저가
 * 보통 이미지처럼 캐시해서, 같은 스티커가 여러 댓글에 나와도 내려받기는 한 번뿐입니다.
 *
 * 주소 끝의 ?v= 는 그림의 지문입니다. 서버가 그것으로 무엇을 고르지는 않습니다 — 번호로만
 * 고릅니다. 오직 **얼마나 오래 담아 둘지**를 정하는 데만 씁니다(emoticonImage.ts).
 * 예전에는 같은 주소에 옛 사본이 남아, 지우고 새로 올린 그림 대신 그 번호에 있던 옛 그림이 나왔습니다.
 */
const getEmoticonImage = async (req: Request, res: Response) => {
    const id = pathId(req.params.emoticon_id);
    try {
        const row = id === null ? null : await emoticons.image(id);
        if (!row) return res.status(404).json({ message: NOT_FOUND });

        res.set('Cache-Control', cacheControlFor(req.query.v, row.content_hash));
        res.type(row.mime);
        return res.send(row.data);
    } catch (error) {
        logError('emoticon:image', error);
        return res.status(500).json({ message: '서버 오류 발생' });
    }
};

/** 이모티콘 등록. 관리자만. */
const createEmoticon = (req: Request, res: Response) =>
    withAdmin(req, res, '등록', async (adminId) => {
        const name = textField(req.body.name, { label: '이모티콘 이름', max: MAX_NAME_LENGTH });
        if (name.error !== undefined) return res.status(400).json({ message: name.error });

        const bytes = parseImageDataUrl(req.body.image);
        if (!bytes) {
            return res.status(400).json({ message: '이미지를 올려주세요.' });
        }

        if (bytes.length > MAX_EMOTICON_BYTES) {
            return res.status(400).json({
                message: `이모티콘은 ${MAX_EMOTICON_BYTES / 1024}KB 까지 올릴 수 있습니다.`,
            });
        }

        // 올린 사람이 말한 형식이 아니라 바이트 앞머리를 보고 정합니다.
        const mime = sniffImageMime(bytes);
        if (!mime) {
            return res.status(400).json({ message: 'JPG · PNG · GIF 만 올릴 수 있습니다.' });
        }

        const created = await emoticons.create(name.value ?? '', mime, bytes, adminId);
        return res.status(201).json({
            message: '이모티콘을 등록했습니다.',
            emoticon: { ...created, name: name.value ?? '' },
        });
    });

/** 이모티콘 삭제. 관리자만. 되돌릴 수 없어서 화면에서 한 번 물어봅니다. */
const deleteEmoticon = (req: Request, res: Response) =>
    withAdmin(req, res, '삭제', async () => {
        const id = pathId(req.params.emoticon_id);
        const removed = id !== null && (await emoticons.remove(id));
        if (!removed) return res.status(404).json({ message: NOT_FOUND });
        return res.json({ message: '이모티콘을 삭제했습니다.' });
    });

export { listEmoticons, getEmoticonImage, createEmoticon, deleteEmoticon, MAX_EMOTICON_BYTES };
