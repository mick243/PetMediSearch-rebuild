import styled from 'styled-components';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import loadingLottie from '../../assets/lottie/loadingLottie.json';
import { useDispatch } from 'react-redux';
import { setLogin } from '../../store/slices/authSlice';

const BASE_URL = import.meta.env.VITE_BASE_URL;
function LoginRedirectNaver() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const code = new URL(window.location.href).searchParams.get('code');
  const state = new URL(window.location.href).searchParams.get('state');

  useEffect(() => {
    fetch(`${BASE_URL}/auth/naver?code=${code}&state=${state}`, {
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
        console.error('Naver login failed:', error);
        navigate('/login');
      });
  }, [code, state, navigate, dispatch]);

  return (
    <LoginRedirectNaverStyle>
      <Lottie animationData={loadingLottie} className="lottie" />
      <p>
        네이버 아이디로 간편 로그인 중입니다.
        <br />
        잠시만 기다려주세요.
      </p>
    </LoginRedirectNaverStyle>
  );
}

const LoginRedirectNaverStyle = styled.div`
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

export default LoginRedirectNaver;
