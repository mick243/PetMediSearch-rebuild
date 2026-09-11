import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { HiArrowUturnLeft, HiChevronRight, HiStar } from 'react-icons/hi2';
import {
  addFavorite,
  fetchFavorites,
  removeFavorite,
} from '../apis/favorites.api';
import { FavoriteFacility } from '../types/pet.type';
import { apiErrorMessage } from '../utils/apiError';

/**
 * 즐겨찾기한 병원·약국 목록.
 *
 * 홈의 즐겨찾기 타일에서 들어옵니다. 한 줄을 누르면 지도에서 그 자리로 갑니다 —
 * 즐겨찾기를 다시 찾는 이유는 대개 "거기가 어디였더라" 라서, 주소를 읽는 것보다
 * 지도를 여는 쪽이 답에 가깝습니다.
 */
/** 되돌리기 줄이 떠 있는 시간. 눌러 볼 틈은 주되 화면을 오래 가리지 않는 길이입니다. */
const UNDO_MS = 6000;

function Favorites() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteFacility[]>([]);
  const [loading, setLoading] = useState(true);
  /** 해제 요청이 도는 동안 그 줄의 별만 잠급니다. */
  const [removing, setRemoving] = useState<number | null>(null);
  /** 방금 뺀 곳. 되돌리기 줄에 쓰이고 잠시 뒤 사라집니다. */
  const [undoTarget, setUndoTarget] = useState<FavoriteFacility | null>(null);
  const undoTimer = useRef<number | null>(null);

  /* 되돌리기 줄이 떠 있는 채로 화면을 벗어나면 타이머만 남습니다. */
  useEffect(
    () => () => {
      if (undoTimer.current) window.clearTimeout(undoTimer.current);
    },
    []
  );

  useEffect(() => {
    let alive = true;
    fetchFavorites()
      .then((rows) => alive && setFavorites(rows ?? []))
      .catch((error) => {
        console.error('즐겨찾기 목록을 불러오지 못했습니다:', error);
        if (alive) setFavorites([]);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  /*
   * 빼고 나서 되돌릴 수 있게 합니다.
   *
   * 누를 때마다 확인창을 띄우면 여러 개를 정리할 때 성가십니다. 실수는
   * 되돌리기로 수습하는 편이 눌러 보기에도 가볍습니다.
   */
  const handleRemove = async (f: FavoriteFacility) => {
    setRemoving(f.facility_id);
    try {
      await removeFavorite(f.facility_id);
      setFavorites((prev) =>
        prev.filter((x) => x.facility_id !== f.facility_id)
      );

      setUndoTarget(f);
      if (undoTimer.current) window.clearTimeout(undoTimer.current);
      undoTimer.current = window.setTimeout(() => setUndoTarget(null), UNDO_MS);
    } catch (error: any) {
      console.error('즐겨찾기에서 빼지 못했습니다:', error);
      alert(apiErrorMessage(error, '즐겨찾기에서 빼지 못했습니다.'));
    } finally {
      setRemoving(null);
    }
  };

  const handleUndo = async () => {
    const f = undoTarget;
    if (!f) return;

    setUndoTarget(null);
    if (undoTimer.current) window.clearTimeout(undoTimer.current);

    try {
      await addFavorite(f.facility_id);
      // 목록 순서는 서버가 정합니다(추가한 순). 다시 받아 자리를 맞춥니다.
      const rows = await fetchFavorites();
      setFavorites(rows ?? []);
    } catch (error: any) {
      console.error('되돌리지 못했습니다:', error);
      alert(apiErrorMessage(error, '되돌리지 못했습니다.'));
    }
  };

  /*
   * 좌표는 주소에 실어 보냅니다. 라우터 state 로 넘기면 새로고침하거나 링크를
   * 다시 열었을 때 좌표가 사라져 지도가 기본 위치에서 시작합니다.
   */
  const goToMap = (f: FavoriteFacility) => {
    if (f.lat == null || f.lng == null) {
      navigate('/search');
      return;
    }
    navigate(`/search?lat=${f.lat}&lng=${f.lng}`);
  };

  if (loading) {
    return (
      <Page>
        <Title>즐겨찾기</Title>
        <Muted>불러오는 중…</Muted>
      </Page>
    );
  }

  return (
    <Page>
      <Head>
        <Title>즐겨찾기</Title>
        <Count>{favorites.length}곳</Count>
      </Head>

      {favorites.length === 0 ? (
        <Empty>
          <p>아직 즐겨찾기가 없어요.</p>
          <p className="hint">지도 정보창의 ★ 을 누르면 여기에 모입니다.</p>
          <FindBt type="button" onClick={() => navigate('/search')}>
            지도에서 찾기
          </FindBt>
        </Empty>
      ) : (
        <List>
          {favorites.map((f) => (
            <Row key={f.facility_id}>
              {/* 줄 안에 버튼을 또 넣을 수 없어, 여는 자리와 별을 나란히 둡니다. */}
              <Open type="button" onClick={() => goToMap(f)}>
                <Chip $type={f.type}>{f.type}</Chip>
                <div className="body">
                  <RowTitle>{f.bplcnm}</RowTitle>
                  <RowMeta>
                    {f.rdnwhladdr || f.sitewhladdr || '주소 정보가 없습니다'}
                  </RowMeta>
                  {/* 원본에 좌표가 빠진 시설이 있어, 눌러도 그 자리로 못 간다는 걸 미리 알립니다. */}
                  {(f.lat == null || f.lng == null) && (
                    <RowNote>위치 정보가 없어 지도만 열립니다</RowNote>
                  )}
                </div>
                <HiChevronRight aria-hidden="true" />
              </Open>
              <StarBt
                type="button"
                onClick={() => handleRemove(f)}
                disabled={removing === f.facility_id}
                aria-label={`${f.bplcnm} 즐겨찾기 해제`}
                title="즐겨찾기 해제"
              >
                <HiStar />
              </StarBt>
            </Row>
          ))}
        </List>
      )}

      {undoTarget && (
        <UndoBar role="status">
          <span className="what">{undoTarget.bplcnm}</span>
          <span className="said">즐겨찾기에서 뺐어요</span>
          <button type="button" onClick={handleUndo}>
            <HiArrowUturnLeft aria-hidden="true" /> 되돌리기
          </button>
        </UndoBar>
      )}
    </Page>
  );
}

export default Favorites;

const Page = styled.section`
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: ${({ theme }) => theme.space.md};
  padding: 0 ${({ theme }) => theme.space.lg} ${({ theme }) => theme.space.xl};
  background-color: ${({ theme }) => theme.color.surface};
  font-family: ${({ theme }) => theme.font.body};
`;

const Head = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.sm};
`;

const Title = styled.h1`
  margin: 0;
  font-family: ${({ theme }) => theme.font.body};
  font-size: 17px;
  font-weight: 700;
`;

const Count = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textMuted};
  font-variant-numeric: tabular-nums;
`;

const Muted = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textMuted};
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: ${({ theme }) => theme.space.sm};
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  &:hover {
    background-color: ${({ theme }) => theme.color.surfaceMuted};
  }
`;

const Open = styled.button`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: ${({ theme }) => theme.space.sm};
  align-items: center;
  min-width: 0;
  padding: 12px 0;
  border: 0;
  background: none;
  text-align: left;
  font-family: inherit;
  color: ${({ theme }) => theme.color.textMuted};
  cursor: pointer;

  .body {
    min-width: 0;
  }
`;

/* 지도 정보창의 즐겨찾기 토글과 같은 색을 씁니다 (FavoriteButton). */
const StarBt = styled.button`
  display: flex;
  align-items: center;
  padding: 6px;
  border: 0;
  background: none;
  color: #e0a400;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

const RowTitle = styled.span`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RowMeta = styled.span`
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textMuted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RowNote = styled.span`
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: ${({ theme }) => theme.color.danger};
`;

const Chip = styled.span<{ $type: string }>`
  padding: 1px 7px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  background-color: ${({ $type }) =>
    $type === '병원' ? '#fdecec' : '#e2f5fc'};
  color: ${({ $type }) => ($type === '병원' ? '#c94441' : '#0d3c52')};
`;

/*
 * 되돌리기 줄. 목록이 길어도 보이도록 화면 아래에 띄웁니다.
 * Layout 이 415px 열로 가운데 정렬돼 있어 뷰포트가 아니라 그 열에 맞춥니다
 * (댓글 입력창과 같은 방식).
 */
const UndoBar = styled.div`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  width: 100%;
  max-width: 415px;
  box-sizing: border-box;
  padding: ${({ theme }) => `10px ${theme.space.lg}`};
  background-color: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.textInverse};
  font-size: 13px;

  .what {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }

  .said {
    flex: 1;
    white-space: nowrap;
  }

  button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex: none;
    padding: 5px 10px;
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: ${({ theme }) => theme.radius.pill};
    background: none;
    color: inherit;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  button:hover {
    background-color: rgba(255, 255, 255, 0.15);
  }
`;

const Empty = styled.div`
  display: grid;
  justify-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.xxl} 0;
  text-align: center;

  p {
    margin: 0;
    font-size: 14px;
    color: ${({ theme }) => theme.color.text};
  }

  .hint {
    font-size: 12px;
    color: ${({ theme }) => theme.color.textMuted};
  }
`;

const FindBt = styled.button`
  margin-top: ${({ theme }) => theme.space.sm};
  padding: 10px 18px;
  border: 1px solid ${({ theme }) => theme.color.borderStrong};
  border-radius: ${({ theme }) => theme.radius.pill};
  background-color: ${({ theme }) => theme.color.surface};
  font-family: inherit;
  font-size: 13px;
  color: ${({ theme }) => theme.color.text};
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.color.surfaceMuted};
  }
`;
