import { useEffect, useRef, useState } from 'react';
import { BsFileEarmarkRichtextFill } from 'react-icons/bs';
import { FaSearchLocation, FaUser } from 'react-icons/fa';
import { HiBars3, HiXMark } from 'react-icons/hi2';
import { RiLoginBoxFill, RiLogoutBoxFill } from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { RootState } from '../../store';
import { setLogout } from '../../store/slices/authSlice';

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

/**
 * 헤더 오른쪽 햄버거 메뉴.
 *
 * 예전에는 아이콘 3~4개가 그대로 노출돼 있어서, 무엇을 뜻하는지 눌러봐야 알았습니다.
 * 햄버거로 접고 펼쳤을 때 아이콘과 기능 이름을 함께 보여줍니다.
 */
function Menu() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const isLogin = useSelector((state: RootState) => state.auth.isLogin);

  /* 메뉴 밖을 누르거나 Esc 를 누르면 닫습니다. */
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  /* 화면을 옮기면 닫습니다. */
  useEffect(() => setOpen(false), [location.pathname]);

  const handleLogout = () => {
    dispatch(setLogout());
    if (location.pathname === '/myprofile') navigate('/');
  };

  const items: MenuItem[] = [
    {
      key: 'search',
      label: '병원·약국 찾기',
      icon: <FaSearchLocation />,
      onSelect: () => navigate('/search'),
    },
    {
      key: 'posts',
      label: '게시판',
      icon: <BsFileEarmarkRichtextFill />,
      onSelect: () => navigate('/posts'),
    },
    ...(isLogin
      ? [
          {
            key: 'myprofile',
            label: '마이페이지',
            icon: <FaUser />,
            onSelect: () => navigate('/myprofile'),
          },
          {
            key: 'logout',
            label: '로그아웃',
            icon: <RiLogoutBoxFill />,
            onSelect: handleLogout,
          },
        ]
      : [
          {
            key: 'login',
            label: '로그인',
            icon: <RiLoginBoxFill />,
            onSelect: () => navigate('/login'),
          },
        ]),
  ];

  return (
    <Wrap ref={wrapRef}>
      <Toggle
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
        aria-expanded={open}
        aria-controls="header-menu"
      >
        {open ? <HiXMark /> : <HiBars3 />}
      </Toggle>

      {open && (
        <Panel id="header-menu" role="menu">
          {items.map((item) => (
            <Row
              key={item.key}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              <Icon aria-hidden="true">{item.icon}</Icon>
              <span>{item.label}</span>
            </Row>
          ))}
        </Panel>
      )}
    </Wrap>
  );
}

const Wrap = styled.div`
  position: relative;
  justify-self: end;
`;

const Toggle = styled.button`
  display: flex;
  align-items: center;
  padding: 6px;
  border: 0;
  background: none;
  color: ${({ theme }) => theme.color.primary};
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.sm};

  &:hover {
    color: ${({ theme }) => theme.color.text};
    background-color: ${({ theme }) => theme.color.surfaceMuted};
  }
`;

const Panel = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 30;
  min-width: 168px;
  display: flex;
  flex-direction: column;
  padding: 4px;
  background-color: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  box-shadow: ${({ theme }) => theme.shadow.lg};
`;

const Row = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  width: 100%;
  padding: ${({ theme }) => `10px ${theme.space.md}`};
  border: 0;
  background: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.color.text};
  font-family: ${({ theme }) => theme.font.body};
  font-size: 14px;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.color.surfaceMuted};
  }
`;

const Icon = styled.span`
  display: flex;
  align-items: center;
  font-size: 17px;
  color: ${({ theme }) => theme.color.primary};
`;

export default Menu;
