const conn = require('../mysql');

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
                return res.status(500).send({ message: '서버 오류 발생', error });
            }
            return res.send(results);
        });
    }

    else {
        if (!categoryId) {
            return res.status(400).send({ message: '카테고리 ID가 필요합니다.' });
        }

        const category_id = parseInt(categoryId, 10);
        if (isNaN(category_id)) {
            return res.status(400).send({ message: '유효한 카테고리 ID가 필요합니다.' });
        }

        /*
         * 통합은 전체 글입니다. 예전에는 '통합으로 지정된 글'만 골라 늘 비어 있었습니다.
         * 어느 분류의 글인지 화면에서 표시할 수 있게 카테고리도 함께 내려줍니다.
         */
        const isAll = category_id === ALL_CATEGORY_ID;
        const query = `
        SELECT p.post_id, p.title, p.content, p.created_at, u.username,
               c.category_id, c.category_name
        FROM posts p
        JOIN users u ON p.user_id = u.user_id
        LEFT JOIN categories c ON c.category_id = p.category_id
        ${isAll ? '' : 'WHERE p.category_id = ?'}
        ORDER BY p.created_at DESC
    `;

        conn.query(query, isAll ? [] : [category_id], (error, results) => {
            if (error) {
                return res.status(500).send({ message: '서버 오류 발생', error });
            }
            return res.send({ posts: results });
        });
    }
}

module.exports = {
    getCategories,
    getListByCategory
}