import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { RootState } from '../../store';

/**
 * 관리자 전용 화면으로 가는 길.
 *
 * 관리자가 아니면 스스로 아무것도 그리지 않습니다 (PasswordSection 과 같은 방식).
 * 화면에서 감추는 것은 헷갈리지 않게 하려는 것일 뿐이고, 실제로 막는 것은
 * 서버입니다 — 등록·삭제는 users 표에서 role 을 다시 봅니다.
 */
function AdminMenu() {
  const role = useSelector((state: RootState) => state.auth.user.role);
  if (role !== 'admin') return null;

  return (
    <AdminMenuStyle>
      <p className="title">관리자</p>
      <Link to="/myprofile/emoticons" className="item">
        <span>
          이모티콘 관리
          <em>댓글에 넣는 이모티콘을 올리고 지웁니다</em>
        </span>
        <span aria-hidden="true">›</span>
      </Link>
    </AdminMenuStyle>
  );
}

export default AdminMenu;

const AdminMenuStyle = styled.div`
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

  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ theme }) => theme.space.md};
    margin-top: ${({ theme }) => theme.space.md};
    padding: ${({ theme }) => theme.space.md};
    border: 1px solid ${({ theme }) => theme.color.border};
    border-radius: ${({ theme }) => theme.radius.sm};
    background-color: ${({ theme }) => theme.color.surface};
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.color.text};

    em {
      display: block;
      margin-top: 2px;
      font-style: normal;
      font-size: 12px;
      font-weight: 400;
      color: ${({ theme }) => theme.color.textMuted};
    }

    &:hover {
      background-color: ${({ theme }) => theme.color.surfaceMuted};
    }
  }
`;
