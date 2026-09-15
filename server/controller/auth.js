const jwt = require('jsonwebtoken');
const { logError } = require('../logError');
const bcrypt = require('bcrypt');
const axios = require('axios');
const conn = require('../mysql');
const { verifyToken } = require('./authUser');

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


    const { id: socialId } = userResponse.data;
    const username = userResponse.data.properties?.nickname || userResponse.data.kakao_account?.profile?.nickname || `KakaoUser_${socialId}`;

    // 3. 사용자 처리 및 JWT 발급
    const user = await processUser(socialId.toString(), 'kakao', username);
    const token = generateToken(user);

    res.json({ token, user: toClientUser(user) });
  } catch (error) {
    logError('Kakao login error', error);
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
    logError('Google login error', error);
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
    logError('Naver login error', error);
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
    logError('Social login error', error);
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
      'SELECT * FROM users WHERE social_id = ? AND social_type = ? AND deleted_at IS NULL',
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
    /*
     * 소셜 계정은 가입 폼을 거치지 않아 체크박스를 보여 줄 자리가 없습니다.
     * 로그인 화면의 소셜 버튼 아래에 "누르면 동의한 것으로 봅니다" 를 적어 두고,
     * 계정이 처음 만들어지는 이 시점을 동의 시각으로 남깁니다.
     */
    conn.query(
      'INSERT INTO users (social_id, social_type, username, terms_agreed_at) VALUES (?, ?, ?, ?)',
      [socialId, socialType, safeUsername, new Date()],
      (error, results) => {
        if (error) {
          logError('Error creating user', error);
          reject(error);
        } else if (results && results.insertId) {
          resolve({ user_id: results.insertId, username: safeUsername });
        } else {
          // results 에는 사용자 행이 통째로 들어올 수 있어 내용은 남기지 않습니다.
          console.error('[auth:createUser] insertId 가 없습니다.');
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

/*
 * 항목별 검사.
 *
 * 가입(validateSignup)과 마이페이지의 내 정보 수정(updateMe)이 같은 것을 씁니다.
 * 예전처럼 검사를 각자 늘어놓으면 한쪽만 고쳐져, 가입에서는 막히는 값이 수정으로는
 * 들어가는 일이 생깁니다. 문구까지 한곳에 두어야 사용자가 보는 말도 같아집니다.
 *
 * 모두 controller/validate.js 와 같은 규약입니다 — { error } 아니면 다듬은 { value }.
 */

const usernameField = (raw) => {
  const value = String(raw ?? '').trim();
  if (!value) return { error: '이름을 입력해주세요.' };
  if (value.length > 50) return { error: '이름은 50자까지 입력할 수 있습니다.' };
  return { value };
};

const emailField = (raw) => {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!value) return { error: '이메일을 입력해주세요.' };
  if (!EMAIL_RE.test(value)) return { error: '이메일 형식이 올바르지 않습니다.' };
  if (value.length > 255) return { error: '이메일이 너무 깁니다.' };
  return { value };
};

/**
 * 전화번호.
 *
 * `required: false` 는 마이페이지에서 씁니다. 소셜 계정은 전화번호 없이 만들어지고
 * (createUser 가 social_id·social_type·username 만 넣습니다) 컬럼도 NULL 을 받으므로,
 * 비우고 저장하는 것을 오류로 볼 수 없습니다. 가입은 네 항목을 다 받으므로 필수입니다.
 */
const phoneField = (raw, { required = true } = {}) => {
  const value = normalizePhone(raw ?? '');
  if (!value) return required ? { error: '전화번호를 입력해주세요.' } : { value: null };
  if (value.length < 9 || value.length > 11) {
    return { error: '전화번호 형식이 올바르지 않습니다.' };
  }
  return { value };
};

const addressField = (raw) => {
  const value = String(raw ?? '').trim();
  if (!value) return { error: '주소를 입력해주세요.' };
  if (value.length > 255) return { error: '주소는 255자까지 입력할 수 있습니다.' };
  return { value };
};

/**
 * 비밀번호.
 *
 * label 은 문구에 그대로 들어갑니다 — 가입은 '비밀번호', 변경은 '새 비밀번호'.
 * 어느 칸을 말하는지 밝히지 않으면 비밀번호가 둘인 화면에서 무엇을 고치라는
 * 말인지 알 수 없습니다. 둘 다 '호' 로 끝나 받침이 없으므로 조사는 를/는 로
 * 고정해도 맞습니다 (받침을 보는 일반적인 방법은 controller/validate.js 에 있습니다).
 */
const passwordField = (raw, { label = '비밀번호' } = {}) => {
  const value = String(raw ?? '');
  if (!value) return { error: `${label}를 입력해주세요.` };
  if (value.length < MIN_PASSWORD_LENGTH) {
    return { error: `${label}는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` };
  }
  return { value };
};

/**
 * 입력값을 검사해 다듬은 값을 돌려줍니다. 문제가 있으면 { error } 를 담아 돌려줍니다.
 * 받는 정보는 이름·전화번호·이메일·주소 네 가지이고, 비밀번호는 로그인 수단입니다.
 */
const validateSignup = (body) => {
  const checked = {
    username: usernameField(body.username),
    email: emailField(body.email),
    password: passwordField(body.password),
    phone: phoneField(body.phone),
    address: addressField(body.address),
  };

  // 가입 폼의 차례대로 봅니다. 아래쪽 칸의 오류가 먼저 뜨면 어디를 고치라는 건지 모릅니다.
  for (const key of ['username', 'email', 'password', 'phone', 'address']) {
    if (checked[key].error) return { error: checked[key].error };
  }

  /*
   * 필수 동의(만 14세 이상 · 이용약관 · 개인정보 수집·이용)를 서버에서도 확인합니다.
   * 화면의 체크박스만 두면 요청을 직접 만들어 보내는 쪽은 그냥 지나갑니다.
   */
  if (body.agreed !== true) {
    return { error: '필수 항목에 동의해야 가입할 수 있습니다.' };
  }

  return {
    value: {
      username: checked.username.value,
      email: checked.email.value,
      password: checked.password.value,
      phone: checked.phone.value,
      address: checked.address.value,
    },
  };
};

exports.signup = async (req, res) => {
  const { error, value } = validateSignup(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    const hashed = await bcrypt.hash(value.password, SALT_ROUNDS);
    const result = await query(
      `INSERT INTO users (username, email, password, phone, address, role, terms_agreed_at)
       VALUES (?, ?, ?, ?, ?, 'user', ?)`,
      [value.username, value.email, hashed, value.phone, value.address, new Date()]
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
    logError('Signup error', err);
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
    // 탈퇴한 계정은 이메일이 비워지므로 이 조회에 걸리지 않지만, 뜻을 코드에 남겨 둡니다.
    const rows = await query(
      'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL',
      [email]
    );
    const user = rows[0];

    // 없는 이메일인지 비밀번호가 틀렸는지 구분해서 알려주면 가입 여부가 새어 나갑니다.
    // 어느 쪽이든 같은 문구로 답합니다.
    const ok = user && user.password && (await bcrypt.compare(password, user.password));
    if (!ok) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    res.json({ token: generateToken(user), user: toClientUser(user) });
  } catch (err) {
    logError('Login error', err);
    res.status(500).json({ message: '로그인 처리 중 오류가 발생했습니다.' });
  }
};

/* ------------------------------------------------------------------ *
 * 내 정보 보기 · 고치기
 *
 * 마이페이지에서 이름·이메일·전화번호를 고칩니다. 주소와 비밀번호는 여기서
 * 다루지 않습니다 — 비밀번호는 지금 값 확인이 함께 필요해 흐름이 다릅니다.
 * ------------------------------------------------------------------ */

/**
 * 내 계정에서 화면에 필요한 것만.
 *
 * toClientUser 와 따로 두는 이유는 담는 것이 다르기 때문입니다. 그쪽은 로그인
 * 응답에 실려 localStorage 까지 들어가므로 이메일·전화번호를 넣지 않습니다.
 * 이쪽은 수정 폼이 열릴 때만 받아 가는 값입니다.
 */
const toMyAccount = (user) => ({
  id: user.user_id,
  username: user.username,
  // 소셜 계정은 email·phone 이 비어 있습니다. 빈 문자열이 아니라 null 로 구분해 보냅니다.
  email: user.email ?? null,
  phone: user.phone ?? null,
  socialType: user.social_type || '',
  role: user.role || 'user',
});

/** 수정 폼이 열릴 때 지금 값을 받아갑니다. 토큰에는 이름·이메일이 없습니다. */
const findMyAccount = async (userId) => {
  const rows = await query(
    `SELECT user_id, username, email, phone, social_type, role
       FROM users WHERE user_id = ? AND deleted_at IS NULL`,
    [userId]
  );
  return rows[0];
};

exports.getMe = async (req, res) => {
  const decoded = verifyToken(req.headers.authorization?.split(' ')[1]);
  if (!decoded) {
    return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }

  try {
    const user = await findMyAccount(decoded.id);
    // 토큰은 하루짜리라, 그 사이에 탈퇴한 계정의 토큰이 올 수 있습니다.
    if (!user) return res.status(404).json({ message: '계정을 찾을 수 없습니다.' });

    return res.json(toMyAccount(user));
  } catch (err) {
    logError('auth:getMe', err);
    return res.status(500).json({ message: '내 정보를 불러오지 못했습니다.' });
  }
};

/**
 * 보낸 항목만 고칩니다.
 *
 * 값이 없는 것(undefined)과 비운 것을 가릅니다 — 전화번호를 지우려면 빈 값을
 * 보내야 하는데, 둘을 뭉치면 지울 방법이 없어집니다 (review.js 의 images 와 같은 이유).
 *
 * 소셜 계정이 이메일을 못 바꾸는 이유:
 *   소셜 계정에는 애초에 이메일이 없습니다(createUser 가 넣지 않습니다). 여기서
 *   넣어 준다 해도 비밀번호가 없어 그 주소로는 로그인할 수 없고, 남의 일반 계정과
 *   같은 주소면 UNIQUE 에 걸려 저장도 안 됩니다. 쓸 수 없는 값을 받아 두면
 *   "바꿨는데 로그인이 안 된다" 만 만듭니다.
 *
 * 소셜인지는 토큰이 아니라 DB 에서 봅니다. 토큰에는 { id, role } 뿐이고, 권한을
 * 토큰으로 판단하지 않는 것은 이 서버의 규칙입니다 (controller/authUser.js).
 */
exports.updateMe = async (req, res) => {
  const decoded = verifyToken(req.headers.authorization?.split(' ')[1]);
  if (!decoded) {
    return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }

  try {
    const current = await findMyAccount(decoded.id);
    if (!current) return res.status(404).json({ message: '계정을 찾을 수 없습니다.' });

    const changes = {};

    if (req.body.username !== undefined) {
      const name = usernameField(req.body.username);
      if (name.error) return res.status(400).json({ message: name.error });
      changes.username = name.value;
    }

    if (req.body.email !== undefined) {
      if (current.social_type) {
        return res
          .status(400)
          .json({ message: '소셜 계정은 이메일을 바꿀 수 없습니다.' });
      }
      const mail = emailField(req.body.email);
      if (mail.error) return res.status(400).json({ message: mail.error });
      changes.email = mail.value;
    }

    if (req.body.phone !== undefined) {
      const tel = phoneField(req.body.phone, { required: false });
      if (tel.error) return res.status(400).json({ message: tel.error });
      changes.phone = tel.value;
    }

    const columns = Object.keys(changes);
    if (columns.length === 0) {
      return res.status(400).json({ message: '바꿀 내용이 없습니다.' });
    }

    /*
     * 컬럼 이름을 문자열로 이어 붙이지만, 위 세 갈래에서만 채워지는 고정된 이름이라
     * 요청 본문의 키가 SQL 로 들어가지는 않습니다. 값은 전부 자리표시자로 넘깁니다.
     */
    await query(
      `UPDATE users SET ${columns.map((c) => `${c} = ?`).join(', ')}
        WHERE user_id = ? AND deleted_at IS NULL`,
      [...columns.map((c) => changes[c]), current.user_id]
    );

    return res.json(toMyAccount({ ...current, ...changes }));
  } catch (err) {
    /*
     * 이메일 UNIQUE 제약. 가입과 같은 판단입니다 — 먼저 SELECT 로 확인하면 그 사이에
     * 끼어드는 변경을 막지 못하므로, DB 가 잡아준 것을 그대로 씁니다.
     */
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: '이미 가입된 이메일입니다.' });
    }
    logError('auth:updateMe', err);
    return res.status(500).json({ message: '내 정보를 바꾸지 못했습니다.' });
  }
};

/**
 * 비밀번호 변경.
 *
 * 지금 비밀번호를 함께 받습니다. 토큰만으로 바꾸게 두면, 남의 기기에 로그인이
 * 남아 있거나 토큰이 한 번 새어 나간 것만으로 계정을 통째로 빼앗깁니다 —
 * 비밀번호를 바꾸는 순간 원래 주인이 못 들어옵니다. 토큰은 하루짜리라 그 사이에
 * 되찾을 방법이 있어야 하고, 그 마지막 자물쇠가 지금 비밀번호입니다.
 *
 * 소셜 계정은 바꿀 비밀번호가 없습니다(password 가 NULL). 이메일과 같은 이유로
 * 화면에서는 이 칸 자체를 보여 주지 않고, 서버는 400 으로 답합니다.
 *
 * 요청 제한은 routes/auth.js 에서 로그인과 따로 겁니다 — 여기도 bcrypt 를 한 번
 * 돌리므로 비용이 로그인과 같습니다.
 */
exports.changePassword = async (req, res) => {
  const decoded = verifyToken(req.headers.authorization?.split(' ')[1]);
  if (!decoded) {
    return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }

  const currentPassword = String(req.body.currentPassword ?? '');
  if (!currentPassword) {
    return res.status(400).json({ message: '지금 비밀번호를 입력해주세요.' });
  }

  const next = passwordField(req.body.newPassword, { label: '새 비밀번호' });
  if (next.error) return res.status(400).json({ message: next.error });

  try {
    const rows = await query(
      'SELECT user_id, password FROM users WHERE user_id = ? AND deleted_at IS NULL',
      [decoded.id]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ message: '계정을 찾을 수 없습니다.' });

    if (!user.password) {
      return res
        .status(400)
        .json({ message: '소셜 계정은 비밀번호로 로그인하지 않습니다.' });
    }

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ message: '지금 비밀번호가 올바르지 않습니다.' });
    }

    /*
     * 같은 값으로 바꾸는 것을 막습니다.
     *
     * 그대로 저장해도 탈은 없지만 "바꿨습니다" 라고 답하게 됩니다. 비밀번호가
     * 샜다고 생각해 바꾸러 온 사람이 사실은 아무것도 안 바꿨다는 것을 모른 채
     * 돌아갑니다.
     */
    if (await bcrypt.compare(next.value, user.password)) {
      return res
        .status(400)
        .json({ message: '지금 쓰는 것과 다른 비밀번호로 정해주세요.' });
    }

    const hashed = await bcrypt.hash(next.value, SALT_ROUNDS);
    await query(
      'UPDATE users SET password = ? WHERE user_id = ? AND deleted_at IS NULL',
      [hashed, user.user_id]
    );

    /*
     * 이미 나가 있는 토큰은 그대로 살아 있습니다. 토큰을 거둬들이려면 users 에
     * 판번호를 두고 토큰에 실어 맞춰 봐야 하는데, 지금은 그 자리가 없습니다.
     * 남은 토큰은 길어야 하루 뒤에 스스로 만료됩니다(generateToken 의 expiresIn).
     */
    return res.json({ message: '비밀번호를 바꿨습니다.' });
  } catch (err) {
    logError('auth:changePassword', err);
    return res.status(500).json({ message: '비밀번호를 바꾸지 못했습니다.' });
  }
};

/* ------------------------------------------------------------------ *
 * 회원 탈퇴
 *
 * 정책은 두 가지를 함께 씁니다.
 *   ① 쓴 글·댓글·후기는 soft delete 로 함께 감춥니다 (deleted_at)
 *   ③ users 행은 남기고 deleted_at 으로 계정만 비활성화합니다
 *
 * 행을 지우지 않는 이유는 posts·comments·reviews 의 FK 가 ON DELETE SET NULL 이라,
 * 지우면 글은 남고 작성자만 사라져 author JOIN 이 깨지기 때문입니다.
 * 행을 남겨 두면 FK 가 성하고 잘못 눌렀을 때 deleted_at 만 지워 되살릴 수도 있습니다.
 *
 * 다만 개인정보는 되돌리지 않습니다. 이메일·비밀번호·전화번호·주소·소셜 식별자를
 * 비우고 표시 이름만 남깁니다. 탈퇴는 "더 이상 보관하지 말라" 는 뜻이고,
 * 이메일을 비워야 같은 주소로 다시 가입할 수도 있습니다(UNIQUE 는 NULL 을 안 봅니다).
 *
 * 반려동물과 즐겨찾기는 공개된 글이 아니라 본인만 보는 기록이라 실제로 지웁니다.
 * 접종 일정은 pets 의 FK(ON DELETE CASCADE)가 함께 지웁니다.
 * ------------------------------------------------------------------ */
exports.withdraw = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }

  const userId = decoded.id;
  /*
   * 시각을 SQL 의 NOW() 대신 여기서 만들어 네 문장에 같은 값을 씁니다.
   * 그래야 나중에 "이 탈퇴로 함께 감춰진 글" 을 시각 하나로 정확히 골라낼 수 있습니다.
   */
  const deletedAt = new Date();

  try {
    // 계정을 먼저 닫습니다. 여기서 걸리면 이미 탈퇴한 계정이라 글은 건드리지 않습니다.
    const closed = await query(
      `UPDATE users
          SET deleted_at = ?, username = '탈퇴한 사용자',
              email = NULL, password = NULL, phone = NULL, address = NULL,
              social_id = NULL, social_type = NULL
        WHERE user_id = ? AND deleted_at IS NULL`,
      [deletedAt, userId]
    );

    if (closed.affectedRows === 0) {
      return res.status(404).json({ message: '이미 탈퇴한 계정입니다.' });
    }

    // 이미 지워져 있던 글은 건드리지 않아, 되살려도 그대로 지워진 채 남습니다.
    await query('UPDATE posts SET deleted_at = ? WHERE user_id = ? AND deleted_at IS NULL', [deletedAt, userId]);
    await query('UPDATE comments SET deleted_at = ? WHERE user_id = ? AND deleted_at IS NULL', [deletedAt, userId]);
    await query('UPDATE reviews SET deleted_at = ? WHERE user_id = ? AND deleted_at IS NULL', [deletedAt, userId]);

    await query('DELETE FROM favorite_facilities WHERE user_id = ?', [userId]);
    await query('DELETE FROM pets WHERE user_id = ?', [userId]);

    return res.json({ message: '탈퇴가 완료되었습니다.' });
  } catch (err) {
    logError('auth:withdraw', err);
    return res.status(500).json({ message: '탈퇴 처리 중 오류가 발생했습니다.' });
  }
};
