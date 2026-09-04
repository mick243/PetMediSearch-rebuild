import { BsFileEarmarkRichtextFill } from 'react-icons/bs';
import { FaSearchLocation, FaUser } from 'react-icons/fa';
import { RiLoginBoxFill, RiLogoutBoxFill } from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { RootState } from '../../store';
import { setLogout } from '../../store/slices/authSlice';

function Menu() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const isLogin = useSelector((state: RootState) => state.auth.isLogin);

  const handleSearchClick = () => {
    navigate('/search');
  };
  const handlePostsClick = () => {
    navigate('/category');
  };
  const handleMyProfileClick = () => {
    navigate('/myprofile');
  };
  const handleLoginClick = () => {
    navigate('/login');
  };
  const handleLogoutClick = () => {
    dispatch(setLogout());
    if (location.pathname === '/myprofile') {
      navigate('/');
    }
  };

  return (
    <MenuStyle>
      <nav className="menu">
        <p>
          <FaSearchLocation onClick={handleSearchClick} />
        </p>
        <p>
          <BsFileEarmarkRichtextFill onClick={handlePostsClick} />
        </p>
        {isLogin && (
          <p>
            <FaUser onClick={handleMyProfileClick} />
          </p>
        )}
        {isLogin ? (
          <p>
            <RiLogoutBoxFill onClick={handleLogoutClick} />
          </p>
        ) : (
          <p>
            <RiLoginBoxFill onClick={handleLoginClick} />
          </p>
        )}
      </nav>
    </MenuStyle>
  );
}

const MenuStyle = styled.div`
  .menu {
    display: flex;
    gap: 10px;

    p {
      cursor: pointer;
      font-size: 30px;
      border-left: solid;
      border-right: solid;
      padding: 10px;
      display: flex;
      align-items: center;
      transition: color 0.3s;
    }

    p:hover {
      color: #575757;
    }
  }
`;

export default Menu;
