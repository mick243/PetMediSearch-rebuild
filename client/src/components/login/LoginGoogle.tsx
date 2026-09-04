import styled from 'styled-components';
import googlebttn from '../../assets/images/login/LoginGoogle.png';

const G_CLIENT_ID = import.meta.env.VITE_G_REST_API_KEY;
const G_REDIRECT_URI = import.meta.env.VITE_G_REDIRECT_URL;

const GOOGLE_AUTH_URL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${G_CLIENT_ID}&redirect_uri=${G_REDIRECT_URI}&response_type=code&scope=email profile`;

function LoginGoogle() {
  return (
    <LoginGoogleStyle>
      <a href={GOOGLE_AUTH_URL}>
        <div className="googlebttn">
          <img src={googlebttn} className="icon" />
          <p className="messge">구글 로그인</p>
        </div>
      </a>
    </LoginGoogleStyle>
  );
}

const LoginGoogleStyle = styled.div`
  a {
    text-decoration: none;
  }

  .googlebttn {
    width: 350px;
    background-color: white;
    border-radius: 8px;
    display: flex;
    gap: 85px;
    align-items: center;
    color: black;
    font-size: 18px;
    margin-top: 5px;
    box-shadow: 0 5px 10px rgba(0, 0, 0, 0.4);
    color: #989898;
    font-family: initial;

    .icon {
      width: 50px;
      padding: 5px;
    }
  }
`;

export default LoginGoogle;
