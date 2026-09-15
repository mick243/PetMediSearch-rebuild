import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../store';

interface Props {
  children: JSX.Element;
}

/**
 * 관리자만 지나가는 문. LoginProtect 안쪽에 겹쳐 씁니다.
 *
 * 여기서 막는 것은 화면일 뿐입니다. 주소를 직접 쳐서 들어와도 등록·삭제 요청은
 * 서버가 다시 봅니다(controller/emoticon.js 의 withAdmin — 토큰의 role 이 아니라
 * users 표를 봅니다). 화면만 막아 두면 권한을 거둔 뒤에도 남은 토큰으로 계속
 * 부를 수 있습니다.
 *
 * 로그인 화면이 아니라 마이페이지로 돌려보냅니다. 로그인은 이미 돼 있고 권한만
 * 없는 상태라, 로그인 화면을 다시 띄우면 무엇이 잘못됐는지 알 수 없습니다.
 */
function AdminProtect({ children }: Props) {
  const role = useSelector((state: RootState) => state.auth.user.role);
  const navigate = useNavigate();
  const isAdmin = role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      alert('관리자만 볼 수 있는 화면입니다.');
      navigate('/myprofile', { replace: true });
    }
  }, [isAdmin, navigate]);

  return isAdmin ? children : null;
}

export default AdminProtect;
