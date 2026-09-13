import { useState } from 'react';
import styled from 'styled-components';
import { withdraw } from '../../apis/auth.api';
import { removeToken, removeUser } from '../../utils/localStorage';
import { apiErrorMessage } from '../../utils/apiError';

/**
 * 회원 탈퇴 칸.
 *
 * confirm() 대신 한 단계를 펼쳐 보여 줍니다. 되돌릴 수 없는 일이라 무엇이
 * 사라지는지 읽고 누르게 하는 편이 맞고, 확인창은 문구가 길어지면 잘립니다.
 */
function WithdrawSection() {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const handleWithdraw = async () => {
    if (sending) return;
    setSending(true);
    try {
      await withdraw();

      /*
       * Redux 의 setLogout 대신 저장소만 비우고 통째로 새로 띄웁니다.
       *
       * 여기는 LoginProtect 안이라, 로그인 상태를 먼저 내리면 화면이 다시 그려지면서
       * "로그인이 필요한 서비스입니다" 가 한 번 더 뜨고 로그인 화면으로 떨어집니다.
       * 방금 탈퇴한 사람에게 로그인을 권하는 꼴입니다.
       *
       * 페이지가 새로 뜨면 authSlice 가 저장소를 보고 비로그인으로 시작하므로
       * 상태는 그때 맞춰집니다.
       */
      alert('탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.');
      removeToken();
      removeUser();
      window.location.replace('/');
    } catch (error) {
      console.error('탈퇴하지 못했습니다:', error);
      alert(apiErrorMessage(error, '탈퇴하지 못했습니다.'));
      setSending(false);
    }
  };

  return (
    <WithdrawStyle>
      {!open ? (
        <button type="button" className="open" onClick={() => setOpen(true)}>
          회원 탈퇴
        </button>
      ) : (
        <div className="confirm">
          <p className="head">정말 탈퇴하시겠어요?</p>
          <ul>
            <li>작성한 글·댓글·후기가 더 이상 보이지 않습니다.</li>
            <li>등록한 반려동물과 즐겨찾기는 삭제됩니다.</li>
            <li>이메일·전화번호·주소는 지워지며 되돌릴 수 없습니다.</li>
          </ul>
          <div className="actions">
            <button
              type="button"
              className="cancel"
              onClick={() => setOpen(false)}
              disabled={sending}
            >
              취소
            </button>
            <button
              type="button"
              className="danger"
              onClick={handleWithdraw}
              disabled={sending}
            >
              {sending ? '처리 중…' : '탈퇴하기'}
            </button>
          </div>
        </div>
      )}
    </WithdrawStyle>
  );
}

const WithdrawStyle = styled.div`
  margin-top: ${({ theme }) => theme.space.xl};
  padding-top: ${({ theme }) => theme.space.lg};
  border-top: 1px solid ${({ theme }) => theme.color.border};

  /* 눌러서 좋을 일이 없는 버튼이라 눈에 먼저 띄지 않게 둡니다. */
  .open {
    padding: 0;
    border: 0;
    background: none;
    font-family: inherit;
    font-size: 12px;
    color: ${({ theme }) => theme.color.textMuted};
    text-decoration: underline;
    cursor: pointer;
  }

  .confirm {
    padding: ${({ theme }) => theme.space.lg};
    border: 1px solid ${({ theme }) => theme.color.border};
    border-radius: ${({ theme }) => theme.radius.sm};
    background-color: ${({ theme }) => theme.color.surfaceMuted};

    .head {
      margin: 0 0 ${({ theme }) => theme.space.sm};
      font-size: 14px;
      font-weight: 700;
      color: ${({ theme }) => theme.color.text};
    }

    ul {
      margin: 0;
      padding-left: 18px;
      font-size: 12px;
      line-height: 1.7;
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

    .danger {
      border: 1px solid ${({ theme }) => theme.color.danger};
      background-color: ${({ theme }) => theme.color.danger};
      color: ${({ theme }) => theme.color.textInverse};
      font-weight: 600;
    }
  }
`;

export default WithdrawSection;
