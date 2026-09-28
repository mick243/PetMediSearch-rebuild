import { logError } from '../logError.js';
import { pageWindow } from './validate.js';
import * as posts from '../repositories/posts.js';
import type { Request, Response } from 'express';

/** 한 번에 보낼 글 수. 화면 기본값과 맞춰 둡니다. */
const DEFAULT_PAGE_SIZE = 10;
/** 화면이 크게 달라고 해도 여기까지만. 본문이 붙어 있어 무한정 늘릴 수 없습니다. */
const MAX_PAGE_SIZE = 50;

/**
 * '통합' 카테고리. 이 id 로 조회하면 분류를 걸지 않고 전체 글을 내려줍니다.
 * prisma/migrations/0_init 이 번호를 명시해 넣는 기준 데이터라 1 로 고정입니다.
 */
const ALL_CATEGORY_ID = 1;

/**
 * ?category 가 없으면 분류 목록, 있으면 그 분류의 글 목록입니다.
 *
 * 페이지 단위로 끊어 보냅니다. 예전에는 조건에 맞는 글을 본문째 전부 내려주고 화면에서 잘라 썼습니다.
 * 글이 2만 건 쌓이자 통합 목록 한 번에 30MB 가 나갔고, 홈 화면은 그중 3건만 씁니다. 목록이
 * 본문에서 미리보기와 대표 이미지를 뽑아 쓰므로 본문은 남기고, 건수를 줄입니다.
 */
const getListByCategory = async (req: Request, res: Response) => {
    const categoryId = req.query.category;
    try {
        if (!categoryId) {
            return res.send(await posts.listCategories());
        }

        const category_id = parseInt(String(categoryId), 10);
        if (isNaN(category_id)) {
            return res.status(400).send({ message: '유효한 카테고리 ID가 필요합니다.' });
        }

        // 통합은 전체 글입니다. 예전에는 '통합으로 지정된 글' 만 골라 늘 비어 있었습니다.
        const { take, skip } = pageWindow(req.query, { defaultSize: DEFAULT_PAGE_SIZE, maxSize: MAX_PAGE_SIZE });
        return res.send(await posts.listPosts(category_id === ALL_CATEGORY_ID ? null : category_id, take, skip));
    } catch (error) {
        logError('category', error);
        return res.status(500).send({ message: '서버 오류 발생' });
    }
};

export { getListByCategory, ALL_CATEGORY_ID };
