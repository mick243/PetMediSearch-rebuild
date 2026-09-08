import styled from 'styled-components';
import Menu from './Menu';
import Logo from './Logo';

function Header() {
  return (
    <HeaderStyle>
      <a href="/">
        <Logo className="logo" />
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

  .logo {
    width: 38px;
  }
`;

export default Header;
