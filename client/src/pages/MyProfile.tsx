import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { RootState } from '../store';
import MyReview from '../components/myProfile/MyReview';
import MyPosts from '../components/myProfile/MyPosts';
import Naver from '../assets/images/login/LoginNaver.png';
import Google from '../assets/images/login/LoginGoogle.png';
import Kakao from '../assets/images/login/Kakao.png';

function MyProfile() {
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    <MyProfileStyle>
      <div className="userInfo">
        <p className="userType">
          {user.socialType === 'naver' ? (
            <img src={Naver} />
          ) : user.socialType === 'google' ? (
            <img src={Google} />
          ) : (
            <img src={Kakao} />
          )}
        </p>
        <p className="userName">{user.username}</p>
      </div>
      <div className="userSection">
        <div className="post">
          <div className="title">
            <p>내가 작성한 게시판 글</p>
            <a href="/category">카테고리별 게시판으로 이동</a>
          </div>
          <div className="table">
            <MyPosts />
          </div>
        </div>
        <div className="review">
          <div className="title">
            <p>내가 작성한 후기 글</p>
            <a href="/review">후기 게시판으로 이동</a>
          </div>
          <div className="table">
            <MyReview />
          </div>
        </div>
      </div>
    </MyProfileStyle>
  );
}

const MyProfileStyle = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0px 30px 20px 30px;

  .userInfo {
    display: flex;
    gap: 5px;
    align-items: center;
    .userType {
      img {
        width: 50px;
        height: 50px;
        border-radius: 8px;
        border: 1px solid #e3e3e3;
      }
    }

    .userName {
      font-size: 30px;
    }
  }

  .userSection {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .title {
    font-size: 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    p {
      margin: 3px;
    }

    a {
      font-size: 12px;
      color: #464646;
      text-decoration: none;
      font-weight: bold;
    }

    a:hover {
      color: #c6cdbe;
    }
  }

  .table {
    border: 1px solid #e3e3e3;
    border-radius: 8px;
    height: 200px;
  }
`;

export default MyProfile;
