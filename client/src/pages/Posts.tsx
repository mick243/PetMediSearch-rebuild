import styled from 'styled-components';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Post from '../components/PostList';
import { useLocation, useNavigate } from 'react-router-dom';
import { PostState } from '../types/post.type';
import { HiOutlinePencilSquare } from 'react-icons/hi2';
import PaginationComp from '../components/common/PaginationComp';

const BASE_URL = import.meta.env.VITE_BASE_URL;
function Posts() {
  const [posts, setPosts] = useState<PostState[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 10;
  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentPosts = posts.slice(indexOfFirstPost, indexOfLastPost);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleWriteNaviageClick = () => {
    navigate('/createpost');
  };
  const categoryId = new URLSearchParams(location.search).get('categoryId');

  useEffect(() => {
    const fetchPostsByCategory = async () => {
      if (categoryId) {
        try {
          const response = await axios.get(
            `${BASE_URL}/category?category=${categoryId}`
          );
          setPosts(response.data.posts);
        } catch (error) {
          console.error('Error fetching posts:', error);
        }
      }
    };
    fetchPostsByCategory();
  }, [categoryId]);

  return (
    <>
      <WriteContainer>
        <WriteBt onClick={handleWriteNaviageClick}>
          <HiOutlinePencilSquare size={40} />
        </WriteBt>
      </WriteContainer>
      {currentPosts && currentPosts.length > 0 ? (
        <ul>
          <Post post={posts} />
        </ul>
      ) : (
        <p>게시글이 없습니다.</p>
      )}
      <PaginationComp
        totalItemsCount={posts.length}
        itemsCountPerPage={postsPerPage}
        currentPage={currentPage}
        onPageChange={handlePageChange}
      />
    </>
  );
}

const WriteContainer = styled.div`
  margin-left: auto;
  margin-right: 20px;
`;

const WriteBt = styled.div`
  width: 35px;
  height: 35px;
  padding: 5px;
  cursor: pointer;
`;

export default Posts;
