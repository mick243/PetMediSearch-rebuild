import styled from 'styled-components';
import Menu from '../components/common/Menu';
import Logo from '../components/common/Logo';

function Home() {
  return (
    <HomeStyle>
      <h1>PetMediSearch</h1>
      <Logo className="logo" />
      <nav>
        <Menu />
      </nav>
    </HomeStyle>
  );
}

const HomeStyle = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: white;
  max-width: 415px;
  margin-left: auto;
  margin-right: auto;
  min-height: 100vh;

  h1 {
    font-family: ${({ theme }) => theme.font.display};
    font-size: 34px;
    font-weight: normal;
    letter-spacing: 0.5px;
    color: ${({ theme }) => theme.color.text};
    margin: 0 0 ${({ theme }) => theme.space.sm};
  }

  .logo {
    width: 160px;
    margin-bottom: 20px;
  }
`;

export default Home;
