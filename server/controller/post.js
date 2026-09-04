const conn = require('../mysql');
const { verifyToken } = require('./authUser');

// 게시글 ID로 게시글 조회
const getPostById = (req, res) => {
    const post_id = req.params.post_id;

    const query = 'SELECT p.title, p.content, p.created_at, u.username AS author FROM posts p JOIN users u ON p.user_id = u.user_id WHERE p.post_id = ?';

    conn.query(query, [post_id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ error: '서버 에러 발생' });
        }

        if (results.length === 0) {
            return res.status(404).send({ message: '해당 게시글을 찾을 수 없습니다.' });
        }

        const post = results[0];
        return res.send(post);
    });
};


// 새로운 게시글 추가
const addPostById = (req, res) => {
    console.log(req.body);
    const { category_id, title, content } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).send({ error: '유효하지 않은 토큰입니다.' });
    }

    const user_id = decoded.id;

    const query = 'INSERT INTO posts (category_id, user_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())';

    conn.query(query, [category_id, user_id, title, content], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ error: '서버 에러 발생' });
        }

        return res.send({ message: '새로운 게시글이 등록되었습니다.', postId: results.insertId });
    });
};

// 게시글 수정
const updatePostById = (req, res) => {
    const post_id = req.params.post_id;
    const { title, content } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).send({ error: '유효하지 않은 토큰입니다.' });
    }

    const user_id = decoded.id;

    const query = 'UPDATE posts SET title = ?, content = ?, updated_at = NOW() WHERE post_id = ? and user_id = ?';

    conn.query(query, [title, content, post_id, user_id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ error: '서버 에러 발생' });
        }


        if (results.affectedRows === 0) {
            return res.status(404).send({ message: '작성자만 게시글을 수정할 수 있습니다.' });
        }

        return res.send({ message: '게시글이 수정되었습니다.' });
    });
};

// 게시글 삭제
const deletePostById = (req, res) => {
    const post_id = req.params.post_id;
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).send({ error: '유효하지 않은 토큰입니다.' });
    }

    const user_id = decoded.id;

    const query = 'DELETE FROM posts WHERE post_id = ? and user_id = ?';

    conn.query(query, [post_id, user_id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ error: '서버 에러 발생' });
        }

        if (results.affectedRows === 0) {
            return res.status(404).send({ message: '작성자만 게시글을 삭제할 수 있습니다.' });
        }


        return res.send({ message: '게시글이 삭제되었습니다.' });
    });
};

module.exports = {
    getPostById,
    addPostById,
    updatePostById,
    deletePostById
};
