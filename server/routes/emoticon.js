const express = require('express');
const {
    listEmoticons,
    getEmoticonImage,
    createEmoticon,
    deleteEmoticon,
} = require('../controller/emoticon');

const router = express.Router();

/**
 * @swagger
 * /emoticons:
 *   get:
 *     tags: [Emoticons]
 *     summary: 이모티콘 목록 (그림은 빼고 id·이름만)
 *     responses:
 *       200:
 *         description: "{ emoticons: [{ emoticon_id, name }] }"
 *       500:
 *         description: 서버 오류 발생
 */
router.get('/', listEmoticons);

/**
 * @swagger
 * /emoticons/{emoticon_id}/image:
 *   get:
 *     tags: [Emoticons]
 *     summary: 이모티콘 그림 (image/jpeg · image/png · image/gif)
 *     parameters:
 *       - in: path
 *         name: emoticon_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 이미지 바이트
 *       404:
 *         description: 이모티콘을 찾을 수 없습니다.
 */
router.get('/:emoticon_id/image', getEmoticonImage);

/**
 * @swagger
 * /emoticons:
 *   post:
 *     tags: [Emoticons]
 *     summary: 이모티콘 등록 (관리자만)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               image:
 *                 type: string
 *                 description: data URL. JPG · PNG · GIF 만, 512KB 까지.
 *     responses:
 *       201:
 *         description: 이모티콘을 등록했습니다.
 *       400:
 *         description: 형식이나 크기가 맞지 않음
 *       401:
 *         description: 유효하지 않은 토큰
 *       403:
 *         description: 관리자만 이모티콘을 등록할 수 있습니다.
 */
router.post('/', createEmoticon);

/**
 * @swagger
 * /emoticons/{emoticon_id}:
 *   delete:
 *     tags: [Emoticons]
 *     summary: 이모티콘 삭제 (관리자만)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: emoticon_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 이모티콘을 삭제했습니다.
 *       401:
 *         description: 유효하지 않은 토큰
 *       403:
 *         description: 관리자만 이모티콘을 등록할 수 있습니다.
 *       404:
 *         description: 이모티콘을 찾을 수 없습니다.
 */
router.delete('/:emoticon_id', deleteEmoticon);

module.exports = router;
