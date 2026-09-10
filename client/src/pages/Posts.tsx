import styled from 'styled-components';
import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HiOutlinePencilSquare } from 'react-icons/hi2';
import PostList from '../components/PostList';
import BoardTabs from '../components/board/BoardTabs';
import BoardHero from '../components/board/BoardHero';
import PaginationComp from '../components/common/PaginationComp';
import { Category, PostState } from '../types/post.type';
import { readBoardState, saveBoardState } from '../utils/boardState';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const POSTS_PER_PAGE = 10;

/**
 * 게시판.
 *
 * 카테고리 탭으로 그 자리에서 분류를 바꾸고(예전에는 카테고리 화면을 거쳐야 했습니다),
 * 페이지 1의 첫 글은 대표 글로 크게 세웁니다. 나머지는 썸네일 목록입니다.
 * 고른 분류는 주소(?categoryId=)에 남겨 새로고침·뒤로가기가 그대로 동작합니다.
 */
function Posts() {
  /*
   * 글을 열었다 돌아왔을 때를 위해 마지막으로 보던 자리를 세션에 남겨둡니다.
   * 첫 렌더에서 한 번만 읽어 초기값으로 쓰고, 이후에는 갱신하지 않습니다.
   */
  const savedRef = useRef(readBoardState());
  const saved = savedRef.current;

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const paramId = Number(searchParams.get('categoryId'));
  const hasParam = Number.isInteger(paramId) && paramId > 0;

  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<PostState[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(() =>
    !hasParam || paramId === saved?.categoryId ? (saved?.page ?? 1) : 1
  );

  /** 주소 > 마지막으로 보던 분류 > 첫 카테고리(통합) 순으로 정합니다. */
  const selectedId = hasParam
    ? paramId
    : (saved?.categoryId ?? categories[0]?.category_id ?? null);

  useEffect(() => {
    axios
      .get<Category[]>(`${BASE_URL}/category`)
      .then((res) => setCategories(res.data))
      .catch((err) => console.error('카테고리를 불러오지 못했습니다:', err));
  }, []);

  useEffect(() => {
    if (selectedId == null) return;

    let alive = true;
    setLoading(true);

    axios
      .get<{ posts: PostState[] }>(
        `${BASE_URL}/category?category=${selectedId}`
      )
      .then((res) => {
        if (alive) setPosts(res.data.posts ?? []);
      })
      .catch((err) => {
        console.error('게시글을 불러오지 못했습니다:', err);
        if (alive) setPosts([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [selectedId]);

  /* 화면을 떠날 때(글 열기 등) 지금 자리를 남깁니다. */
  const positionRef = useRef({ categoryId: selectedId, page: currentPage });
  positionRef.current = { categoryId: selectedId, page: currentPage };

  /*
   * 스크롤 위치는 스크롤할 때마다 기록해 둡니다.
   * 떠날 때 window.scrollY 를 읽으면 이미 다음 화면 기준으로 0 이 돼 있습니다.
   */
  const scrollYRef = useRef(0);
  useEffect(() => {
    const remember = () => {
      scrollYRef.current = window.scrollY;
    };
    window.addEventListener('scroll', remember, { passive: true });
    return () => window.removeEventListener('scroll', remember);
  }, []);

  useEffect(
    () => () => {
      const { categoryId, page } = positionRef.current;
      if (categoryId != null) {
        saveBoardState({ categoryId, page, scrollY: scrollYRef.current });
      }
    },
    []
  );

  /* 돌아온 경우에만 스크롤을 되살립니다. 목록이 그려진 다음이어야 합니다. */
  const scrollRestored = useRef(false);
  useEffect(() => {
    if (scrollRestored.current || loading) return;
    if (!saved || saved.categoryId !== selectedId || saved.scrollY <= 0) return;
    scrollRestored.current = true;
    window.scrollTo(0, saved.scrollY);
  }, [loading, saved, selectedId]);

  const handleTabSelect = (categoryId: number) => {
    setCurrentPage(1);
    setSearchParams({ categoryId: String(categoryId) });
  };

  /*
   * 페이지 단위는 그대로 10개입니다.
   * 1페이지에서만 그중 첫 글을 대표 글로 크게 그리고 나머지 9개를 목록으로 둡니다.
   */
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * POSTS_PER_PAGE;
    return posts.slice(start, start + POSTS_PER_PAGE);
  }, [posts, currentPage]);

  const hero = currentPage === 1 ? pageItems[0] : undefined;
  const rows = hero ? pageItems.slice(1) : pageItems;

  return (
    <Board>
      <BoardTabs
        categories={categories}
        selectedId={selectedId}
        onSelect={handleTabSelect}
      />

      <Toolbar>
        <Count>{loading ? '불러오는 중' : `글 ${posts.length}개`}</Count>
        <WriteBt
          type="button"
          onClick={() => navigate('/createpost')}
          aria-label="글쓰기"
        >
          <HiOutlinePencilSquare size={22} />
        </WriteBt>
      </Toolbar>

      {!loading && posts.length === 0 && (
        <Empty>
          <p>아직 이 분류에 올라온 글이 없어요.</p>
          <button type="button" onClick={() => navigate('/createpost')}>
            첫 글 쓰기
          </button>
        </Empty>
      )}

      {hero && (
        <BoardHero
          post={hero}
          selectedCategoryId={selectedId}
          onClick={(id) => navigate(`/posts/${id}`)}
        />
      )}
      {rows.length > 0 && (
        <PostList post={rows} selectedCategoryId={selectedId} />
      )}

      {posts.length > POSTS_PER_PAGE && (
        <PaginationComp
          totalItemsCount={posts.length}
          itemsCountPerPage={POSTS_PER_PAGE}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      )}
    </Board>
  );
}

const Board = styled.section`
  display: flex;
  flex-direction: column;
  background-color: ${({ theme }) => theme.color.surface};

  /*
   * Layout 이 min-height:100vh + justify-content:space-between 이라,
   * 게시판이 남는 세로 공간을 가져가지 않으면 헤더와 탭 사이가 크게 벌어집니다.
   */
  flex: 1;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.space.sm} ${theme.space.lg}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`;

const Count = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textMuted};
  font-variant-numeric: tabular-nums;
`;

const WriteBt = styled.button`
  display: flex;
  align-items: center;
  padding: ${({ theme }) => theme.space.xs};
  border: 0;
  background: none;
  color: ${({ theme }) => theme.color.primary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.color.primaryHover};
  }
`;

const Empty = styled.div`
  display: grid;
  justify-items: center;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.xxl} ${({ theme }) => theme.space.lg};
  color: ${({ theme }) => theme.color.textMuted};

  p {
    margin: 0;
    font-size: 14px;
  }

  button {
    padding: 7px 16px;
    border-radius: ${({ theme }) => theme.radius.pill};
    border: 1px solid ${({ theme }) => theme.color.borderStrong};
    background-color: ${({ theme }) => theme.color.surface};
    color: ${({ theme }) => theme.color.text};
    font-size: 13px;
    cursor: pointer;

    &:hover {
      background-color: ${({ theme }) => theme.color.surfaceMuted};
    }
  }
`;

export default Posts;
