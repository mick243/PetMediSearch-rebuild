import { useState } from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { changePassword } from '../../apis/auth.api';
import { RootState } from '../../store';
import { apiErrorMessage } from '../../utils/apiError';
import { setToken } from '../../utils/localStorage';

/** 서버의 최소 길이와 맞춰 둡니다. 여기서 먼저 걸러 왕복을 한 번 줄입니다 (Signup 과 같은 값). */
const MIN_PASSWORD_LENGTH = 8;

const EMPTY = { current: '', next: '', confirm: '' };

/**
 * 비밀번호 변경 칸.
 *
 * 소셜 계정에는 아예 보여 주지 않습니다. 비밀번호로 로그인하지 않는 계정이라
 * 바꿀 것이 없고, 칸만 두면 "눌렀는데 안 된다" 가 됩니다. 소셜인지는 로그인할 때
 * 받아 둔 socialType 으로 압니다 — 이것 때문에 서버에 한 번 더 묻지 않습니다.
 *
 * 지금 비밀번호를 함께 받는 이유는 서버 쪽 주석(controller/auth.js 의
 * changePassword)에 적어 두었습니다 — 요약하면 토큰 하나로 계정을 빼앗기지
 * 않게 하는 마지막 자물쇠입니다.
 */
function PasswordSection() {
  const socialType = useSelector(
    (state: RootState) => state.auth.user.socialType
  );

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (socialType) return null;

  const set = (key: keyof typeof EMPTY, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /** 서버와 같은 규칙으로 먼저 봅니다. 서버 검사는 그대로 두고 여기서 한 겹 더 거릅니다. */
  const localError = () => {
    if (!form.current) return '지금 비밀번호를 입력해주세요.';
    if (!form.next) return '새 비밀번호를 입력해주세요.';
    if (form.next.length < MIN_PASSWORD_LENGTH)
      return `새 비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`;
    if (form.next !== form.confirm) return '새 비밀번호가 서로 다릅니다.';
    if (form.next === form.current)
      return '지금 쓰는 것과 다른 비밀번호로 정해주세요.';
    return '';
  };

  const close = () => {
    // 입력칸에 남은 비밀번호를 그대로 두지 않습니다.
    setForm(EMPTY);
    setError(null);
    setOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    const invalid = localError();
    if (invalid) {
      setError(invalid);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { token } = await changePassword({
        currentPassword: form.current,
        newPassword: form.next,
      });
      /*
       * 바꾸는 순간 이전 토큰이 전부 끊깁니다. 지금 들고 있던 것도 그중 하나라
       * 바로 갈아 끼웁니다 — 안 하면 다음 요청이 401 이 되어, 비밀번호를 바꾸자마자
       * 로그인 화면으로 튕깁니다.
       */
      setToken(token);
      setDone(true);
      close();
    } catch (err) {
      setError(apiErrorMessage(err, '비밀번호를 바꾸지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PasswordStyle>
      {!open ? (
        <div className="head">
          <div>
            <p className="title">비밀번호</p>
            {done && <p className="done">비밀번호를 바꿨습니다.</p>}
          </div>
          <button
            type="button"
            className="open"
            onClick={() => {
              setDone(false);
              setOpen(true);
            }}
          >
            변경
          </button>
        </div>
      ) : (
        <form className="form" onSubmit={handleSubmit}>
          <p className="title">비밀번호 변경</p>

          <label htmlFor="password-current">지금 비밀번호</label>
          <input
            id="password-current"
            type="password"
            value={form.current}
            autoComplete="current-password"
            onChange={(e) => set('current', e.target.value)}
            disabled={saving}
          />

          <label htmlFor="password-next">새 비밀번호</label>
          <input
            id="password-next"
            type="password"
            value={form.next}
            placeholder={`${MIN_PASSWORD_LENGTH}자 이상`}
            autoComplete="new-password"
            onChange={(e) => set('next', e.target.value)}
            disabled={saving}
          />

          <label htmlFor="password-confirm">새 비밀번호 확인</label>
          <input
            id="password-confirm"
            type="password"
            value={form.confirm}
            autoComplete="new-password"
            onChange={(e) => set('confirm', e.target.value)}
            disabled={saving}
          />

          {error && <p className="failed">{error}</p>}

          {/*
            바꾸는 순간 다른 기기의 로그인이 끊깁니다. 비밀번호가 샜다고 생각해
            바꾸는 경우가 많아 그게 바라는 동작이지만, 모르고 누르면 다른 기기가
            갑자기 로그아웃된 것으로 보입니다.
          */}
          <p className="hint">
            바꾸면 다른 기기에 남아 있는 로그인이 모두 끊깁니다.
          </p>

          <div className="actions">
            <button
              type="button"
              className="cancel"
              onClick={close}
              disabled={saving}
            >
              취소
            </button>
            <button type="submit" className="save" disabled={saving}>
              {saving ? '바꾸는 중…' : '바꾸기'}
            </button>
          </div>
        </form>
      )}
    </PasswordStyle>
  );
}

const PasswordStyle = styled.div`
  margin-bottom: ${({ theme }) => theme.space.xl};
  padding: ${({ theme }) => theme.space.lg};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.color.surfaceMuted};

  .title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: ${({ theme }) => theme.color.text};
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .done {
      margin: 4px 0 0;
      font-size: 12px;
      color: ${({ theme }) => theme.color.success};
    }

    .open {
      padding: 4px 12px;
      border: 1px solid ${({ theme }) => theme.color.borderStrong};
      border-radius: ${({ theme }) => theme.radius.pill};
      background-color: ${({ theme }) => theme.color.surface};
      font-family: inherit;
      font-size: 12px;
      color: ${({ theme }) => theme.color.text};
      cursor: pointer;
    }
  }

  .form {
    display: flex;
    flex-direction: column;

    .title {
      margin-bottom: ${({ theme }) => theme.space.lg};
    }

    label {
      margin-bottom: 4px;
      font-size: 13px;
      color: ${({ theme }) => theme.color.textMuted};
    }

    label + input {
      margin-bottom: ${({ theme }) => theme.space.md};
    }

    input {
      padding: 8px 10px;
      border: 1px solid ${({ theme }) => theme.color.borderStrong};
      border-radius: ${({ theme }) => theme.radius.sm};
      background-color: ${({ theme }) => theme.color.surface};
      font-family: inherit;
      font-size: 13px;
      color: ${({ theme }) => theme.color.text};
    }

    input:disabled {
      opacity: 0.6;
    }

    .failed {
      margin: 0 0 ${({ theme }) => theme.space.sm};
      font-size: 13px;
      color: ${({ theme }) => theme.color.danger};
    }

    .hint {
      margin: 0;
      font-size: 12px;
      color: ${({ theme }) => theme.color.textMuted};
    }
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: ${({ theme }) => theme.space.sm};
    margin-top: ${({ theme }) => theme.space.lg};

    button {
      padding: 8px 16px;
      border-radius: ${({ theme }) => theme.radius.pill};
      font-family: inherit;
      font-size: 13px;
      cursor: pointer;
    }

    button:disabled {
      opacity: 0.5;
      cursor: default;
    }

    .cancel {
      border: 1px solid ${({ theme }) => theme.color.borderStrong};
      background-color: ${({ theme }) => theme.color.surface};
      color: ${({ theme }) => theme.color.text};
    }

    .save {
      border: 1px solid ${({ theme }) => theme.color.primary};
      background-color: ${({ theme }) => theme.color.primary};
      color: ${({ theme }) => theme.color.textInverse};
      font-weight: 600;
    }
  }
`;

export default PasswordSection;
