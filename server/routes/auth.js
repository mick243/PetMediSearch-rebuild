const express = require('express');
const { loginLimiter, signupLimiter } = require('../middleware/rateLimit');
const router = express.Router();
const authController = require('../controller/auth');

// 카카오 로그인
router.get('/kakao', authController.kakaoLogin);

// 구글 로그인
router.get('/google', authController.googleLogin);

// 네이버 로그인
router.get('/naver', authController.naverLogin);

// 소셜 로그인 (공통)
router.post('/social-login', authController.socialLogin);

// 일반 회원가입 (이름·전화번호·이메일·주소 + 비밀번호)
router.post('/signup', signupLimiter, authController.signup);

// 일반 로그인 (이메일 + 비밀번호)
router.post('/login', loginLimiter, authController.login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: 내 정보 조회
 *     description: >
 *       마이페이지의 수정 폼이 지금 값을 채울 때 씁니다.
 *       소셜 계정은 email·phone 이 null 입니다.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 내 계정 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: integer }
 *                 username: { type: string }
 *                 email: { type: string, nullable: true }
 *                 phone: { type: string, nullable: true }
 *                 socialType: { type: string, description: "소셜 계정이면 kakao|naver|google, 일반 가입이면 빈 문자열" }
 *                 role: { type: string }
 *       401:
 *         description: 유효하지 않은 토큰
 *       404:
 *         description: 이미 탈퇴한 계정
 *       500:
 *         description: 서버 에러 발생
 */
router.get('/me', authController.getMe);

/**
 * @swagger
 * /auth/me:
 *   patch:
 *     tags: [Auth]
 *     summary: 내 정보 수정 (이름·이메일·전화번호)
 *     description: >
 *       보낸 항목만 바뀝니다. 전화번호는 빈 값을 보내면 지워집니다.
 *       소셜 계정이 email 을 보내면 400 입니다 — 소셜 계정에는 이메일이 없고,
 *       넣어 주어도 비밀번호가 없어 그 주소로 로그인할 수 없습니다.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string, maxLength: 50, example: '홍길동' }
 *               email: { type: string, maxLength: 255, example: 'me@example.com' }
 *               phone: { type: string, example: '010-1234-5678', description: '숫자만 남겨 저장합니다. 빈 값이면 지웁니다' }
 *     responses:
 *       200:
 *         description: 바뀐 뒤의 내 계정 정보
 *       400:
 *         description: 입력값이 올바르지 않음 · 바꿀 내용 없음 · 소셜 계정의 이메일 변경
 *       401:
 *         description: 유효하지 않은 토큰
 *       404:
 *         description: 이미 탈퇴한 계정
 *       409:
 *         description: 이미 가입된 이메일
 *       500:
 *         description: 서버 에러 발생
 */
router.patch('/me', authController.updateMe);

/**
 * @swagger
 * /auth/me:
 *   delete:
 *     tags: [Auth]
 *     summary: 회원 탈퇴
 *     description: >
 *       계정을 비활성화하고 쓴 글·댓글·후기를 함께 감춥니다(soft delete).
 *       이메일·비밀번호·전화번호·주소·소셜 식별자는 지워지며 되돌릴 수 없습니다.
 *       반려동물과 즐겨찾기는 실제로 삭제됩니다.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 탈퇴 완료
 *       401:
 *         description: 유효하지 않은 토큰
 *       404:
 *         description: 이미 탈퇴한 계정
 *       500:
 *         description: 서버 에러 발생
 */
router.delete('/me', authController.withdraw);

module.exports = router;