const express = require('express');
const { getReviewsByUserId, getPostsByUserId, getCommentsByUserId } = require('../controller/mypage');
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
 *     description: 최근 20건. 지워진 글은 빠집니다.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 유저가 작성한 게시글 목록 (없으면 빈 배열)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       401:
 *         description: 유효하지 않은 토큰
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
 *     description: 최근 20건.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 유저가 작성한 후기 목록 (없으면 빈 배열)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Review'
 *       401:
 *         description: 유효하지 않은 토큰
 *       500:
 *         description: 서버 에러 발생
 */
router.get('/reviews', getReviewsByUserId);

/**
 * @swagger
 * /mypage/comments:
 *   get:
 *     tags: [Mypage]
 *     summary: 유저의 댓글 목록 조회
 *     description: 최근 20건. 지워진 댓글과, 지워진 글에 달린 댓글은 빠집니다.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 유저가 작성한 댓글 목록 (없으면 빈 배열)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   comment_id: { type: integer }
 *                   post_id: { type: integer }
 *                   post_title: { type: string }
 *                   content: { type: string }
 *                   created_at: { type: string, format: date-time }
 *       401:
 *         description: 유효하지 않은 토큰
 *       500:
 *         description: 서버 에러 발생
 */
router.get('/comments', getCommentsByUserId);

module.exports = router;
