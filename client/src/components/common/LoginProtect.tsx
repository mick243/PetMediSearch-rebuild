import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: JSX.Element;
}

function LoginProtect({ children }: Props) {
  const isLogin = useSelector((state: RootState) => state.auth.isLogin);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLogin) {
      alert('로그인이 필요한 서비스입니다'); // 알림 표시
      navigate('/login'); // 메인 페이지로 이동
    }
  }, [isLogin, navigate]);

  return isLogin ? children : null;
}

export default LoginProtect;
