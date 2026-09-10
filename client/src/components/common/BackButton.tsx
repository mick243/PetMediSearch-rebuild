import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { HiChevronLeft } from 'react-icons/hi2';

interface Props {
  /** 앱 안에서 온 기록이 없을 때(주소 직접 입력·공유 링크) 갈 곳. */
  fallback?: string;
  /** 스크린리더용 이름. 글자를 그리지 않을 때도 필요합니다. */
  label?: string;
  /** 아이콘 옆 글자. 비우면 아이콘만 그립니다. */
  children?: React.ReactNode;
}

/**
 * 뒤로가기.
 *
 * react-router 가 history.state.idx 에 앱 안에서의 방문 순서를 남깁니다.
 * 0 보다 크면 앱 안에서 넘어온 것이라 브라우저 기록으로 되돌아가고,
 * 그렇지 않으면(링크를 직접 열었을 때) 게시판으로 보냅니다.
 * 기록으로 돌아가면 목록이 저장해 둔 분류·페이지·스크롤을 그대로 되살립니다.
 */
export default function BackButton({
  fallback = '/posts',
  label = '뒤로',
  children,
}: Props) {
  const navigate = useNavigate();

  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  };

  return (
    <Bt type="button" onClick={goBack} aria-label={label} $iconOnly={!children}>
      <HiChevronLeft size={22} aria-hidden="true" />
      {children && <span>{children}</span>}
    </Bt>
  );
}

const Bt = styled.button<{ $iconOnly: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: ${({ $iconOnly }) => ($iconOnly ? '6px' : '6px 10px 6px 6px')};
  border: 0;
  background: none;
  color: ${({ theme }) => theme.color.textMuted};
  font-family: ${({ theme }) => theme.font.body};
  font-size: 13px;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.sm};

  &:hover {
    color: ${({ theme }) => theme.color.text};
    background-color: ${({ theme }) => theme.color.surfaceMuted};
  }
`;
