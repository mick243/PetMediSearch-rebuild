import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import Menu from './Menu';
import BackButton from './BackButton';
// import Logo from './Logo';

/**
 * 공용 헤더.
 *
 * 왼쪽 뒤로가기 · 가운데 브랜드명 · 오른쪽 햄버거 메뉴.
 * 양옆을 같은 폭(1fr)으로 두어 브랜드명이 화면 정중앙에 오게 합니다.
 */
function Header() {
  /* 홈에서는 돌아갈 곳이 없으니 뒤로가기를 비웁니다. 칸은 남겨 브랜드명이 가운데를 지킵니다. */
  const isHome = useLocation().pathname === '/';

  return (
    <HeaderStyle>
      <Side>{!isHome && <BackButton fallback="/" label="뒤로 가기" />}</Side>

      {/* 로고 마크는 브랜드명으로 대체했습니다. 되살리려면 아래 주석을 풀어주세요.
      <Link to="/">
        <Logo className="logo" />
      </Link> */}
      <Brand to="/">PetMediSearch</Brand>

      <Menu />
    </HeaderStyle>
  );
}

const HeaderStyle = styled.header`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  /* 높이·여백은 기존 헤더 그대로 둡니다. 다른 화면들의 간격이 바뀌지 않도록. */
  padding: 10px;
  height: 50px;
  margin-bottom: 20px;
  background-color: ${({ theme }) => theme.color.surface};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  box-shadow: ${({ theme }) => theme.shadow.sm};

  .logo {
    width: 38px;
  }
`;

const Side = styled.div`
  display: flex;
  align-items: center;
  justify-self: start;
  min-width: 0;
`;

const Brand = styled(Link)`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 20px;
  line-height: 1;
  color: ${({ theme }) => theme.color.text};
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.color.primaryHover};
  }
`;

export default Header;
