const express = require('express');
const { getFavorites, addFavorite, removeFavorite } = require('../controller/favorites');
const router = express.Router();

/**
 * @swagger
 * /favorites:
 *   get:
 *     tags: [Favorites]
 *     summary: 내 단골 병원·약국 목록
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 시설 정보가 붙은 배열
 *       401:
 *         description: 유효하지 않은 토큰입니다.
 */
router.get('/', getFavorites);

/**
 * @swagger
 * /favorites/{facility_id}:
 *   post:
 *     tags: [Favorites]
 *     summary: 단골 등록 (이미 있으면 그대로 성공)
 *     security:
 *       - BearerAuth: []
 *   delete:
 *     tags: [Favorites]
 *     summary: 단골 해제
 *     security:
 *       - BearerAuth: []
 */
router.post('/:facility_id', addFavorite);
router.delete('/:facility_id', removeFavorite);

module.exports = router;
