import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { HiChevronRight } from 'react-icons/hi2';
import { fetchMyPets, setVaccinationDone } from '../apis/pets.api';
import { Pet, Vaccination } from '../types/pet.type';
import { daysUntil, ddayLabel, formatDate } from '../utils/format';
import { apiErrorMessage } from '../utils/apiError';

/** 일정 한 줄. 어느 아이 것인지 함께 들고 다닙니다. */
interface Row {
  vaccination: Vaccination;
  pet: Pet;
  dday: number;
  done: boolean;
}

/**
 * 접종·검진 일정 목록.
 *
 * 홈의 접종 타일에서 들어옵니다. 타일은 지금 보고 있는 아이의 다음 일정 하나만
 * 보여 주는데, 여러 마리를 키우면 나머지가 안 보입니다. 여기서는 아이를 가리지 않고
 * 모아 보여 줍니다.
 */
function Vaccinations() {
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  /** 보내는 중인 일정. 그 줄의 체크만 잠급니다. */
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetchMyPets()
      .then((rows) => alive && setPets(rows ?? []))
      .catch((error) => {
        console.error('일정을 불러오지 못했습니다:', error);
        if (alive) setPets([]);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  /*
   * 체크를 누르면 화면부터 바꾸고 서버에 보냅니다.
   *
   * 기다렸다가 바꾸면 누른 느낌이 늦게 오고, 목록을 통째로 다시 받으면 사진까지
   * 딸려 옵니다(반려동물 사진은 한 마리에 27KB). 실패하면 되돌립니다.
   */
  const toggleDone = async (v: Vaccination, next: boolean) => {
    if (saving !== null) return;

    const apply = (done: boolean) =>
      setPets((prev) =>
        prev.map((pet) => ({
          ...pet,
          vaccinations: pet.vaccinations.map((one) =>
            one.vaccination_id === v.vaccination_id ? { ...one, done } : one
          ),
        }))
      );

    setSaving(v.vaccination_id);
    apply(next);
    try {
      await setVaccinationDone(v.vaccination_id, next);
    } catch (error) {
      apply(!next);
      alert(apiErrorMessage(error, '일정을 바꾸지 못했습니다.'));
    } finally {
      setSaving(null);
    }
  };

  /*
   * 남은 일정을 가까운 순으로 먼저, 끝낸 일정은 뒤로 미룹니다.
   * 지난 일정도 남은 쪽에 둡니다 — 놓친 것이야말로 눈에 띄어야 합니다.
   */
  const rows = useMemo<Row[]>(() => {
    const all = pets.flatMap((pet) =>
      pet.vaccinations.map((vaccination) => ({
        vaccination,
        pet,
        dday: daysUntil(vaccination.due_date),
        done: Boolean(vaccination.done),
      }))
    );

    return all.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return a.dday - b.dday;
    });
  }, [pets]);

  const pending = rows.filter((r) => !r.done).length;

  if (loading) {
    return (
      <Page>
        <Title>접종·검진 일정</Title>
        <Muted>불러오는 중…</Muted>
      </Page>
    );
  }

  return (
    <Page>
      <Head>
        <Title>접종·검진 일정</Title>
        <Count>{pending}건 남음</Count>
      </Head>

      {rows.length === 0 ? (
        <Empty>
          <p>아직 등록된 일정이 없어요.</p>
          <p className="hint">
            반려동물 정보에서 접종·검진 일정을 추가할 수 있습니다.
          </p>
          <AddBt
            type="button"
            onClick={() =>
              navigate(pets[0] ? `/pets/${pets[0].pet_id}/edit` : '/pets/new')
            }
          >
            일정 추가하기
          </AddBt>
        </Empty>
      ) : (
        <List>
          {rows.map(({ vaccination, pet, dday, done }) => (
            <Row key={vaccination.vaccination_id} $done={done}>
              {/* 줄 안에 버튼을 또 넣을 수 없어, 체크와 여는 자리를 나란히 둡니다. */}
              <Check
                type="checkbox"
                checked={done}
                disabled={saving !== null}
                onChange={(e) => toggleDone(vaccination, e.target.checked)}
                aria-label={`${vaccination.name} 완료`}
              />
              {/* 일정을 고치고 지우는 곳은 반려동물 정보 화면입니다. */}
              <Open
                type="button"
                onClick={() => navigate(`/pets/${pet.pet_id}/edit`)}
              >
                <div className="body">
                  <RowTitle $done={done}>{vaccination.name}</RowTitle>
                  <RowMeta>
                    {pet.name} ·{' '}
                    {formatDate(vaccination.due_date, 'YYYY.MM.DD')}
                  </RowMeta>
                </div>
                {done ? (
                  <Badge $tone="done">완료</Badge>
                ) : (
                  <Badge $tone={dday <= 7 ? 'hot' : 'plain'}>
                    {ddayLabel(dday)}
                  </Badge>
                )}
                <HiChevronRight aria-hidden="true" />
              </Open>
            </Row>
          ))}
        </List>
      )}
    </Page>
  );
}

export default Vaccinations;

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

const Row = styled.div<{ $done: boolean }>`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: ${({ theme }) => theme.space.sm};
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  /* 끝낸 일정은 남은 것과 섞이지 않게 흐리게 둡니다. */
  opacity: ${({ $done }) => ($done ? 0.55 : 1)};

  &:hover {
    background-color: ${({ theme }) => theme.color.surfaceMuted};
  }
`;

const Check = styled.input`
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: ${({ theme }) => theme.color.primary};
  cursor: pointer;

  &:disabled {
    cursor: default;
  }
`;

const Open = styled.button`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
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

const RowTitle = styled.span<{ $done: boolean }>`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.text};
  /* 끝낸 일정은 글자에도 줄을 그어, 흐린 것만으로 놓치지 않게 합니다. */
  text-decoration: ${({ $done }) => ($done ? 'line-through' : 'none')};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RowMeta = styled.span`
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textMuted};
  font-variant-numeric: tabular-nums;
`;

/* 일주일 안으로 다가온 일정만 색으로 알립니다. 전부 칠하면 아무것도 안 띕니다. */
const Badge = styled.span<{ $tone: 'hot' | 'plain' | 'done' }>`
  flex: none;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  background-color: ${({ theme, $tone }) =>
    $tone === 'hot' ? '#fdecec' : theme.color.surfaceMuted};
  color: ${({ theme, $tone }) =>
    $tone === 'hot' ? theme.color.danger : theme.color.textMuted};
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

const AddBt = styled.button`
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
