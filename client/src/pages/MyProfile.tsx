import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { RootState } from '../store';
import MyReview from '../components/myProfile/MyReview';
import MyPosts from '../components/myProfile/MyPosts';
import MyComments from '../components/myProfile/MyComments';
import { SiNaver } from 'react-icons/si';
import { FcGoogle } from 'react-icons/fc';
import { RiKakaoTalkFill } from 'react-icons/ri';
import { FaUser } from 'react-icons/fa';

/**
 * 계정 종류를 보여주는 아이콘.
 * 예전에는 네이버·구글이 아니면 전부 카카오로 떨어져서, 일반 가입 계정까지
 * 카카오로 보였습니다. 제공자는 하나씩 짚고 나머지는 기본 아이콘을 씁니다.
 */
function SocialIcon({ socialType }: { socialType: string }) {
  if (socialType === 'naver') return <SiNaver className="socialIcon naver" />;
  if (socialType === 'google') return <FcGoogle className="socialIcon" />;
  if (socialType === 'kakao')
    return <RiKakaoTalkFill className="socialIcon kakao" />;
  return <FaUser className="socialIcon local" />;
}

function MyProfile() {
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    <MyProfileStyle>
      <div className="userInfo">
        <p className="userType">
          <SocialIcon socialType={user.socialType} />
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
        {/* 글 바로 아래에 둡니다. 둘 다 게시판에서 한 일이라 같이 보는 편이 자연스럽습니다. */}
        <div className="comment">
          <div className="title">
            <p>내가 작성한 댓글</p>
            <a href="/category">카테고리별 게시판으로 이동</a>
          </div>
          <div className="table">
            <MyComments />
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
      .socialIcon {
        width: 50px;
        height: 50px;
        padding: 10px;
        box-sizing: border-box;
        border-radius: 8px;
        border: 1px solid #e3e3e3;
        background-color: #fff;
      }

      .socialIcon.naver {
        color: #fff;
        background-color: #03c75a;
        border-color: #03c75a;
      }

      .socialIcon.kakao {
        color: #191600;
        background-color: #fee500;
        border-color: #fee500;
      }

      /* 일반 가입 계정. 제공자 색이 없으므로 기본 표면 위에 회색 아이콘입니다. */
      .socialIcon.local {
        color: #767676;
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
    /* 안쪽 목록이 칸을 꽉 채워서, 둥근 모서리 밖으로 나가지 않게 잘라 둡니다. */
    overflow: hidden;
  }
`;

export default MyProfile;
