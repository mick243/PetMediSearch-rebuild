const jwt = require('jsonwebtoken');
const axios = require('axios');
const conn = require('../mysql');

exports.kakaoLogin = async (req, res) => {
  const { code } = req.query;

  try {
    // 1. 카카오 액세스 토큰 받기
    const tokenResponse = await axios.post('https://kauth.kakao.com/oauth/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_CLIENT_ID,
        redirect_uri: process.env.KAKAO_REDIRECT_URI,
        code,
      },
    });

    const { access_token } = tokenResponse.data;

    // 2. 카카오 사용자 정보 가져오기
    const userResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    console.log('Kakao user info:', userResponse.data); 

    const { id: socialId } = userResponse.data;
    const username = userResponse.data.properties?.nickname || userResponse.data.kakao_account?.profile?.nickname || `KakaoUser_${socialId}`;

    // 3. 사용자 처리 및 JWT 발급
    const user = await processUser(socialId.toString(), 'kakao', username);
    const token = generateToken(user);

    res.json({ token, user: { id: user.user_id, username: user.username, socialType: user.social_type } });
  } catch (error) {
    console.error('Kakao login error:', error);
    res.status(500).json({ error: '카카오 로그인 처리 중 오류가 발생했습니다.' });
  }
};

exports.googleLogin = async (req, res) => {
  const { code } = req.query;

  try {
    // 1. 구글 액세스 토큰 받기
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    });

    const { access_token } = tokenResponse.data;

    // 2. 구글 사용자 정보 가져오기
    const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const { id: socialId, name: username } = userResponse.data;

    // 3. 사용자 처리 및 JWT 발급
    const user = await processUser(socialId, 'google', username);
    const token = generateToken(user);

    res.json({ token, user: { id: user.user_id, username: user.username, socialType: user.social_type } });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: '구글 로그인 처리 중 오류가 발생했습니다.' });
  }
};

exports.naverLogin = async (req, res) => {
  const { code, state } = req.query;

  try {
    // 1. 네이버 액세스 토큰 받기
    const tokenResponse = await axios.post('https://nid.naver.com/oauth2.0/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.NAVER_CLIENT_ID,
        client_secret: process.env.NAVER_CLIENT_SECRET,
        code,
        state,
      },
    });

    const { access_token } = tokenResponse.data;

    // 2. 네이버 사용자 정보 가져오기
    const userResponse = await axios.get('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const { id: socialId, name: username } = userResponse.data.response;

    // 3. 사용자 처리 및 JWT 발급
    const user = await processUser(socialId, 'naver', username);
    const token = generateToken(user);

    res.json({ token, user: { id: user.user_id, username: user.username, socialType: user.social_type } });
  } catch (error) {
    console.error('Naver login error:', error);
    res.status(500).json({ error: '네이버 로그인 처리 중 오류가 발생했습니다.' });
  }
};

exports.socialLogin = async (req, res) => {
  const { socialId, socialType, username } = req.body;

  try {
    const user = await processUser(socialId, socialType, username);
    const token = generateToken(user);

    res.json({ token, user: { id: user.user_id, username: user.username } });
  } catch (error) {
    console.error('Social login error:', error);
    res.status(500).json({ error: '소셜 로그인 처리 중 오류가 발생했습니다.' });
  }
};

const processUser = async (socialId, socialType, username) => {
  let user = await getUserBySocialId(socialId, socialType);
  if (!user) {
    user = await createUser(socialId, socialType, username);
  }
  return user;
};

const generateToken = (user) => {
  return jwt.sign({ id: user.user_id }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

const getUserBySocialId = (socialId, socialType) => {
  return new Promise((resolve, reject) => {
    conn.query(
      'SELECT * FROM users WHERE social_id = ? AND social_type = ?',
      [socialId, socialType],
      (error, results) => {
        if (error) reject(error);
        resolve(results[0]);
      }
    );
  });
};

const createUser = (socialId, socialType, username) => {
  return new Promise((resolve, reject) => {
    const safeUsername = username || `User_${socialId.substr(0, 8)}`;
    console.log('Creating user with:', { socialId, socialType, safeUsername });
    conn.query(
      'INSERT INTO users (social_id, social_type, username) VALUES (?, ?, ?)',
      [socialId, socialType, safeUsername],
      (error, results) => {
        if (error) {
          console.error('Error creating user:', error);
          reject(error);
        } else if (results && results.insertId) {
          resolve({ user_id: results.insertId, username: safeUsername });
        } else {
          console.error('Unexpected result from insert query:', results);
          reject(new Error('Failed to create user: No insert ID returned'));
        }
      }
    );
  });
};