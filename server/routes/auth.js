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

module.exports = router;