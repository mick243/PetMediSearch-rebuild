import { useState } from 'react';
import styled from 'styled-components';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import LoginKakao from '../components/login/LoginKakao';
import LoginNaver from '../components/login/LoginNaver';
import LoginGoogle from '../components/login/LoginGoogle';
import { login } from '../apis/auth.api';
import { apiErrorMessage } from '../utils/apiError';
import { setLogin } from '../store/slices/authSlice';

/**
 * 로그인.
 *
 * 이메일·비밀번호로 들어오는 일반 로그인을 위에 두고, 소셜 로그인은 그 아래에 둡니다.
 * 둘 다 같은 users 테이블을 쓰기 때문에 어느 쪽으로 들어와도 이후 화면은 같습니다.
 */
function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.email.trim() || !form.password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const data = await login(form);
      dispatch(setLogin({ token: data.token, user: data.user }));
      navigate('/', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, '로그인에 실패했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <LoginStyle>
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <Field>
          <label htmlFor="login-email">이메일</label>
          <input
            id="login-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="example@petmedisearch.com"
            autoComplete="email"
          />
        </Field>

        <Field>
          <label htmlFor="login-password">비밀번호</label>
          <input
            id="login-password"
            type="password"
            value={form.password}
            onChange={(e) =>
              setForm((p) => ({ ...p, password: e.target.value }))
            }
            autoComplete="current-password"
          />
        </Field>

        {error && <ErrorText role="alert">{error}</ErrorText>}

        <SubmitBt type="submit" disabled={saving}>
          로그인
        </SubmitBt>

        <Hint>
          아직 계정이 없으신가요? <Link to="/signup">회원가입</Link>
        </Hint>
      </Form>

      <Divider>
        <span>또는</span>
      </Divider>

      <Socials>
        <LoginKakao />
        <LoginNaver />
        <LoginGoogle />
      </Socials>
    </LoginStyle>
  );
}

export default Login;

const LoginStyle = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space.lg};
  padding: ${({ theme }) => theme.space.lg};
  font-family: ${({ theme }) => theme.font.body};
`;

/* 소셜 버튼이 350px 고정폭이라 폼도 같은 폭으로 맞춰 줄을 세웁니다. */
const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
  width: 350px;
  max-width: 100%;
`;

const Field = styled.div`
  display: grid;
  gap: 6px;
  label {
    font-size: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.color.textMuted};
  }
  input {
    width: 100%;
    height: 42px;
    padding: 0 12px;
    border: 1px solid ${({ theme }) => theme.color.borderStrong};
    border-radius: ${({ theme }) => theme.radius.sm};
    background-color: ${({ theme }) => theme.color.surface};
    font-family: inherit;
    font-size: 14px;
    color: ${({ theme }) => theme.color.text};
    box-sizing: border-box;
    &:focus {
      outline: none;
      border-color: ${({ theme }) => theme.color.primary};
    }
  }
`;

const SubmitBt = styled.button`
  height: 48px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.textInverse};
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  &:hover:enabled {
    background-color: ${({ theme }) => theme.color.primaryHover};
  }
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const ErrorText = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.color.danger};
`;

const Hint = styled.p`
  margin: 0;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textMuted};
  a {
    color: ${({ theme }) => theme.color.text};
    font-weight: 600;
  }
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  width: 350px;
  max-width: 100%;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: 12px;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background-color: ${({ theme }) => theme.color.border};
  }
`;

const Socials = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
`;
