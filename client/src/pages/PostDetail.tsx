import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { PostState } from '../types/post.type';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { addComment } from '../apis/Comment.api';
import { RootState } from '../store';
import Button from '../components/common/Button';
import CommentList from '../comment/CommentList';
import { deletePosts } from '../apis/Posts.api';
import dompurify from 'dompurify';

const BASE_URL = import.meta.env.VITE_BASE_URL;

function PostDetail() {
  const [post, setPost] = useState<PostState>();
  const [content, setContent] = useState<string>('');
  const postId = useParams().id;
  const user = useSelector((state: RootState) => state.auth.user);
  const navigate = useNavigate();
  const sanitizer = dompurify.sanitize;

  const handleDeletePosts = async () => {
    if (window.confirm('게시글을 삭제하시겠습니까?')) {
      try {
        await deletePosts(Number(postId));
        alert('게시글이 삭제되었습니다.');
        navigate('/category');
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleChangePosts = async () => {
    try {
      navigate('/editpost');
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmitButtonClick = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    // 내용
    if (!content.trim() || content === null) {
      return;
    } else {
      try {
        await addComment(user.id, Number(postId), content);
        alert('댓글이 등록되었습니다.');
        setContent('');
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  };

  const handleChangeComment = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  useEffect(() => {
    const fetchPostById = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/posts/${postId}`);
        console.log(response);
        setPost(response.data);
      } catch (error) {
        console.error('Error fetching post:', error);
      }
    };
    fetchPostById();
  }, [postId]);

  return (
    <>
      <div className="bttn">
        <Button
          size="small"
          scheme="positive"
          onClick={() => {
            handleChangePosts;
          }}
        >
          수정
        </Button>
        <Button
          size="small"
          scheme="negative"
          onClick={() => {
            handleDeletePosts();
          }}
        >
          삭제
        </Button>
      </div>
      {post ? (
        <PostsStyle>
          <h3 className="title">제목 : {post.title}</h3>
          <div className="author">작성자 : {post.author}</div>
          <div className="created_at">작성일 : {post.created_at}</div>

          <ContentContainer>
            <div
              className="content"
              dangerouslySetInnerHTML={{
                __html: sanitizer(`${post.content}`),
              }}
            />
          </ContentContainer>
        </PostsStyle>
      ) : (
        <div>게시글이 존재하지 않습니다.</div>
      )}
      <Container>
        <CommentForm onSubmit={handleSubmitButtonClick}>
          <CommentText
            placeholder="댓글을 입력 해주세요."
            onChange={handleChangeComment}
            value={content}
            cols={30}
            wrap="hard"
          />
          <CommentSubmitButtonContainer>
            <Button
              size="small"
              scheme="positive"
              onClick={() => handleSubmitButtonClick}
            >
              등록
            </Button>
          </CommentSubmitButtonContainer>
        </CommentForm>
      </Container>

      <CommentContainer>
        <CommentList />
      </CommentContainer>
    </>
  );
}

export default PostDetail;

const PostsStyle = styled.div`
  height: 110px;
  background-color: #d9d9d9;
  .title {
    margin-left: 10px;
  }

  .author {
    margin-left: 10px;
  }

  .created_at {
    margin-left: 10px;
  }
`;

const ContentContainer = styled.div`
  width: 100%;
  background-color: #d9d9d9;
  height: 70.2vh;
  display: flex;
  overflow-y: auto;

  .content {
    padding: 10px;
    margin-left: 20px;
    margin-top: 20px;
    height: 500px;
    width: 355px;
    background-color: #f5f5f5;
  }
`;

const Container = styled.div`
  background-color: #d9d9d9;
  margin-top: 550px;
  width: 100%;
  height: 100%;
  display: flex;
`;

const CommentContainer = styled.div`
  background-color: #d9d9d9;
  height: 100%;
  width: 415px;

  .contents {
    margin-left: 10px;
  }
`;
const CommentForm = styled.form`
  width: 415px;
  margin: 0 auto;
`;

const CommentText = styled.textarea`
  width: 90%;

  margin-left: 4px;
  margin-bottom: 5px;
  padding: 16px;
  display: flex;
  overflow-y: auto;

  border: 0.5px solid #d0d0d0;
  border-radius: 10px;

  resize: none;

  transition-duration: 0.3s;
`;

const CommentSubmitButtonContainer = styled.div`
  display: flex;
  width: 100%;
`;

// const CommentSubmitButton = styled.button`
//   width: 50px;
//   height: 30px;
//   margin-left: auto;
//   margin-right: 3px;
//   margin-top: 0px;

//   border: 1px solid #d0d0d0;
//   border-radius: 10px;

//   background-color: #fff;
//   color: #262b7f;

//   cursor: pointer;
//   &:hover {
//     background-color: yellow;
//     color: #000000;
//   }
// `;
