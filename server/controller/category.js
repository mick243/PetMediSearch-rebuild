const conn = require('../mysql');

/** 한 번에 보낼 글 수. 화면 기본값과 맞춰 둡니다. */
const DEFAULT_PAGE_SIZE = 10;
/** 화면이 크게 달라고 해도 여기까지만. 본문이 붙어 있어 무한정 늘릴 수 없습니다. */
const MAX_PAGE_SIZE = 50;

/**
 * '통합' 카테고리. 이 id 로 조회하면 분류를 걸지 않고 전체 글을 내려줍니다.
 * createTables.sql 시드에서 첫 번째로 들어가는 카테고리라 1 로 고정입니다.
 */
const ALL_CATEGORY_ID = 1;
const getCategories = (req, res) => {

}

const getListByCategory = (req, res) => {
    const categoryId = req.query.category;
    if (!categoryId) {
        const query = `
        SELECT * FROM categories
    `;

        conn.query(query, (error, results) => {
            if (error) {
                return res.status(500).send({ message: '서버 오류 발생' });
            }
            return res.send(results);
        });
    }

    else {
        if (!categoryId) {
            return res.status(400).send({ message: '카테고리 ID가 필요합니다.' });
        }

        const { page, limit } = req.query;
        const category_id = parseInt(categoryId, 10);
        if (isNaN(category_id)) {
            return res.status(400).send({ message: '유효한 카테고리 ID가 필요합니다.' });
        }

        /*
         * 통합은 전체 글입니다. 예전에는 '통합으로 지정된 글'만 골라 늘 비어 있었습니다.
         * 어느 분류의 글인지 화면에서 표시할 수 있게 카테고리도 함께 내려줍니다.
         */
        const isAll = category_id === ALL_CATEGORY_ID;

        /*
         * 페이지 단위로 끊어 보냅니다.
         *
         * 예전에는 조건에 맞는 글을 본문째 전부 내려주고 화면에서 잘라 썼습니다.
         * 글이 2만 건 쌓이자 통합 목록 한 번에 30MB 가 나갔고, 홈 화면은 그중
         * 3건만 씁니다. 목록이 본문에서 미리보기와 대표 이미지를 뽑아 쓰므로
         * 본문은 남기고, 건수를 줄입니다.
         */
        const asked = Number(limit);
        const rowLimit = Number.isInteger(asked) && asked > 0 ? Math.min(asked, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
        const askedPage = Number(page);
        const offset = (Number.isInteger(askedPage) && askedPage > 0 ? askedPage - 1 : 0) * rowLimit;

        const where = `WHERE p.deleted_at IS NULL${isAll ? '' : ' AND p.category_id = ?'}`;
        const values = isAll ? [] : [category_id];

        const listQuery = `
        SELECT p.post_id, p.title, p.content, p.created_at, u.username,
               c.category_id, c.category_name
        FROM posts p
        JOIN users u ON p.user_id = u.user_id
        LEFT JOIN categories c ON c.category_id = p.category_id
        ${where}
        ORDER BY p.created_at DESC, p.post_id DESC
        LIMIT ? OFFSET ?
    `;
        // 총계는 화면의 쪽 번호에 필요합니다. 목록과 달리 본문을 읽지 않아 가볍습니다.
        const countQuery = `SELECT COUNT(*) AS total FROM posts p ${where}`;

        conn.query(listQuery, [...values, rowLimit, offset], (error, results) => {
            if (error) {
                return res.status(500).send({ message: '서버 오류 발생' });
            }
            conn.query(countQuery, values, (countError, countRows) => {
                if (countError) {
                    return res.status(500).send({ message: '서버 오류 발생', error: countError });
                }
                return res.send({ posts: results, total: countRows[0]?.total ?? results.length });
            });
        });
    }
}

module.exports = {
    getCategories,
    getListByCategory
}