import { logError } from '../logError.js';
import { requireUser } from './authUser.js';
import { textField, idField, pathId, pageWindow } from './validate.js';
import comments from '../repositories/comments.js';
import type { Request, Response } from 'express';

/*
 * 댓글. DB 는 repositories/comments.ts 가 만지고 여기는 토큰 · 검사 · 응답만 다룹니다.
 */

/**
 * 댓글 길이 상한.
 *
 * comments.content 는 text(65,535바이트)입니다. 한글은 한 자에 3바이트라
 * 1,000자면 3KB 로 한참 여유가 있습니다. 댓글은 평문이라 칸을 넓히는 대신
 * 입력을 제한하는 쪽이 맞습니다 — 목록에 그대로 실려 나가기 때문입니다.
 */
const MAX_CONTENT_LENGTH = 1000;

/** 한 쪽에 보여 줄 스레드(원댓글) 수. 화면 기본값과 맞춰 둡니다. */
const DEFAULT_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 30;

// 특정 게시글의 댓글. 스레드 단위로 쪽을 나눕니다.
const getCommentsByPostId = async (req: Request, res: Response) => {
    const post_id = pathId(req.params.post_id);
    const { take, skip } = pageWindow(req.query, { defaultSize: DEFAULT_PAGE_SIZE, maxSize: MAX_PAGE_SIZE });
    try {
        // 번호가 아니면 어느 글도 아닙니다(빈 쪽). mysql2 때 'abc' → 0 이 낸 답과 같습니다.
        if (post_id === null) return res.send({ comments: [], total: 0, count: 0 });
        return res.send(await comments.pageOfPost(post_id, take, skip));
    } catch (error) {
        logError('comment', error);
        return res.status(500).send({ message: '서버 오류 발생' });
    }
};

// 댓글 작성
const addComment = async (req: Request, res: Response) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const post = idField(req.body.post_id, { label: '글' });
    if (post.error !== undefined || post.value === null) return res.status(400).send({ message: post.error ?? '어느 글인지 알 수 없습니다.' });

    // 원댓글이 없으면 새 스레드입니다. 화면은 그때 null 을 보냅니다.
    const parent = idField(req.body.parent_comment_id, { label: '원댓글', required: false });
    if (parent.error !== undefined) return res.status(400).send({ message: parent.error });

    const content = textField(req.body.content, { label: '댓글', max: MAX_CONTENT_LENGTH });
    if (content.error !== undefined) return res.status(400).send({ message: content.error });

    try {
        const result = await comments.create(user_id, post.value, parent.value ?? null, content.value ?? '');
        if (result === 'no-account') return res.status(401).send({ message: '사용할 수 없는 계정입니다.' });
        /*
         * 형식은 맞지만 없는 글이나 원댓글 번호(외래 키). 보낸 쪽이 가리킨 것이 없으니 404 입니다.
         * 예전에는 이것도 500 "서버 에러 발생" 이라 무엇이 잘못됐는지 알 수 없었습니다.
         */
        if (result === 'no-such-target') return res.status(404).send({ message: '댓글을 달 글이나 원댓글을 찾을 수 없습니다.' });
        return res.send({ message: '새로운 댓글이 등록되었습니다.', commentId: result.commentId });
    } catch (error) {
        logError('comment', error);
        return res.status(500).send({ message: '서버 에러 발생' });
    }
};

// 댓글 수정
const updateCommentById = async (req: Request, res: Response) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const content = textField(req.body.content, { label: '댓글', max: MAX_CONTENT_LENGTH });
    if (content.error !== undefined) return res.status(400).send({ message: content.error });

    const comment_id = pathId(req.params.comment_id);
    try {
        const updated = comment_id !== null && (await comments.update(comment_id, user_id, content.value ?? ''));
        if (!updated) return res.status(404).send({ message: '작성자만 댓글을 수정할 수 있습니다.' });
        return res.send({ message: '댓글이 수정되었습니다.' });
    } catch (error) {
        logError('comment', error);
        return res.status(500).send({ message: '서버 에러 발생' });
    }
};

// 댓글 삭제
const deleteCommentById = async (req: Request, res: Response) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const comment_id = pathId(req.params.comment_id);
    try {
        const result = comment_id === null ? 'forbidden' : await comments.remove(comment_id, user_id);
        if (result === 'forbidden') return res.status(404).send({ message: '작성자 또는 관리자만 댓글을 삭제할 수 있습니다.' });
        return res.send({ message: '댓글이 삭제되었습니다.', deletedCount: result.deletedCount });
    } catch (error) {
        logError('comment', error);
        return res.status(500).send({ message: '서버 에러 발생' });
    }
};

export { getCommentsByPostId, addComment, updateCommentById, deleteCommentById };
