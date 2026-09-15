export interface AuthState {
  isLogin: boolean;
  user: UserState;
}

export interface UserState {
  id: number;
  username: string;
  /** 소셜 계정이면 'kakao' | 'naver' | 'google', 일반 가입 계정이면 빈 문자열입니다. */
  socialType: string;
  role: UserRole;
}

export type UserRole = 'user' | 'admin';

/** 일반 회원가입에서 받는 정보. 이름은 그대로 화면에 표시되는 이름이 됩니다. */
export interface SignupInput {
  username: string;
  email: string;
  password: string;
  phone: string;
  address: string;
}

/**
 * 가입 요청. 필수 동의 여부를 함께 보냅니다.
 * 서버도 이 값을 확인합니다 — 화면의 체크박스만 두면 요청을 직접 만들어
 * 보내는 쪽은 그냥 지나갑니다.
 */
export interface SignupRequest extends SignupInput {
  agreed: true;
}

export interface LoginInput {
  email: string;
  password: string;
}

/** /auth/signup · /auth/login 이 함께 돌려주는 모양입니다. */
export interface AuthResponse {
  token: string;
  user: UserState;
}

/**
 * 마이페이지의 내 정보 칸이 받는 것 (GET·PATCH /auth/me).
 *
 * UserState 와 갈라 두는 이유는 담는 것이 다르기 때문입니다. UserState 는 로그인
 * 응답에 실려 localStorage 까지 들어가므로 이메일·전화번호를 넣지 않습니다.
 * 이쪽은 수정 칸이 열릴 때만 받아 씁니다.
 *
 * 소셜 계정은 email·phone 이 null 입니다 — 소셜 로그인은 그 둘 없이 계정을
 * 만듭니다(서버 controller/auth.js 의 createUser).
 */
export interface MyAccount {
  id: number;
  username: string;
  email: string | null;
  phone: string | null;
  socialType: string;
  role: UserRole;
}

/**
 * 내 정보 수정. 보낸 항목만 바뀝니다.
 *
 * 전화번호는 빈 문자열을 보내면 지워집니다. 이메일은 소셜 계정이면 **보내면 안
 * 됩니다** — 서버가 400 으로 막습니다(소셜 계정에는 이메일이 없고, 넣어 주어도
 * 비밀번호가 없어 그 주소로 로그인할 수 없습니다).
 */
export interface UpdateMyAccountInput {
  username?: string;
  email?: string;
  phone?: string;
}

/**
 * 비밀번호 변경 (PATCH /auth/me/password).
 *
 * 지금 비밀번호를 함께 보냅니다 — 토큰만으로 바꾸게 두면 새어 나간 토큰 하나로
 * 계정을 빼앗깁니다. 확인용으로 한 번 더 치는 칸은 화면에서만 맞춰 보고
 * 서버로는 보내지 않습니다.
 *
 * 소셜 계정에는 비밀번호가 없어 이 요청 자체를 보내지 않습니다(400).
 */
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/**
 * 비밀번호를 바꾸면 이전에 나간 토큰이 전부 끊깁니다(다른 기기의 로그인 포함).
 * 지금 쓰던 것도 그중 하나라 새 토큰을 함께 받아 바로 갈아 끼웁니다 — 안 그러면
 * 바꾼 사람이 그 자리에서 로그아웃됩니다.
 */
export interface ChangePasswordResponse {
  message: string;
  token: string;
}
