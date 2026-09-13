import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Spinner from '../../components/common/Spinner';
import { setLogin } from '../../store/slices/authSlice';
import { verifyOAuthState } from '../../utils/oauthState';
import { useDispatch } from 'react-redux';

const BASE_URL = import.meta.env.VITE_BASE_URL;
function LoginRedirectGoogle() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const code = new URL(window.location.href).searchParams.get('code');
  const state = new URL(window.location.href).searchParams.get('state');

  useEffect(() => {
    /*
     * 나갈 때 만든 state 와 같은 값이 돌아왔는지 봅니다.
     * 다르면 내가 시작한 로그인이 아니므로 코드를 서버에 넘기지 않습니다.
     */
    if (!verifyOAuthState('google', state)) {
      console.error('google: state 가 맞지 않습니다.');
      alert('로그인을 다시 시도해주세요.');
      navigate('/login', { replace: true });
      return;
    }

    fetch(`${BASE_URL}/auth/google?code=${code}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.token) {
          dispatch(
            setLogin({
              token: data.token,
              user: data.user,
            })
          );
          navigate('/myprofile');
        } else {
          throw new Error('Login failed');
        }
      })
      .catch((error) => {
        console.error('Google login failed:', error);
        navigate('/login');
      });
  }, [code, state, dispatch, navigate]);

  return (
    <LoginRedirectGoogleStyle>
      <Spinner />
      <p>
        구글 아이디로 간편 로그인 중입니다.
        <br />
        잠시만 기다려주세요.
      </p>
    </LoginRedirectGoogleStyle>
  );
}

const LoginRedirectGoogleStyle = styled.div`
  display: flex;
  flex-direction: column;
  background-color: white;
  margin-left: auto;
  margin-right: auto;

  p {
    font-size: 20px;
    text-align: center;
  }
`;

export default LoginRedirectGoogle;
