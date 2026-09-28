import { logError } from '../logError.js';
import { requireUser } from './authUser.js';
import { textField, intField, pathId, richTextHasContent } from './validate.js';
import type { Checked } from './validate.js';
import { findRemoteResource } from '../postImages.js';
import posts from '../repositories/posts.js';
import type { Request, Response } from 'express';

/*
 * 글. DB 는 repositories/posts.ts 가 만지고 여기는 토큰 · 검사 · 응답만 다룹니다.
 */

/** posts.title 이 varchar(255) 라 그보다 낮게 둡니다. */
const MAX_TITLE_LENGTH = 200;

/**
 * 본문 상한. posts.content 는 mediumtext(16MB)지만 요청 본문 상한이 3mb 라
 * 실제로는 그쪽에 먼저 걸립니다. 여기 값은 그 아래를 지키는 최후의 선입니다.
 */
const MAX_CONTENT_LENGTH = 1_000_000;

/**
 * 제목과 본문을 검사해 다듬은 값을 돌려줍니다.
 *
 * 본문은 trim 만으로는 빈 글이 걸러지지 않습니다. 에디터(ReactQuill)가 아무것도
 * 안 쓴 상태를 `<p><br></p>` 로 보내서, 제목만 있는 글이 그대로 등록됐습니다.
 */
const validatePost = (body: Record<string, unknown>): Checked<{ title: string; content: string }> => {
    const title = textField(body.title, { label: '제목', max: MAX_TITLE_LENGTH });
    if (title.error !== undefined) return { error: title.error };

    const content = textField(body.content, { label: '내용', max: MAX_CONTENT_LENGTH });
    if (content.error !== undefined) return { error: content.error };
    // 둘 다 required 라 null 은 오지 않습니다. 타입만 맞춥니다.
    const title_ = title.value ?? '';
    const content_ = content.value ?? '';
    if (!richTextHasContent(content_)) {
        return { error: '내용을 입력해주세요.' };
    }

    /*
     * 본문이 바깥 주소를 받아오게 두지 않습니다 (../postImages.ts 에 이유를 적었습니다).
     * 후기 사진에 이미 같은 잣대가 있는데(controller/validate.ts 의 IMAGE_DATA_URL)
     * 글 본문에만 없어서, 남의 서버 이미지가 그대로 저장되고 있었습니다.
     */
    const remote = findRemoteResource(content_);
    if (remote) {
        return { error: '본문에는 직접 올린 사진만 넣을 수 있습니다.' };
    }

    return { value: { title: title_, content: content_ } };
};

const NOT_FOUND = '해당 게시글을 찾을 수 없습니다.';

// 게시글 ID로 게시글 조회
const getPostById = async (req: Request, res: Response) => {
    const post_id = pathId(req.params.post_id);
    try {
        const post = post_id === null ? null : await posts.getPost(post_id);
        if (!post) return res.status(404).send({ message: NOT_FOUND });
        return res.send(post);
    } catch (error) {
        logError('post', error);
        return res.status(500).send({ message: '서버 에러 발생' });
    }
};

// 새로운 게시글 추가
const addPostById = async (req: Request, res: Response) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    /*
     * 분류는 반드시 받습니다.
     *
     * 예전에는 category_id 를 그대로 흘려보내서, 안 보내면 NULL 로 저장됐습니다.
     * 목록은 전부 분류로 거르기 때문에(category.ts) 그렇게 들어간 글은 어느
     * 목록에도 안 잡힙니다 — 쓴 사람만 마이페이지에서 볼 수 있는 유령 글이 됩니다.
     */
    const category = intField(req.body.category_id, { label: '분류', min: 1, max: 100000 });
    if (category.error !== undefined || category.value === null) return res.status(400).send({ message: category.error ?? '분류를 입력해주세요.' });

    const checked = validatePost(req.body);
    if (checked.error !== undefined) return res.status(400).send({ message: checked.error });
    const { value } = checked;

    try {
        const result = await posts.createPost(user_id, category.value, value.title, value.content);
        // 탈퇴한 계정의 남은 토큰입니다.
        if (result === 'no-account') return res.status(401).send({ message: '사용할 수 없는 계정입니다.' });
        // 없는 분류 번호. 보낸 쪽이 틀린 것이라 400 입니다. 예전에는 500 "서버 에러 발생" 이었습니다.
        if (result === 'no-such-category') return res.status(400).send({ message: '없는 분류입니다.' });
        return res.send({ message: '새로운 게시글이 등록되었습니다.', postId: result.postId });
    } catch (error) {
        logError('post', error);
        return res.status(500).send({ message: '서버 에러 발생' });
    }
};

// 게시글 수정
const updatePostById = async (req: Request, res: Response) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const checked = validatePost(req.body);
    if (checked.error !== undefined) return res.status(400).send({ message: checked.error });
    const { value } = checked;

    const post_id = pathId(req.params.post_id);
    try {
        const updated = post_id !== null && (await posts.updatePost(post_id, user_id, value.title, value.content));
        if (!updated) return res.status(404).send({ message: '작성자만 게시글을 수정할 수 있습니다.' });
        return res.send({ message: '게시글이 수정되었습니다.' });
    } catch (error) {
        logError('post', error);
        return res.status(500).send({ message: '서버 에러 발생' });
    }
};

// 게시글 삭제
const deletePostById = async (req: Request, res: Response) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const post_id = pathId(req.params.post_id);
    try {
        // 실제로 지우지 않고 지운 시각만 남깁니다. 잘못 지웠으면 deleted_at 을 NULL 로 되돌리면 됩니다.
        const deleted = post_id !== null && (await posts.deletePost(post_id, user_id));
        if (!deleted) return res.status(404).send({ message: '작성자 또는 관리자만 게시글을 삭제할 수 있습니다.' });
        return res.send({ message: '게시글이 삭제되었습니다.' });
    } catch (error) {
        logError('post', error);
        return res.status(500).send({ message: '서버 에러 발생' });
    }
};

export { getPostById, addPostById, updatePostById, deletePostById };
