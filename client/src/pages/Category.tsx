import { useEffect, useState } from 'react';
import axios from 'axios';
import { Category } from '../types/post.type';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const BASE_URL = import.meta.env.VITE_BASE_URL;

function Categories() {
  const [category, setCategory] = useState<Category[]>();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      console.log('base: ', BASE_URL);
      const response = await axios.get(`${BASE_URL}/category`);
      setCategory(response.data);
    };
    fetchData();
  }, []);

  const handleCategoryClick = (id) => {
    if (id == 12) {
      navigate(`/review`);
    } else {
      navigate(`/posts?categoryId=${id}`); // 해당 카테고리 ID로 URL 변경
    }
  };

  return (
    <CategoryItems>
      {category?.map((item) => (
        <button
          className="button"
          key={item.category_id}
          onClick={() => handleCategoryClick(item.category_id)}
        >
          {item.category_name}
        </button>
      ))}
    </CategoryItems>
  );
}
export default Categories;

const CategoryItems = styled.div`
  margin-left: 37px;
  .button {
    width: 85px;
    height: 85px;
    background-color: #d9d9d9;
    margin: 15px;
    border-radius: 16px;
    box-shadow:
      0 10px 20px rgba(0, 0, 0, 0.19),
      0 4px 4px rgba(0, 0, 0, 0.23);

    &:hover {
      background-color: #bbbbbb;
    }
  }
`;
