const express = require('express');
const { getCategories, getListByCategory } = require('../controller/category');
const router = express.Router();

/**
 * @swagger
 * /category:
 *   get:
 *     tags: [Categories]
 *     summary: 카테고리별 게시글 조회 또는 모든 카테고리 조회
 *     parameters:
 *       - in: query
 *         name: category
 *         required: false
 *         description: 게시글을 조회할 카테고리의 ID (없으면 카테고리 목록 반환)
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 성공적으로 게시글 목록 또는 카테고리 목록을 반환함
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     posts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           post_id:
 *                             type: integer
 *                           title:
 *                             type: string
 *                           content:
 *                             type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           username:
 *                             type: string
 *                 - type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category_id:
 *                         type: integer
 *                       name:
 *                         type: string
 *       400:
 *         description: 잘못된 요청 (카테고리 ID가 필요함)
 *       500:
 *         description: 서버 오류 발생
 */
router.get('/', getListByCategory);

module.exports = router;
