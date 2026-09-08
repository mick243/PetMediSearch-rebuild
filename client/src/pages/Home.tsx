import styled from 'styled-components';
import Menu from '../components/common/Menu';
import Logo from '../components/common/Logo';

function Home() {
  return (
    <HomeStyle>
      <p>PetMediSearch</p>
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

  p {
    font-style: italic;
    font-size: 30px;
    margin: 0;
  }

  .logo {
    width: 160px;
    margin-bottom: 20px;
  }
`;

export default Home;
