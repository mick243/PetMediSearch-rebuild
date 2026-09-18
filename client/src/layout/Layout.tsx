import Footer from '../components/common/Footer';
import Header from '../components/common/Header';
import PullToRefresh from '../components/common/PullToRefresh';
import styled from 'styled-components';

interface LayoutProps {
  children: React.ReactNode;
}

function Layout({ children }: LayoutProps) {
  return (
    <LayoutStyle>
      <PullToRefresh />
      <Header />
      <Main>{children}</Main>
      <Footer />
    </LayoutStyle>
  );
}

/*
 * justify-content: space-between 이었습니다.
 *
 * 열이 화면 높이(100vh)만큼 잡히는데 내용이 그보다 짧으면, 남는 세로 공간이
 * 헤더·내용·푸터 사이에 고루 나뉘었습니다. 그래서 짧은 화면일수록 헤더 밑이
 * 크게 비고 내용이 화면 한가운데로 떠내려갔습니다 — 후기 화면에서 헤더 아래
 * 266px, 홈에서는 목록과 검색창 사이가 365px(화면의 39%)이었습니다.
 *
 * 남는 공간은 전부 내용 칸이 먹고, 푸터는 그 아래 바닥에 붙습니다.
 * 화면을 꽉 채우려던 쪽(pages/Search.tsx)은 이미 flex: 1 을 쓰고 있어 그대로입니다.
 */
const LayoutStyle = styled.div`
  background-color: white;
  max-width: 415px;
  margin-left: auto;
  margin-right: auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Main = styled.main`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

export default Layout;
