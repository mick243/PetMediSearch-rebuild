import styled from 'styled-components';
import Menu from './Menu';
import logoLottie from '../../assets/lottie/logoLottie.json';
import Lottie from 'lottie-react';

function Header() {
  return (
    <HeaderStyle>
      <a href="/">
        <Lottie animationData={logoLottie} className="lottie" />
      </a>
      <Menu />
    </HeaderStyle>
  );
}

const HeaderStyle = styled.div`
  display: flex;
  padding: 10px;
  height: 50px;
  justify-content: space-between;
  align-items: center;
  border-bottom: solid;
  margin-bottom: 20px;

  .lottie {
    width: 60px;
  }
`;

export default Header;
