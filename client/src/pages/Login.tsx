import styled from 'styled-components';
import LoginKakao from '../components/login/LoginKakao';
import LoginNaver from '../components/login/LoginNaver';
import LoginGoogle from '../components/login/LoginGoogle';

function Login() {
  return (
    <LoginStyle>
      <LoginKakao />
      <LoginNaver />
      <LoginGoogle />
    </LoginStyle>
  );
}

const LoginStyle = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 10px;
`;

export default Login;
