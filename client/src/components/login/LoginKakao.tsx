import styled from 'styled-components';
import kakaobttn from '../../assets/images/login/LoginKakao.png';

const K_CLIENT_ID = import.meta.env.VITE_K_REST_API_KEY;
const K_REDIRECT_URI = import.meta.env.VITE_K_REDIRECT_URL;

const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?client_id=${K_CLIENT_ID}&redirect_uri=${K_REDIRECT_URI}&response_type=code`;

function LoginKakao() {
  return (
    <LoginKakaoStyle>
      <a href={KAKAO_AUTH_URL}>
        <div className="kakaobttn">
          <img src={kakaobttn} className="icon" />
        </div>
      </a>
    </LoginKakaoStyle>
  );
}

const LoginKakaoStyle = styled.div`
  .icon {
    border-radius: 8px;
    width: 350px;
    height: 58px;
    box-shadow: 0 5px 10px rgba(0, 0, 0, 0.4);
  }
`;

export default LoginKakao;
