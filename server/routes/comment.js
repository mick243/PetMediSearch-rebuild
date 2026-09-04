const express = require('express');
const { getCommentsByPostId, addComment, updateCommentById, deleteCommentById } = require('../controller/comment');
const router = express.Router();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Comment:
 *       type: object
 *       properties:
 *         comment_id:
 *           type: integer
 *           example: 1
 *         post_id:
 *           type: integer
 *           example: 1
 *         user_id:
 *           type: integer
 *           example: 1
 *         content:
 *           type: string
 *           example: '댓글 내용'
 *         parent_comment_id:
 *           type: integer
 *           example: 0
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: '2023-09-25T14:48:00.000Z'
 *         username:
 *           type: string
 *           example: '사용자이름'
 */

/**
 * @swagger
 * /comments/{post_id}:
 *   get:
 *     tags: [Comments]
 *     summary: 특정 게시글의 댓글 조회
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: post_id
 *         in: path
 *         required: true
 *         description: 게시글 ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 게시글의 댓글 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 *       401:
 *         description: 유효하지 않은 토큰입니다.
 *       500:
 *         description: 서버 에러 발생
 */
router.get('/:post_id', getCommentsByPostId);

/**
 * @swagger
 * /comments:
 *   post:
 *     tags: [Comments]
 *     summary: 새로운 댓글 작성
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               post_id:
 *                 type: integer
 *                 example: 1
 *               content:
 *                 type: string
 *                 example: '댓글 내용'
 *               parent_comment_id:
 *                 type: integer
 *                 example: 0
 *     responses:
 *       200:
 *         description: 새로운 댓글이 등록되었습니다.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: '새로운 댓글이 등록되었습니다.'
 *                 commentId:
 *                   type: integer
 *                   example: 1
 *       401:
 *         description: 유효하지 않은 토큰입니다.
 *       500:
 *         description: 서버 에러 발생
 */
router.post('/', addComment);

/**
 * @swagger
 * /comments/{comment_id}:
 *   put:
 *     tags: [Comments]
 *     summary: 댓글 수정
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: comment_id
 *         in: path
 *         required: true
 *         description: 댓글 ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 example: '수정된 댓글 내용'
 *     responses:
 *       200:
 *         description: 댓글이 수정되었습니다.
 *       401:
 *         description: 유효하지 않은 토큰입니다.
 *       403:
 *         description: 작성자만 댓글을 수정할 수 있습니다.
 *       404:
 *         description: 해당 댓글을 찾을 수 없습니다.
 *       500:
 *         description: 서버 에러 발생
 */
router.put('/:comment_id', updateCommentById);

/**
 * @swagger
 * /comments/{comment_id}:
 *   delete:
 *     tags: [Comments]
 *     summary: 댓글 삭제
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: comment_id
 *         in: path
 *         required: true
 *         description: 댓글 ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 댓글이 삭제되었습니다.
 *       401:
 *         description: 유효하지 않은 토큰입니다.
 *       403:
 *         description: 작성자만 댓글을 삭제할 수 있습니다.
 *       404:
 *         description: 해당 댓글을 찾을 수 없습니다.
 *       500:
 *         description: 서버 에러 발생
 */
router.delete('/:comment_id', deleteCommentById);

module.exports = router;
