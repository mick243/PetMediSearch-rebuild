import test from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import * as comment from './comment.js';
import * as review from './review.js';
import * as pets from './pets.js';
import commentsRepo from '../repositories/comments.js';
import reviewsRepo from '../repositories/reviews.js';
import petsRepo from '../repositories/pets.js';

/*
 * 다른 표를 가리키는 번호와 사진은 DB 에 닿기 전에 봅니다 (validate.ts 의 idField · isImageDataUrl).
 *
 * 예전에는 본문의 post_id · facility_id · category_id · photo 를 그대로 쿼리에 넣어서,
 * 숫자가 아닌 값은 DB 에 가서야 500 이 됐고 반려동물 사진은 아무 문자열이나 저장됐습니다.
 * 연결은 열지 않습니다 — 저장소 함수를 바꿔 끼워 무엇이 DB 로 가는지만 봅니다.
 */

const bearer = () => {
    process.env.JWT_SECRET ||= 'test-secret';
    return { authorization: `Bearer ${jwt.sign({ id: 7, role: 'user' }, process.env.JWT_SECRET)}` };
};

/** 컨트롤러가 답한 상태 코드와 본문. */
interface Reply {
    status: number;
    body: Record<string, unknown>;
}

/** 컨트롤러가 쓰는 만큼만 흉내 낸 res. json 은 아래에서 send 를 그대로 씁니다. */
interface FakeRes {
    statusCode: number;
    status(code: number): FakeRes;
    send(body: Record<string, unknown>): FakeRes;
    json?: FakeRes['send'];
}

/** 응답이 나갈 때 풀리는 Promise 로 감쌉니다. */
const call = (handler: (req: Request, res: Response) => unknown, req: Record<string, unknown>) =>
    new Promise<Reply>((resolve) => {
        const res: FakeRes = {
            statusCode: 200,
            status(code) {
                this.statusCode = code;
                return this;
            },
            send(body) {
                resolve({ status: this.statusCode, body });
                return this;
            },
        };
        res.json = res.send;
        handler({ headers: bearer(), params: {}, query: {}, ...req } as unknown as Request, res as unknown as Response);
    });

/** 저장소 함수를 바꿔 끼우고, 넘어온 인자를 모읍니다. DB 에는 닿지 않습니다. */
const stub = <T extends object, K extends keyof T>(t: TestContext, target: T, method: K, result: unknown) => {
    const calls: unknown[][] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t.mock.method(target as any, method as any, async (...args: unknown[]) => {
        calls.push(args);
        return result;
    });
    t.mock.method(console, 'error', () => {});
    return calls;
};

const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

test('댓글: 글 번호가 숫자가 아니면 DB 에 가지 않고 400', async (t) => {
    const calls = stub(t, commentsRepo, 'create', { commentId: 99 });

    for (const post_id of [['3'], { id: 3 }, 'abc', undefined]) {
        const { status } = await call(comment.addComment, { body: { post_id, content: '안녕하세요' } });
        assert.strictEqual(status, 400, JSON.stringify(post_id));
    }
    const { status } = await call(comment.addComment, {
        body: { post_id: 3, parent_comment_id: { id: 1 }, content: '안녕하세요' },
    });
    assert.strictEqual(status, 400);
    assert.strictEqual(calls.length, 0);
});

test('댓글: 숫자만 든 문자열은 숫자로 바꿔 넣고, 원댓글이 없으면 null', async (t) => {
    const calls = stub(t, commentsRepo, 'create', { commentId: 99 });

    const { status, body } = await call(comment.addComment, {
        body: { post_id: '3', parent_comment_id: null, content: '안녕하세요' },
    });

    assert.strictEqual(status, 200);
    assert.strictEqual(body.commentId, 99);
    // 인자 순서: user_id, post_id, parent_comment_id, content
    assert.deepStrictEqual(calls[0], [7, 3, null, '안녕하세요']);
});

test('댓글: 없는 글이나 원댓글이면 500 이 아니라 404', async (t) => {
    stub(t, commentsRepo, 'create', 'no-such-target');

    const { status } = await call(comment.addComment, {
        body: { post_id: 3, parent_comment_id: 5, content: '안녕하세요' },
    });
    assert.strictEqual(status, 404);
});

test('후기: 시설 번호가 숫자가 아니면 DB 에 가지 않고 400', async (t) => {
    const calls = stub(t, reviewsRepo, 'create', 'created');

    for (const facility_id of [[12], { id: 12 }, '12abc', undefined]) {
        const { status } = await call(review.createReview, {
            body: { facility_id, rating: 5, review_content: '친절했어요' },
        });
        assert.strictEqual(status, 400, JSON.stringify(facility_id));
    }
    assert.strictEqual(calls.length, 0);
});

test('후기: 없는 시설이면 404, 번호는 숫자로 들어간다', async (t) => {
    const calls = stub(t, reviewsRepo, 'create', 'no-such-facility');

    const { status } = await call(review.createReview, {
        body: { facility_id: '12', rating: 5, review_content: '친절했어요' },
    });

    assert.strictEqual(status, 404);
    // 인자 순서: user_id, facility_id, rating, content, images
    assert.strictEqual(calls[0][1], 12);
});

test('반려동물: 분류 번호나 사진이 이상하면 DB 에 가지 않고 400', async (t) => {
    const calls = stub(t, petsRepo, 'create', { petId: 99 });

    const cases = [
        { name: '콩이', category_id: ['2'] },
        { name: '콩이', category_id: 'abc' },
        { name: '콩이', photo: 'not-a-photo' },
        { name: '콩이', photo: 'data:image/svg+xml;base64,PHN2Zz4=' },
        { name: '콩이', photo: { src: JPEG } },
    ];
    for (const body of cases) {
        const { status } = await call(pets.addPet, { body });
        assert.strictEqual(status, 400, JSON.stringify(body));
    }
    assert.strictEqual(calls.length, 0);
});

test('반려동물: 화면이 보내는 모양(번호 · null · 줄인 JPEG)은 그대로 들어간다', async (t) => {
    const calls = stub(t, petsRepo, 'create', { petId: 99 });

    const withPhoto = await call(pets.addPet, { body: { name: '콩이', category_id: 2, photo: JPEG } });
    const bare = await call(pets.addPet, { body: { name: '콩이', category_id: null, photo: null } });

    assert.strictEqual(withPhoto.status, 200);
    assert.strictEqual(bare.status, 200);
    assert.deepStrictEqual(calls[0], [7, { name: '콩이', breed: null, birth_date: null, weight_kg: null, category_id: 2, photo: JPEG }]);
    assert.deepStrictEqual(calls[1], [7, { name: '콩이', breed: null, birth_date: null, weight_kg: null, category_id: null, photo: null }]);
});

test('반려동물: 없는 분류 번호면 500 이 아니라 400', async (t) => {
    stub(t, petsRepo, 'update', 'no-such-category');

    const { status, body } = await call(pets.updatePet, {
        params: { pet_id: '1' },
        body: { name: '콩이', category_id: 999 },
    });
    assert.strictEqual(status, 400);
    assert.strictEqual(body.message, '없는 분류입니다.');
});
