const express = require('express');
const { getPostById, addPostById, updatePostById, deletePostById } = require('../controller/post');
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
 *     Post:
 *       type: object
 *       properties:
 *         post_id:
 *           type: integer
 *           example: 1
 *         category_id:
 *           type: integer
 *           example: 1
 *         user_id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: '테스트 제목'
 *         content:
 *           type: string
 *           example: '테스트 내용'
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
 * /posts/{post_id}:
 *   get:
 *     tags: [Posts]
 *     summary: 특정 글 상세 조회
 *     parameters:
 *       - name: post_id
 *         in: path
 *         required: true
 *         description: 게시글 ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 게시글 정보
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       404:
 *         description: 해당 게시글을 찾을 수 없습니다.
 *       500:
 *         description: 서버 에러 발생
 */
router.get('/:post_id', getPostById);

/**
 * @swagger
 * /posts:
 *   post:
 *     tags: [Posts]
 *     summary: 글 작성
 *     security:
 *       - BearerAuth: []   # JWT 토큰 사용
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category_id:
 *                 type: integer
 *                 example: 1
 *               title:
 *                 type: string
 *                 example: '새로운 게시글 제목'
 *               content:
 *                 type: string
 *                 example: '새로운 게시글 내용'
 *     responses:
 *       200:
 *         description: 새로운 게시글이 등록되었습니다.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: '새로운 게시글이 등록되었습니다.'
 *                 postId:
 *                   type: integer
 *                   example: 1
 *       401:
 *         description: 유효하지 않은 토큰입니다.   # 토큰 오류에 대한 응답
 *       500:
 *         description: 서버 에러 발생
 */
router.post('/', addPostById);

/**
 * @swagger
 * /posts/{post_id}:
 *   put:
 *     tags: [Posts]
 *     summary: 글 수정
 *     security:
 *       - BearerAuth: []   # JWT 토큰 사용
 *     parameters:
 *       - name: post_id
 *         in: path
 *         required: true
 *         description: 게시글 ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: '수정된 게시글 제목'
 *               content:
 *                 type: string
 *                 example: '수정된 게시글 내용'
 *     responses:
 *       200:
 *         description: 게시글이 수정되었습니다.
 *       401:
 *         description: 유효하지 않은 토큰입니다.
 *       404:
 *         description: 해당 게시글을 찾을 수 없습니다.
 *       500:
 *         description: 서버 에러 발생
 */
router.put('/:post_id', updatePostById);

/**
 * @swagger
 * /posts/{post_id}:
 *   delete:
 *     tags: [Posts]
 *     summary: 글 삭제
 *     security:
 *       - BearerAuth: []   # JWT 토큰 사용
 *     parameters:
 *       - name: post_id
 *         in: path
 *         required: true
 *         description: 게시글 ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 게시글이 삭제되었습니다.
 *       401:
 *         description: 유효하지 않은 토큰입니다.
 *       404:
 *         description: 해당 게시글을 찾을 수 없습니다.
 *       500:
 *         description: 서버 에러 발생
 */
router.delete('/:post_id', deletePostById);

module.exports = router;
