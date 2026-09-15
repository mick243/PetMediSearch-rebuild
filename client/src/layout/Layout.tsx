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
      {children}
      <Footer />
    </LayoutStyle>
  );
}

const LayoutStyle = styled.div`
  background-color: white;
  max-width: 415px;
  margin-left: auto;
  margin-right: auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

export default Layout;
