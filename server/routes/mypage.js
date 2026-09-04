const express = require('express');
const { getReviewsByUserId, getPostsByUserId } = require('../controller/mypage');
const router = express.Router();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /mypage/posts:
 *   get:
 *     tags: [Mypage]
 *     summary: 유저의 게시글 목록 조회
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 유저가 작성한 게시글 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       401:
 *         description: 유효하지 않은 토큰
 *       404:
 *         description: 작성된 게시글이 없습니다.
 *       500:
 *         description: 서버 에러 발생
 */
router.get('/posts', getPostsByUserId);

/**
 * @swagger
 * /mypage/reviews:
 *   get:
 *     tags: [Mypage]
 *     summary: 유저의 후기 목록 조회
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 유저가 작성한 후기 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Review'
 *       401:
 *         description: 유효하지 않은 토큰
 *       404:
 *         description: 작성된 후기가 없습니다.
 *       500:
 *         description: 서버 에러 발생
 */
router.get('/reviews', getReviewsByUserId);

module.exports = router;
