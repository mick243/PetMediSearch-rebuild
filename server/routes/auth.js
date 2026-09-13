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