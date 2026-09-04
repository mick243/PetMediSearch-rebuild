import React from 'react';
import Pagination from 'react-js-pagination';
import styled from 'styled-components';

interface PaginationProps {
  totalItemsCount: number; // 전체 항목 수
  itemsCountPerPage: number; // 페이지 당 항목 수
  currentPage: number; // 현재 페이지
  onPageChange: (pageNumber: number) => void; // 페이지 변경 시 호출될 함수
}

const PaginationComp: React.FC<PaginationProps> = ({
  totalItemsCount,
  itemsCountPerPage,
  currentPage,
  onPageChange,
}) => {
  return (
    <PaginationWrapper>
      <Pagination
        activePage={currentPage}
        itemsCountPerPage={itemsCountPerPage}
        totalItemsCount={totalItemsCount}
        pageRangeDisplayed={1}
        onChange={onPageChange}
        prevPageText={'<'}
        nextPageText={'>'}
        firstPageText={'<<'}
        lastPageText={'>>'}
      />
    </PaginationWrapper>
  );
};

const PaginationWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin: 20px 0;

  .pagination {
    display: flex;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .pagination li {
    margin: 0 5px;
  }

  .pagination li a {
    padding: 6px 25px;
    background-color: #e3e3e3;
    border-radius: 16px;
    color: #575757;
    text-decoration: none;
    cursor: pointer;
    transition:
      background-color 0.3s,
      color 0.3s;
  }

  .pagination li.active a {
    background-color: #575757;
    color: white;
  }

  .pagination li.disabled a {
    color: #575757;
    pointer-events: none;
  }

  .pagination li a:hover {
    background-color: #c3c3c3;
    color: white;
  }
`;

export default PaginationComp;
