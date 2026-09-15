import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { getMyAccount, updateMyAccount } from '../../apis/auth.api';
import { setUsername } from '../../store/slices/authSlice';
import { MyAccount } from '../../types/auth.type';
import { apiErrorMessage } from '../../utils/apiError';

/** 전화번호를 보기 좋게 끊습니다. 저장은 숫자만 하고(서버 normalizePhone) 보일 때만 붙입니다. */
const formatPhone = (phone: string) => {
  if (phone.length === 11)
    return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
  if (phone.length === 10)
    return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
  return phone;
};

const PROVIDER_NAME: Record<string, string> = {
  kakao: '카카오',
  naver: '네이버',
  google: '구글',
};

/**
 * 내 정보 칸 — 이름·이메일·전화번호를 고칩니다.
 *
 * 늘 입력칸으로 두지 않고 한 번 눌러 펼칩니다. 마이페이지는 글·댓글·후기를 보러
 * 들르는 화면이라, 계정 정보가 늘 편집 가능한 상태로 놓여 있으면 지나가다 눌러
 * 바꿔 버리기 쉽습니다 (WithdrawSection 과 같은 판단).
 *
 * 소셜 계정은 이메일 칸이 없습니다. 정책이 아니라 실제로 값이 없어서입니다 —
 * 소셜 로그인은 이메일·비밀번호 없이 계정을 만들고, 여기서 이메일을 넣어 준다 해도
 * 비밀번호가 없어 그 주소로는 로그인할 수 없습니다.
 */
function AccountSection() {
  const dispatch = useDispatch();
  const [account, setAccount] = useState<MyAccount | null>(null);
  const [loading, setLoading] = useState(true);
  /*
   * 못 불러온 것과 값이 비어 있는 것은 다른 상태입니다.
   * 실패를 빈 값으로 그리면 이름이 사라진 줄 압니다 (MyReview 와 같은 이유).
   */
  const [loadFailed, setLoadFailed] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({ username: '', email: '', phone: '' });

  useEffect(() => {
    let alive = true;
    getMyAccount()
      .then((mine) => alive && setAccount(mine))
      .catch((error) => {
        console.error('내 정보를 불러오는 중 오류 발생:', error);
        if (alive)
          setLoadFailed(
            apiErrorMessage(error, '내 정보를 불러오지 못했습니다.')
          );
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const isSocial = Boolean(account?.socialType);
  const providerName = account ? PROVIDER_NAME[account.socialType] : undefined;

  const openEdit = () => {
    if (!account) return;
    setForm({
      username: account.username,
      email: account.email ?? '',
      phone: account.phone ?? '',
    });
    setSaveError(null);
    setEditing(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !account) return;

    setSaving(true);
    setSaveError(null);
    try {
      const next = await updateMyAccount({
        username: form.username,
        phone: form.phone,
        // 소셜 계정은 아예 보내지 않습니다. 보내면 서버가 400 으로 막습니다.
        ...(isSocial ? {} : { email: form.email }),
      });
      setAccount(next);
      // 화면 위쪽의 이름과 localStorage 도 같이 맞춥니다.
      dispatch(setUsername(next.username));
      setEditing(false);
    } catch (error) {
      setSaveError(apiErrorMessage(error, '내 정보를 바꾸지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <AccountStyle>
        <p className="notice">불러오는 중…</p>
      </AccountStyle>
    );
  if (loadFailed || !account) {
    return (
      <AccountStyle>
        <p className="notice failed">
          {loadFailed ?? '내 정보를 불러오지 못했습니다.'}
        </p>
      </AccountStyle>
    );
  }

  return (
    <AccountStyle>
      <div className="head">
        <p className="title">내 정보</p>
        {!editing && (
          <button type="button" className="edit" onClick={openEdit}>
            수정
          </button>
        )}
      </div>

      {!editing ? (
        <dl className="values">
          <dt>이름</dt>
          <dd>{account.username}</dd>

          <dt>이메일</dt>
          <dd>
            {account.email ?? (
              <span className="empty">
                {providerName
                  ? `${providerName} 계정이라 이메일이 없습니다`
                  : '등록된 이메일이 없습니다'}
              </span>
            )}
          </dd>

          <dt>전화번호</dt>
          <dd>
            {account.phone ? (
              formatPhone(account.phone)
            ) : (
              <span className="empty">등록된 전화번호가 없습니다</span>
            )}
          </dd>
        </dl>
      ) : (
        <form className="form" onSubmit={handleSave}>
          <label htmlFor="account-username">이름</label>
          <input
            id="account-username"
            value={form.username}
            maxLength={50}
            onChange={(e) =>
              setForm((f) => ({ ...f, username: e.target.value }))
            }
            disabled={saving}
          />

          <label htmlFor="account-email">이메일</label>
          {isSocial ? (
            /*
             * 칸을 disabled 로 두지 않고 아예 빼는 이유는, 소셜 계정에는 채울 값이
             * 없어서입니다. 빈 입력칸이 잠겨 있으면 "왜 못 쓰지" 만 남습니다.
             */
            <p className="locked">
              {providerName ?? '소셜'} 로그인 계정은 이메일이 없어 바꿀 수
              없습니다.
            </p>
          ) : (
            <input
              id="account-email"
              type="email"
              value={form.email}
              maxLength={255}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              disabled={saving}
            />
          )}

          <label htmlFor="account-phone">전화번호</label>
          <input
            id="account-phone"
            type="tel"
            value={form.phone}
            placeholder="010-1234-5678"
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            disabled={saving}
          />
          <p className="hint">비워 두면 전화번호를 지웁니다.</p>

          {saveError && <p className="notice failed">{saveError}</p>}

          <div className="actions">
            <button
              type="button"
              className="cancel"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              취소
            </button>
            <button type="submit" className="save" disabled={saving}>
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </form>
      )}
    </AccountStyle>
  );
}

const AccountStyle = styled.div`
  margin-bottom: ${({ theme }) => theme.space.xl};
  padding: ${({ theme }) => theme.space.lg};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.color.surfaceMuted};

  .notice {
    margin: 0;
    font-size: 13px;
    color: ${({ theme }) => theme.color.textMuted};
    text-align: center;
  }

  .notice.failed {
    color: ${({ theme }) => theme.color.danger};
    text-align: left;
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .title {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      color: ${({ theme }) => theme.color.text};
    }

    .edit {
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

  /* 항목 이름과 값을 두 칸으로 세웁니다. 이름 칸은 제일 긴 '전화번호'에 맞춥니다. */
  .values {
    display: grid;
    grid-template-columns: 72px minmax(0, 1fr);
    gap: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
    margin: ${({ theme }) => theme.space.lg} 0 0;

    dt {
      font-size: 13px;
      color: ${({ theme }) => theme.color.textMuted};
    }

    dd {
      margin: 0;
      font-size: 13px;
      color: ${({ theme }) => theme.color.text};
      /* 긴 이메일이 칸을 밀어내지 않게 합니다. */
      overflow-wrap: anywhere;
    }

    .empty {
      color: ${({ theme }) => theme.color.textMuted};
    }
  }

  .form {
    display: flex;
    flex-direction: column;
    margin-top: ${({ theme }) => theme.space.lg};

    label {
      margin-bottom: 4px;
      font-size: 13px;
      color: ${({ theme }) => theme.color.textMuted};
    }

    label + input,
    label + .locked {
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

    .locked {
      margin: 0;
      padding: 8px 10px;
      border: 1px dashed ${({ theme }) => theme.color.border};
      border-radius: ${({ theme }) => theme.radius.sm};
      font-size: 12px;
      color: ${({ theme }) => theme.color.textMuted};
    }

    .hint {
      margin: -${({ theme }) => theme.space.sm} 0 0;
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

export default AccountSection;
