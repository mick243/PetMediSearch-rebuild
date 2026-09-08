import { useRouteError } from 'react-router-dom';
import styled from 'styled-components';
import { MdErrorOutline } from 'react-icons/md';

interface RouteError {
  statusText?: string;
  message?: string;
}

function Error() {
  const error = useRouteError() as RouteError;
  return (
    <ErrorStyle>
      <MdErrorOutline className="stateIcon" />
      <div className="error">
        <h3>Error!</h3>
        <h6>{error.message}</h6>
      </div>
      <a href="/">메인으로 이동</a>
    </ErrorStyle>
  );
}

const ErrorStyle = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: white;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
  min-height: 100vh;

  .stateIcon {
    width: 96px;
    height: 96px;
    color: #e44c4c;
  }
  div {
    border-top: solid black;
    border-bottom: solid black;
    padding: 10px;
    font-size: 20px;
    text-align: center;
  }

  a {
    font-size: 10px;
    color: grey;
    text-decoration: none;
    padding: 10px;
  }

  a:hover {
    color: black;
    text-decoration: none;
  }
`;

export default Error;
