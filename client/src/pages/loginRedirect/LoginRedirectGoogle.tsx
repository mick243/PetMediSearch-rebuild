import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Lottie from 'lottie-react';
import loadingLottie from '../../assets/lottie/loadingLottie.json';
import { setLogin } from '../../store/slices/authSlice';
import { useDispatch } from 'react-redux';

const BASE_URL = import.meta.env.VITE_BASE_URL;
function LoginRedirectGoogle() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const code = new URL(window.location.href).searchParams.get('code');

  useEffect(() => {
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
  }, [code, dispatch, navigate]);

  return (
    <LoginRedirectGoogleStyle>
      <Lottie animationData={loadingLottie} className="lottie" />
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

  .lottie {
    width: 300px;
  }
  p {
    font-size: 20px;
    text-align: center;
  }
`;

export default LoginRedirectGoogle;
