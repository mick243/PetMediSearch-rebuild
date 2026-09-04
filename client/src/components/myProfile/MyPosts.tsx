import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { PostState } from '../../types/post.type';
import Programming from '../../assets/images/Programming.png';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getPostsByUserId } from '../../apis/myprofile.api';
import { formatDate } from '../../utils/format';

function MyPosts() {
  const [myPosts, setMyPosts] = useState<PostState[]>([]);
  const navigate = useNavigate();

  const handleClickPost = (post_id: number) => {
    navigate(`/posts/${post_id}`);
  };

  useEffect(() => {
    getPostsByUserId()
      .then((posts) => {
        setMyPosts(posts);
      })
      .catch((error) => {
        console.error('게시글 데이터를 가져오는 중 오류 발생:', error);
      });
  }, []);

  return (
    <MyPostsStyle>
      {myPosts.length === 0 ? (
        <div className="noResults">
          <img src={Programming} />
          <p>등록된 리뷰가 없습니다.</p>
        </div>
      ) : (
        <ul className="posts">
          {myPosts.map((post, index) => (
            <React.Fragment key={index}>
              <li
                className="post"
                onClick={() => handleClickPost(post.post_id)}
              >
                <p>제목: {post.title}</p>
                <p>작성일: {formatDate(post.created_at)}</p>
              </li>
            </React.Fragment>
          ))}
        </ul>
      )}
    </MyPostsStyle>
  );
}

const MyPostsStyle = styled.div`
  .noResults {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 20px;

    img {
      width: 100px;
    }
    p {
      border-top: solid black;
      border-bottom: solid black;
      padding: 10px;
      font-size: 10px;
    }
  }

  .posts {
    padding: 0;
    height: 160px;
    overflow-y: auto;
  }

  .post {
    background-color: #f5f5f5;
    border-bottom: 1px solid #575757;
    padding: 1px;
    font-size: 16px;
    text-align: center;
    cursor: pointer;
    display: flex;
    justify-content: center;
    transition: 0.5s background-color;

    &:hover {
      background-color: #c3c3c3;
    }

    p {
      padding: 0px 5px;
      border-left: 1px solid #575757;
    }
  }
`;

export default MyPosts;
