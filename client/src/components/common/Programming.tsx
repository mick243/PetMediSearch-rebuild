import styled from 'styled-components';
import { MdConstruction } from 'react-icons/md';

function Programming() {
  return (
    <ProgrammingStyle>
      <MdConstruction className="stateIcon" />
      <p>아직 개발 중인 기능입니다.</p>
      <a href="/">메인으로 이동</a>
    </ProgrammingStyle>
  );
}

const ProgrammingStyle = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  .stateIcon {
    width: 96px;
    height: 96px;
    color: #9e9e9e;
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
