const express = require('express');
const {
    getReviewsByFacilityId,
    createReview,
    updateReview,
    deleteReview
} = require('../controller/review');

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
 * security:
 *   - BearerAuth: []
 */

/**
 * @swagger
 * /reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: 리뷰 등록
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               facility_id:
 *                 type: integer
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               review_content:
 *                 type: string
 *     responses:
 *       201:
 *         description: 리뷰가 성공적으로 등록됨
 *       400:
 *         description: 잘못된 요청 (필드가 누락됨)
 *       401:
 *         description: 유효하지 않은 토큰
 *       500:
 *         description: 서버 오류 발생
 */
router.post('/', createReview);

/**
 * @swagger
 * /reviews/facility/{facility_id}:
 *   get:
 *     tags: [Reviews]
 *     summary: 시설 ID에 따른 리뷰 조회
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: facility_id
 *         required: true
 *         description: 시설 ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 성공적으로 리뷰 목록을 반환함
 *       401:
 *         description: 유효하지 않은 토큰
 *       404:
 *         description: 시설을 찾을 수 없음
 *       500:
 *         description: 서버 오류 발생
 */
router.get('/facility/:facility_id', getReviewsByFacilityId);

/**
 * @swagger
 * /reviews/{review_id}:
 *   put:
 *     tags: [Reviews]
 *     summary: 리뷰 수정
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: review_id
 *         required: true
 *         description: 수정할 리뷰 ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               review_content:
 *                 type: string
 *     responses:
 *       200:
 *         description: 리뷰가 성공적으로 수정됨
 *       401:
 *         description: 유효하지 않은 토큰
 *       404:
 *         description: 리뷰를 찾을 수 없음
 *       500:
 *         description: 서버 오류 발생
 */
router.put('/:review_id', updateReview);

/**
 * @swagger
 * /reviews/{review_id}:
 *   delete:
 *     tags: [Reviews]
 *     summary: 리뷰 삭제
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: review_id
 *         required: true
 *         description: 삭제할 리뷰 ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 리뷰가 성공적으로 삭제됨
 *       401:
 *         description: 유효하지 않은 토큰
 *       404:
 *         description: 리뷰를 찾을 수 없음
 *       500:
 *         description: 서버 오류 발생
 */
router.delete('/:review_id', deleteReview);

module.exports = router;
