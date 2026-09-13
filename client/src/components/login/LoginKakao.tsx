import { MouseEvent } from 'react';
import styled from 'styled-components';
import { RiKakaoTalkFill } from 'react-icons/ri';
import { issueOAuthState } from '../../utils/oauthState';

const K_CLIENT_ID = import.meta.env.VITE_K_REST_API_KEY;
const K_REDIRECT_URI = import.meta.env.VITE_K_REDIRECT_URL;

const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?client_id=${K_CLIENT_ID}&redirect_uri=${K_REDIRECT_URI}&response_type=code`;

/*
 * state 는 여기서 만들어 sessionStorage 에 넣고 함께 보냅니다.
 * 모듈이 읽힐 때 한 번 만들면 탭을 열어 둔 내내 같은 값이 쓰입니다.
 */
function go(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  const state = issueOAuthState('kakao');
  window.location.href = `${KAKAO_AUTH_URL}&state=${state}`;
}

function LoginKakao() {
  return (
    <LoginKakaoStyle>
      <a href={KAKAO_AUTH_URL} onClick={go}>
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
    /* 화면 틀이 415px 라 좁은 기기에서는 350px 를 다 못 씁니다. */
    max-width: 100%;
    height: 58px;
    box-sizing: border-box;
    background-color: #fee500;
    border-radius: 8px;
    display: flex;
    gap: 78px;
    align-items: center;
    color: #191600;
    font-size: 18px;
    box-shadow: ${({ theme }) => theme.shadow.md};
    font-family: ${({ theme }) => theme.font.body};

    .icon {
      width: 26px;
      height: 26px;
      margin: 0 12px;
      flex-shrink: 0;
    }
  }
`;

export default LoginKakao;
