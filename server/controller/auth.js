const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
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

    res.json({ token, user: toClientUser(user) });
  } catch (error) {
    console.error('Kakao login error:', error);
    res.status(500).json({ message: '카카오 로그인 처리 중 오류가 발생했습니다.' });
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

    res.json({ token, user: toClientUser(user) });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: '구글 로그인 처리 중 오류가 발생했습니다.' });
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

    res.json({ token, user: toClientUser(user) });
  } catch (error) {
    console.error('Naver login error:', error);
    res.status(500).json({ message: '네이버 로그인 처리 중 오류가 발생했습니다.' });
  }
};

exports.socialLogin = async (req, res) => {
  const { socialId, socialType, username } = req.body;

  try {
    const user = await processUser(socialId, socialType, username);
    const token = generateToken(user);

    res.json({ token, user: toClientUser(user) });
  } catch (error) {
    console.error('Social login error:', error);
    res.status(500).json({ message: '소셜 로그인 처리 중 오류가 발생했습니다.' });
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
  return jwt.sign(
    { id: user.user_id, role: user.role || 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

/** DB 행에서 화면에 필요한 것만 골라냅니다. 비밀번호 해시는 절대 내보내지 않습니다. */
const toClientUser = (user) => ({
  id: user.user_id,
  username: user.username,
  socialType: user.social_type || '',
  role: user.role || 'user',
});

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
/* ------------------------------------------------------------------ *
 * 일반 회원가입 · 로그인
 *
 * 소셜 계정과 같은 users 테이블을 씁니다. 소셜 계정은 email·password 가 비어 있고,
 * 일반 계정은 social_id·social_type 이 비어 있습니다.
 * ------------------------------------------------------------------ */

/** 해시 비용. 12 는 로그인 한 번에 수백 ms 정도라 체감되지 않으면서 무차별 대입을 충분히 늦춥니다. */
const SALT_ROUNDS = 12;

/** 최소 길이만 봅니다. 조합 규칙은 오히려 외우기 쉬운 암호를 유도해서 두지 않았습니다. */
const MIN_PASSWORD_LENGTH = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 010-1234-5678 이든 01012345678 이든 숫자만 남겨 한 모양으로 저장합니다. */
const normalizePhone = (phone) => String(phone).replace(/[^0-9]/g, '');

const query = (sql, values) =>
  new Promise((resolve, reject) => {
    conn.query(sql, values, (error, results) => {
      if (error) reject(error);
      else resolve(results);
    });
  });

/**
 * 입력값을 검사해 다듬은 값을 돌려줍니다. 문제가 있으면 { error } 를 담아 돌려줍니다.
 * 받는 정보는 이름·전화번호·이메일·주소 네 가지이고, 비밀번호는 로그인 수단입니다.
 */
const validateSignup = (body) => {
  const username = String(body.username ?? '').trim();
  const email = String(body.email ?? '')
    .trim()
    .toLowerCase();
  const password = String(body.password ?? '');
  const phone = normalizePhone(body.phone ?? '');
  const address = String(body.address ?? '').trim();

  if (!username) return { error: '이름을 입력해주세요.' };
  if (username.length > 50) return { error: '이름은 50자까지 입력할 수 있습니다.' };
  if (!email) return { error: '이메일을 입력해주세요.' };
  if (!EMAIL_RE.test(email)) return { error: '이메일 형식이 올바르지 않습니다.' };
  if (email.length > 255) return { error: '이메일이 너무 깁니다.' };
  if (!password) return { error: '비밀번호를 입력해주세요.' };
  if (password.length < MIN_PASSWORD_LENGTH)
    return { error: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` };
  if (!phone) return { error: '전화번호를 입력해주세요.' };
  if (phone.length < 9 || phone.length > 11)
    return { error: '전화번호 형식이 올바르지 않습니다.' };
  if (!address) return { error: '주소를 입력해주세요.' };
  if (address.length > 255) return { error: '주소는 255자까지 입력할 수 있습니다.' };

  return { value: { username, email, password, phone, address } };
};

exports.signup = async (req, res) => {
  const { error, value } = validateSignup(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    const hashed = await bcrypt.hash(value.password, SALT_ROUNDS);
    const result = await query(
      `INSERT INTO users (username, email, password, phone, address, role)
       VALUES (?, ?, ?, ?, ?, 'user')`,
      [value.username, value.email, hashed, value.phone, value.address]
    );

    const user = {
      user_id: result.insertId,
      username: value.username,
      social_type: null,
      role: 'user',
    };
    res.status(201).json({ token: generateToken(user), user: toClientUser(user) });
  } catch (err) {
    // 이메일 UNIQUE 제약에 걸린 경우입니다. 먼저 SELECT 로 확인하면 그 사이에 끼어드는
    // 가입을 막지 못하므로, DB 가 잡아준 것을 그대로 씁니다.
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: '이미 가입된 이메일입니다.' });
    }
    console.error('Signup error:', err);
    res.status(500).json({ message: '회원가입 처리 중 오류가 발생했습니다.' });
  }
};

exports.login = async (req, res) => {
  const email = String(req.body.email ?? '')
    .trim()
    .toLowerCase();
  const password = String(req.body.password ?? '');

  if (!email || !password) {
    return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' });
  }

  try {
    const rows = await query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];

    // 없는 이메일인지 비밀번호가 틀렸는지 구분해서 알려주면 가입 여부가 새어 나갑니다.
    // 어느 쪽이든 같은 문구로 답합니다.
    const ok = user && user.password && (await bcrypt.compare(password, user.password));
    if (!ok) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    res.json({ token: generateToken(user), user: toClientUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: '로그인 처리 중 오류가 발생했습니다.' });
  }
};
