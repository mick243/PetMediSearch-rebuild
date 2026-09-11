import { useState } from 'react';
import styled from 'styled-components';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { signup } from '../apis/auth.api';
import { apiErrorMessage } from '../utils/apiError';
import { setLogin } from '../store/slices/authSlice';
import { SignupInput } from '../types/auth.type';
import { Actions, CancelBt, SubmitBt } from '../components/board/postEditor';

const EMPTY: SignupInput = {
  username: '',
  email: '',
  password: '',
  phone: '',
  address: '',
};

/** 서버의 최소 길이와 맞춰 둡니다. 여기서 먼저 걸러 왕복을 한 번 줄입니다. */
const MIN_PASSWORD_LENGTH = 8;

/**
 * 일반 회원가입.
 *
 * 받는 정보는 이름·전화번호·이메일·주소 네 가지이고, 비밀번호는 로그인 수단입니다.
 * 가입이 끝나면 바로 로그인 상태가 되므로 다시 로그인 화면을 거치지 않습니다.
 */
function Signup() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [form, setForm] = useState<SignupInput>(EMPTY);
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key: keyof SignupInput, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /** 서버와 같은 규칙으로 먼저 봅니다. 서버 검증은 그대로 두고 여기서 한 겹 더 거릅니다. */
  const localError = () => {
    if (!form.username.trim()) return '이름을 입력해주세요.';
    if (!form.email.trim()) return '이메일을 입력해주세요.';
    if (!form.password) return '비밀번호를 입력해주세요.';
    if (form.password.length < MIN_PASSWORD_LENGTH)
      return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`;
    if (form.password !== confirm) return '비밀번호가 서로 다릅니다.';
    if (!form.phone.trim()) return '전화번호를 입력해주세요.';
    if (!form.address.trim()) return '주소를 입력해주세요.';
    return '';
  };

  const handleSubmit = async () => {
    const message = localError();
    if (message) {
      setError(message);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const data = await signup(form);
      dispatch(setLogin({ token: data.token, user: data.user }));
      navigate('/', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, '회원가입에 실패했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <Body
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <Title>회원가입</Title>

        <Field>
          <label htmlFor="signup-name">이름</label>
          <input
            id="signup-name"
            value={form.username}
            onChange={(e) => set('username', e.target.value)}
            placeholder="예: 신짱구"
            autoComplete="name"
          />
        </Field>

        <Field>
          <label htmlFor="signup-email">이메일</label>
          <input
            id="signup-email"
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="example@petmedisearch.com"
            autoComplete="email"
          />
        </Field>

        <Field>
          <label htmlFor="signup-password">비밀번호</label>
          <input
            id="signup-password"
            type="password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            placeholder={`${MIN_PASSWORD_LENGTH}자 이상`}
            autoComplete="new-password"
          />
        </Field>

        <Field>
          <label htmlFor="signup-confirm">비밀번호 확인</label>
          <input
            id="signup-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="한 번 더 입력해주세요"
            autoComplete="new-password"
          />
        </Field>

        <Field>
          <label htmlFor="signup-phone">전화번호</label>
          <input
            id="signup-phone"
            type="tel"
            inputMode="numeric"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="010-1234-5678"
            autoComplete="tel"
          />
        </Field>

        <Field>
          <label htmlFor="signup-address">주소</label>
          <input
            id="signup-address"
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            placeholder="서울특별시 강남구 테헤란로 1"
            autoComplete="street-address"
          />
        </Field>

        {error && <ErrorText role="alert">{error}</ErrorText>}

        <Hint>
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </Hint>
      </Body>

      <Actions>
        <CancelBt type="button" onClick={() => navigate(-1)}>
          취소
        </CancelBt>
        <SubmitBt type="button" onClick={handleSubmit} disabled={saving}>
          가입하기
        </SubmitBt>
      </Actions>
    </Page>
  );
}

export default Signup;

const Page = styled.section`
  display: flex;
  flex-direction: column;
  flex: 1;
  background-color: ${({ theme }) => theme.color.surface};
  font-family: ${({ theme }) => theme.font.body};
`;

const Body = styled.form`
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: ${({ theme }) => theme.space.lg};
  padding: 0 ${({ theme }) => theme.space.lg} ${({ theme }) => theme.space.lg};
`;

const Title = styled.h1`
  margin: 0;
  font-family: ${({ theme }) => theme.font.body};
  font-size: 17px;
  font-weight: 700;
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

const ErrorText = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.color.danger};
`;

const Hint = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textMuted};
  a {
    color: ${({ theme }) => theme.color.text};
    font-weight: 600;
  }
`;
