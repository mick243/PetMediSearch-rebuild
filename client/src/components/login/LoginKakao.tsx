import styled from 'styled-components';
import { RiKakaoTalkFill } from 'react-icons/ri';

const K_CLIENT_ID = import.meta.env.VITE_K_REST_API_KEY;
const K_REDIRECT_URI = import.meta.env.VITE_K_REDIRECT_URL;

const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?client_id=${K_CLIENT_ID}&redirect_uri=${K_REDIRECT_URI}&response_type=code`;

function LoginKakao() {
  return (
    <LoginKakaoStyle>
      <a href={KAKAO_AUTH_URL}>
        <div className="kakaobttn">
          <RiKakaoTalkFill className="icon" />
          <p className="messge">카카오 로그인</p>
        </div>
      </a>
    </LoginKakaoStyle>
  );
}

const LoginKakaoStyle = styled.div`
  a {
    text-decoration: none;
  }

  .kakaobttn {
    width: 350px;
    height: 58px;
    box-sizing: border-box;
    background-color: #fee500;
    border-radius: 8px;
    display: flex;
    gap: 78px;
    align-items: center;
    color: #191600;
    font-size: 18px;
    box-shadow: 0 5px 10px rgba(0, 0, 0, 0.4);
    font-family: initial;

    .icon {
      width: 26px;
      height: 26px;
      margin: 0 12px;
      flex-shrink: 0;
    }
  }
`;

export default LoginKakao;
