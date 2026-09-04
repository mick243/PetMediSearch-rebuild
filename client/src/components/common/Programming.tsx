import styled from 'styled-components';

function Programming() {
  return (
    <ProgrammingStyle>
      <img src={'../src/assets/images/Programming.png'} />
      <p>아직 개발 중인 기능입니다.</p>
      <a href="/">메인으로 이동</a>
    </ProgrammingStyle>
  );
}

const ProgrammingStyle = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  img {
    width: 200px;
  }
  p {
    border-top: solid black;
    border-bottom: solid black;
    padding: 10px;
    font-size: 20px;
  }

  a {
    font-size: 10px;
    color: grey;
    text-decoration: none;
  }

  a:hover {
    color: black;
    text-decoration: none;
  }
`;

export default Programming;
