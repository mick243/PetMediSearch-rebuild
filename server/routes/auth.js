const express = require('express');
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
router.post('/signup', authController.signup);

// 일반 로그인 (이메일 + 비밀번호)
router.post('/login', authController.login);

module.exports = router;