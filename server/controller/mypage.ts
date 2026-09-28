import { logError } from '../logError.js';
import { verifyToken } from './authUser.js';
import * as mypage from '../repositories/mypage.js';
import type { Request, Response } from 'express';

/*
 * 마이페이지. DB 는 repositories/mypage.ts 가 만지고 여기는 토큰과 응답만 다룹니다.
 * 세 칸 모두 "없는 것은 오류가 아닙니다" — 빈 목록을 그대로 보냅니다.
 */

function requireUser(req: Request, res: Response) {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) {
        res.status(401).send({ message: '유효하지 않은 토큰입니다.' });
        return null;
    }
    return decoded.id;
}

/** 세 핸들러의 모양이 같아 하나로 만듭니다. 저장소 함수만 다릅니다. */
const recentOf = (load: (userId: number) => Promise<unknown[]>) => async (req: Request, res: Response) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    try {
        return res.send(await load(user_id));
    } catch (error) {
        logError('mypage', error);
        return res.status(500).send({ message: '서버 에러 발생' });
    }
};

// 유저 id 에 따른 게시글 조회
const getPostsByUserId = recentOf(mypage.recentPosts);

// 유저 id 에 따른 후기글 조회
const getReviewsByUserId = recentOf(mypage.recentReviews);

// 유저 id 에 따른 댓글 조회
const getCommentsByUserId = recentOf(mypage.recentComments);

export { getPostsByUserId, getReviewsByUserId, getCommentsByUserId };
