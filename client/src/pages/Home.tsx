import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { HiChevronRight, HiMagnifyingGlass, HiPlus } from 'react-icons/hi2';
import { RootState } from '../store';
import { Pet, FavoriteFacility } from '../types/pet.type';
import { PostState } from '../types/post.type';
import { fetchMyPets } from '../apis/pets.api';
import { fetchFavorites } from '../apis/favorites.api';
import { timeAgo } from '../utils/postContent';

const BASE_URL = import.meta.env.VITE_BASE_URL;

/** 분류별 대표 이모지. 사진 업로드가 없어 이걸로 얼굴을 대신합니다. */
const FACE: Record<number, string> = {
  2: '🐕',
  3: '🐈',
  4: '🐹',
  5: '🐸',
  6: '🐢',
  7: '🐦',
  8: '🐟',
};

/** 생일 → "3살" / "7개월" */
function ageOf(birth: string | null): string | null {
  if (!birth) return null;
  const b = new Date(birth);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let months =
    (now.getFullYear() - b.getFullYear()) * 12 +
    (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 12) return `${Math.max(months, 0)}개월`;
  return `${Math.floor(months / 12)}살`;
}

/** 오늘 기준 D-day. 지난 날짜는 음수. */
function daysUntil(date: string): number {
  const d = new Date(date);
  const today = new Date();
  d.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

/**
 * 홈.
 *
 * 로그인 + 반려동물이 있으면 그 아이가 주인공입니다(H안).
 * 접종 D-day · 단골 병원 · 같은 분류 게시글을 붙이고, 검색은 아래로 내립니다.
 * 로그인 전이거나 아직 등록한 아이가 없으면 등록을 권하는 화면을 보여줍니다.
 */
function Home() {
  const navigate = useNavigate();
  const isLogin = useSelector((s: RootState) => s.auth.isLogin);
  const user = useSelector((s: RootState) => s.auth.user);

  const [pets, setPets] = useState<Pet[]>([]);
  const [petIndex, setPetIndex] = useState(0);
  const [favorites, setFavorites] = useState<FavoriteFacility[]>([]);
  const [posts, setPosts] = useState<PostState[]>([]);
  const [loading, setLoading] = useState(isLogin);

  const pet = pets[petIndex];

  useEffect(() => {
    if (!isLogin) {
      setPets([]);
      setFavorites([]);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    Promise.all([fetchMyPets(), fetchFavorites()])
      .then(([p, f]) => {
        if (!alive) return;
        setPets(p);
        setFavorites(f);
        setPetIndex(0);
      })
      .catch((err) => console.error('홈 데이터를 불러오지 못했습니다:', err))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [isLogin]);

  /* 게시글: 아이의 분류가 있으면 그 분류, 없으면 통합(전체) */
  const postCategory = pet?.category_id ?? 1;
  useEffect(() => {
    let alive = true;
    axios
      .get<{ posts: PostState[] }>(
        `${BASE_URL}/category?category=${postCategory}`
      )
      .then((res) => alive && setPosts((res.data.posts ?? []).slice(0, 3)))
      .catch(() => alive && setPosts([]));
    return () => {
      alive = false;
    };
  }, [postCategory]);

  /* 다가오는 접종: 완료되지 않은 것 중 가장 이른 것 */
  const nextVacc = useMemo(() => {
    if (!pet) return null;
    const pending = pet.vaccinations
      .filter((v) => !v.done)
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
    return pending[0] ?? null;
  }, [pet]);

  const dday = nextVacc ? daysUntil(nextVacc.due_date) : null;

  if (loading) {
    return (
      <Page>
        <Muted>불러오는 중…</Muted>
      </Page>
    );
  }

  return (
    <Page>
      {/* ── 주인공 ── */}
      {pet ? (
        <>
          <PetTabs role="tablist" aria-label="내 반려동물">
            {pets.map((p, i) => (
              <PetTab
                key={p.pet_id}
                type="button"
                role="tab"
                aria-selected={i === petIndex}
                $on={i === petIndex}
                onClick={() => setPetIndex(i)}
              >
                {FACE[p.category_id ?? 0] ?? '🐾'} {p.name}
              </PetTab>
            ))}
            <PetTab
              type="button"
              $on={false}
              onClick={() => navigate('/pets/new')}
              aria-label="반려동물 추가"
            >
              <HiPlus aria-hidden="true" /> 추가
            </PetTab>
          </PetTabs>

          <PetCard
            type="button"
            onClick={() => navigate(`/pets/${pet.pet_id}/edit`)}
            aria-label={`${pet.name} 정보 수정`}
          >
            <Face aria-hidden="true">
              {pet.photo ? (
                <img src={pet.photo} alt="" />
              ) : (
                (FACE[pet.category_id ?? 0] ?? '🐾')
              )}
            </Face>
            <div>
              <PetName>{pet.name}</PetName>
              <PetMeta>
                {[
                  pet.breed || pet.category_name,
                  ageOf(pet.birth_date),
                  pet.weight_kg != null ? `${Number(pet.weight_kg)}kg` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </PetMeta>
            </div>
            <HiChevronRight aria-hidden="true" />
          </PetCard>

          <Tiles>
            <Tile
              type="button"
              $tone={dday != null && dday <= 7 ? 'hot' : 'plain'}
              onClick={() => navigate(`/pets/${pet.pet_id}/edit`)}
            >
              {nextVacc ? (
                <>
                  <TileNum>
                    {dday === 0
                      ? '오늘'
                      : dday! > 0
                        ? `D-${dday}`
                        : `${-dday!}일 지남`}
                  </TileNum>
                  <TileLabel>{nextVacc.name}</TileLabel>
                </>
              ) : (
                <>
                  <TileNum>—</TileNum>
                  <TileLabel>접종 일정 추가</TileLabel>
                </>
              )}
            </Tile>
            <Tile
              type="button"
              $tone="plain"
              onClick={() => navigate('/search')}
            >
              <TileNum>{favorites.length}</TileNum>
              <TileLabel>단골 병원·약국</TileLabel>
            </Tile>
          </Tiles>
        </>
      ) : (
        <Invite>
          <Face aria-hidden="true">🐾</Face>
          <div>
            <InviteTitle>
              {isLogin
                ? '첫 반려동물을 등록해보세요'
                : '로그인하면 우리 아이가 홈에 옵니다'}
            </InviteTitle>
            <InviteText>
              접종 D-day, 단골 병원, 같은 분류 보호자들의 글을 한 화면에서
              봅니다.
            </InviteText>
          </div>
          <InviteBt
            type="button"
            onClick={() => navigate(isLogin ? '/pets/new' : '/login')}
          >
            <HiPlus aria-hidden="true" /> {isLogin ? '등록하기' : '로그인'}
          </InviteBt>
        </Invite>
      )}

      {/* ── 단골 ── */}
      {isLogin && (
        <Section>
          <SectionHead>
            <h2>단골</h2>
            <More type="button" onClick={() => navigate('/search')}>
              지도에서 찾기 <HiChevronRight aria-hidden="true" />
            </More>
          </SectionHead>
          {favorites.length === 0 ? (
            <Muted>지도 정보창의 ★ 을 누르면 여기에 모입니다.</Muted>
          ) : (
            favorites.slice(0, 2).map((f) => (
              <Row
                key={f.facility_id}
                type="button"
                onClick={() => navigate('/search')}
              >
                <Chip $type={f.type}>{f.type}</Chip>
                <div>
                  <RowTitle>{f.bplcnm}</RowTitle>
                  <RowMeta>{f.rdnwhladdr || f.sitewhladdr || ''}</RowMeta>
                </div>
              </Row>
            ))
          )}
        </Section>
      )}

      {/* ── 게시글 ── */}
      <Section>
        <SectionHead>
          <h2>
            {pet?.category_name
              ? `${pet.category_name} 보호자들이 보는 글`
              : '커뮤니티 최신 글'}
          </h2>
          <More
            type="button"
            onClick={() => navigate(`/posts?categoryId=${postCategory}`)}
          >
            더 보기 <HiChevronRight aria-hidden="true" />
          </More>
        </SectionHead>
        {posts.length === 0 ? (
          <Muted>아직 글이 없어요.</Muted>
        ) : (
          posts.map((p) => (
            <Row
              key={p.post_id}
              type="button"
              onClick={() => navigate(`/posts/${p.post_id}`)}
            >
              <div>
                <RowTitle>{p.title}</RowTitle>
                <RowMeta>
                  {p.username ?? p.author} · {timeAgo(p.created_at)}
                </RowMeta>
              </div>
            </Row>
          ))
        )}
      </Section>

      {/* ── 검색 (엄지 자리) ── */}
      <SearchBt type="button" onClick={() => navigate('/search')}>
        <HiMagnifyingGlass aria-hidden="true" />
        <span>{pet ? '다른 병원·약국 찾기' : '병원·약국 찾기'}</span>
      </SearchBt>

      {isLogin && !pet && (
        <Muted style={{ textAlign: 'center' }}>
          {user.username}님, 환영해요
        </Muted>
      )}
    </Page>
  );
}

export default Home;

const Page = styled.section`
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: ${({ theme }) => theme.space.lg};
  padding: 0 ${({ theme }) => theme.space.lg} ${({ theme }) => theme.space.xl};
  background-color: ${({ theme }) => theme.color.surface};
  font-family: ${({ theme }) => theme.font.body};
`;

const Muted = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textMuted};
`;

const PetTabs = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.sm};
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const PetTab = styled.button<{ $on: boolean }>`
  flex: none;
  padding: 5px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid
    ${({ theme, $on }) =>
      $on ? theme.color.primary : theme.color.borderStrong};
  background-color: ${({ theme, $on }) =>
    $on ? theme.color.primary : theme.color.surface};
  color: ${({ theme, $on }) =>
    $on ? theme.color.textInverse : theme.color.textMuted};
  font-size: 13px;
  font-weight: ${({ $on }) => ($on ? 600 : 400)};
  cursor: pointer;
`;

const PetCard = styled.button`
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) auto;
  gap: ${({ theme }) => theme.space.md};
  align-items: center;
  width: 100%;
  padding: ${({ theme }) => theme.space.lg};
  border: 0;
  border-radius: ${({ theme }) => theme.radius.default};
  background-color: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.text};
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadow.sm};
`;

const Face = styled.span`
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.75);
  font-size: 30px;
  overflow: hidden;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

const PetName = styled.strong`
  display: block;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
`;

const PetMeta = styled.span`
  display: block;
  margin-top: 3px;
  font-size: 13px;
  color: #4a5544;
`;

const Tiles = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space.sm};
`;

const Tile = styled.button<{ $tone: 'hot' | 'plain' }>`
  display: grid;
  gap: 2px;
  padding: ${({ theme }) => theme.space.md};
  border: 1px solid
    ${({ theme, $tone }) => ($tone === 'hot' ? '#f3c9c9' : theme.color.border)};
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme, $tone }) =>
    $tone === 'hot' ? '#fdecec' : theme.color.surfaceMuted};
  color: ${({ theme, $tone }) =>
    $tone === 'hot' ? theme.color.danger : theme.color.text};
  text-align: left;
  font-family: inherit;
  cursor: pointer;
`;

const TileNum = styled.span`
  font-size: 22px;
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
`;

const TileLabel = styled.span`
  font-size: 12px;
  opacity: 0.85;
`;

const Invite = styled.div`
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: ${({ theme }) => theme.space.md};
  align-items: center;
  padding: ${({ theme }) => theme.space.lg};
  border-radius: ${({ theme }) => theme.radius.default};
  background-color: ${({ theme }) => theme.color.accent};
`;

const InviteTitle = styled.strong`
  display: block;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.35;
`;

const InviteText = styled.span`
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #4a5544;
`;

const InviteBt = styled.button`
  grid-column: 1 / -1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 40px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.textInverse};
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background-color: ${({ theme }) => theme.color.primaryHover};
  }
`;

const Section = styled.section`
  display: grid;
  gap: 2px;
`;

const SectionHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;
  h2 {
    margin: 0;
    font-family: ${({ theme }) => theme.font.body};
    font-size: 14px;
    font-weight: 700;
  }
`;

const More = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border: 0;
  background: none;
  color: ${({ theme }) => theme.color.textMuted};
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.color.text};
  }
`;

const Row = styled.button`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: ${({ theme }) => theme.space.sm};
  align-items: center;
  width: 100%;
  padding: 10px 0;
  border: 0;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  background: none;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  &:last-child {
    border-bottom: 0;
  }
  &:hover {
    background-color: ${({ theme }) => theme.color.surfaceMuted};
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

const Chip = styled.span<{ $type: string }>`
  padding: 1px 7px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  background-color: ${({ $type }) =>
    $type === '병원' ? '#fdecec' : '#e2f5fc'};
  color: ${({ $type }) => ($type === '병원' ? '#c94441' : '#0d3c52')};
`;

const SearchBt = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  margin-top: auto;
  padding: 13px 16px;
  border: 1px solid ${({ theme }) => theme.color.borderStrong};
  border-radius: ${({ theme }) => theme.radius.pill};
  background-color: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.textMuted};
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadow.sm};
  &:hover {
    border-color: ${({ theme }) => theme.color.primary};
    color: ${({ theme }) => theme.color.text};
  }
`;
