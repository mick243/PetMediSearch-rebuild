import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { useNavigate, useParams } from 'react-router-dom';
import { HiCamera, HiPencil, HiTrash, HiXMark } from 'react-icons/hi2';
import { Category } from '../types/post.type';
import { Pet, PetInput, Vaccination } from '../types/pet.type';
import {
  addPet,
  addVaccination,
  deletePet,
  deleteVaccination,
  fetchMyPets,
  setVaccinationDone,
  updateVaccination,
  updatePet,
} from '../apis/pets.api';
import { Actions, CancelBt, SubmitBt } from '../components/board/postEditor';
import { shrinkToSquareDataUrl } from '../utils/image';
import { scheduleWhen } from '../utils/format';
import { apiErrorMessage } from '../utils/apiError';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const EMPTY: PetInput = {
  name: '',
  category_id: 2,
  breed: '',
  birth_date: '',
  weight_kg: '',
  photo: null,
};

/** 사진은 이 크기의 정방형 JPEG 로 줄여 저장합니다. 홈 카드에서 56px 로 쓰므로 충분합니다. */
const PHOTO_SIZE = 320;

/**
 * 반려동물 등록·수정.
 * /pets/new 는 등록, /pets/:id/edit 는 수정이고 수정 화면에서만 접종 일정을 다룹니다.
 * (일정은 pet_id 가 있어야 저장할 수 있습니다. 등록을 마치면 홈으로 보내고,
 *  일정은 나중에 이 화면을 다시 열어 넣습니다.)
 * 여러 마리를 키우면 위쪽 드롭다운으로 다른 아이로 바로 넘어갑니다.
 */
function PetForm() {
  const { id } = useParams();
  const petId = id ? Number(id) : null;
  const navigate = useNavigate();

  const [form, setForm] = useState<PetInput>(EMPTY);
  const [categories, setCategories] = useState<Category[]>([]);
  const [myPets, setMyPets] = useState<Pet[]>([]);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [newVacc, setNewVacc] = useState({
    name: '',
    due_date: '',
    due_time: '',
  });
  /* 지금 고치고 있는 일정. null 이면 아무것도 펼쳐져 있지 않습니다. */
  const [editing, setEditing] = useState<{
    id: number;
    name: string;
    due_date: string;
    due_time: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    axios
      .get<Category[]>(`${BASE_URL}/category`)
      // '통합'은 분류가 아니라 전체 보기라 반려동물 종류로는 뺍니다.
      .then((res) => setCategories(res.data.filter((c) => c.category_id !== 1)))
      .catch((err) => console.error(err));
  }, []);

  const load = async () => {
    const pets = await fetchMyPets();
    setMyPets(pets);
    if (petId == null) {
      setForm(EMPTY);
      setVaccinations([]);
      return;
    }
    const pet = pets.find((p) => p.pet_id === petId);
    if (!pet) {
      alert('반려동물을 찾을 수 없습니다.');
      navigate('/');
      return;
    }
    setForm({
      name: pet.name,
      category_id: pet.category_id,
      breed: pet.breed ?? '',
      birth_date: pet.birth_date ? pet.birth_date.slice(0, 10) : '',
      weight_kg: pet.weight_kg == null ? '' : String(Number(pet.weight_kg)),
      photo: pet.photo ?? null,
    });
    setVaccinations(pet.vaccinations);
  };

  useEffect(() => {
    load().catch((err) => console.error(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  const set = (key: keyof PetInput, value: string | number | null) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 올릴 수 있어요.');
      return;
    }
    try {
      set('photo', await shrinkToSquareDataUrl(file, PHOTO_SIZE));
    } catch (error) {
      console.error(error);
      alert('사진을 불러오지 못했습니다.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('이름을 입력해주세요');
      return;
    }
    setSaving(true);
    try {
      if (petId == null) {
        await addPet(form);
        alert('등록되었습니다.');
        /*
         * 등록을 마치면 홈으로 보냅니다. 예전에는 곧장 수정 화면으로 넘겨
         * 접종 일정을 이어서 넣게 했는데, 등록만 하려던 사람에게는 끝나지 않은
         * 화면이었습니다. 일정은 홈의 접종 칸이나 카드에서 언제든 들어옵니다.
         *
         * replace 로 바꿔 치웁니다 — 뒤로가기로 빈 등록 폼에 돌아오면
         * 방금 넣은 아이를 한 번 더 등록하기 쉽습니다.
         */
        navigate('/', { replace: true });
      } else {
        await updatePet(petId, form);
        alert('저장되었습니다.');
        navigate('/');
      }
    } catch (error: any) {
      alert(apiErrorMessage(error, '저장하지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (petId == null) return;
    if (!window.confirm('이 반려동물과 접종 일정을 모두 삭제할까요?')) return;
    try {
      await deletePet(petId);
      navigate('/');
    } catch (error: any) {
      alert(apiErrorMessage(error, '삭제하지 못했습니다.'));
    }
  };

  const handleAddVacc = async () => {
    if (petId == null) return;
    if (!newVacc.name.trim() || !newVacc.due_date) {
      alert('일정 이름과 날짜를 입력해주세요');
      return;
    }
    try {
      await addVaccination(
        petId,
        newVacc.name.trim(),
        newVacc.due_date,
        newVacc.due_time
      );
      setNewVacc({ name: '', due_date: '', due_time: '' });
      await load();
    } catch (error: any) {
      alert(apiErrorMessage(error, '추가하지 못했습니다.'));
    }
  };

  /*
   * 서버는 TIME 을 'HH:MM:SS' 로 보내는데 <input type="time"> 은 'HH:MM' 만 받습니다.
   * 초를 그대로 넣으면 값이 비어 보여서, 사용자는 시각이 사라진 줄 압니다.
   */
  const startEdit = (v: Vaccination) =>
    setEditing({
      id: v.vaccination_id,
      name: v.name,
      due_date: v.due_date.slice(0, 10),
      due_time: v.due_time ? v.due_time.slice(0, 5) : '',
    });

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.due_date) {
      alert('일정 이름과 날짜를 입력해주세요');
      return;
    }
    try {
      await updateVaccination(
        editing.id,
        editing.name.trim(),
        editing.due_date,
        editing.due_time
      );
      setEditing(null);
      await load();
    } catch (error: any) {
      alert(apiErrorMessage(error, '수정하지 못했습니다.'));
    }
  };

  const toggleDone = async (v: Vaccination) => {
    await setVaccinationDone(v.vaccination_id, !v.done);
    await load();
  };

  const removeVacc = async (v: Vaccination) => {
    if (!window.confirm(`'${v.name}' 일정을 삭제할까요?`)) return;
    await deleteVaccination(v.vaccination_id);
    await load();
  };

  /* 드롭다운: 다른 아이 선택 → 그 아이의 수정 화면, '새로 등록' → /pets/new */
  const handlePick = (value: string) => {
    if (value === 'new') navigate('/pets/new');
    else navigate(`/pets/${value}/edit`);
  };

  return (
    <Page>
      <Body onSubmit={(e) => e.preventDefault()}>
        <Head>
          <Title>{petId == null ? '반려동물 등록' : '반려동물 정보'}</Title>
          {myPets.length > 0 && (
            <Picker
              aria-label="반려동물 선택"
              value={petId == null ? 'new' : String(petId)}
              onChange={(e) => handlePick(e.target.value)}
            >
              {myPets.map((p) => (
                <option key={p.pet_id} value={p.pet_id}>
                  {p.name}
                </option>
              ))}
              <option value="new">＋ 새로 등록</option>
            </Picker>
          )}
        </Head>

        <PhotoRow>
          <PhotoFrame>
            {form.photo ? (
              <img src={form.photo} alt={`${form.name || '반려동물'} 사진`} />
            ) : (
              <HiCamera aria-hidden="true" />
            )}
          </PhotoFrame>
          <PhotoTools>
            <input
              ref={fileRef}
              id="pet-photo"
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => handlePhoto(e.target.files?.[0])}
            />
            <GhostBt type="button" onClick={() => fileRef.current?.click()}>
              <HiCamera aria-hidden="true" />{' '}
              {form.photo ? '사진 바꾸기' : '사진 올리기'}
            </GhostBt>
            {form.photo && (
              <GhostBt type="button" onClick={() => set('photo', null)}>
                <HiXMark aria-hidden="true" /> 사진 지우기
              </GhostBt>
            )}
            <Hint>정방형으로 잘라 {PHOTO_SIZE}px 로 줄여 저장합니다.</Hint>
          </PhotoTools>
        </PhotoRow>

        <Field>
          <label htmlFor="pet-name">이름</label>
          <input
            id="pet-name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="예: 짱구"
          />
        </Field>

        <Field>
          <label htmlFor="pet-cat">종류</label>
          <select
            id="pet-cat"
            value={form.category_id ?? ''}
            onChange={(e) =>
              set('category_id', e.target.value ? Number(e.target.value) : null)
            }
          >
            {categories.map((c) => (
              <option key={c.category_id ?? 'x'} value={c.category_id ?? ''}>
                {c.category_name}
              </option>
            ))}
          </select>
        </Field>

        <Two>
          <Field>
            <label htmlFor="pet-breed">품종</label>
            <input
              id="pet-breed"
              value={form.breed}
              onChange={(e) => set('breed', e.target.value)}
              placeholder="예: 말티즈"
            />
          </Field>
          <Field>
            <label htmlFor="pet-weight">몸무게 (kg)</label>
            <input
              id="pet-weight"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              value={form.weight_kg}
              onChange={(e) => set('weight_kg', e.target.value)}
              placeholder="4.2"
            />
          </Field>
        </Two>

        <Field>
          <label htmlFor="pet-birth">생일</label>
          <input
            id="pet-birth"
            type="date"
            value={form.birth_date}
            onChange={(e) => set('birth_date', e.target.value)}
          />
        </Field>

        {petId != null && (
          <VaccBox>
            <Title as="h2">접종·검진 일정</Title>
            {vaccinations.length === 0 && <Muted>아직 일정이 없어요.</Muted>}
            {vaccinations.map((v) =>
              editing?.id === v.vaccination_id ? (
                <EditRow key={v.vaccination_id}>
                  <input
                    className="name"
                    value={editing.name}
                    onChange={(e) =>
                      setEditing((p) => p && { ...p, name: e.target.value })
                    }
                    aria-label="일정 이름"
                  />
                  <input
                    className="date"
                    type="date"
                    value={editing.due_date}
                    onChange={(e) =>
                      setEditing((p) => p && { ...p, due_date: e.target.value })
                    }
                    aria-label="일정 날짜"
                  />
                  <input
                    className="time"
                    type="time"
                    value={editing.due_time}
                    onChange={(e) =>
                      setEditing((p) => p && { ...p, due_time: e.target.value })
                    }
                    aria-label="일정 시각 (선택)"
                  />
                  <div className="acts">
                    <SmallBt type="button" onClick={saveEdit}>
                      저장
                    </SmallBt>
                    <GhostSmallBt
                      type="button"
                      onClick={() => setEditing(null)}
                    >
                      취소
                    </GhostSmallBt>
                  </div>
                </EditRow>
              ) : (
                <VaccRow key={v.vaccination_id} $done={!!v.done}>
                  <input
                    type="checkbox"
                    checked={!!v.done}
                    onChange={() => toggleDone(v)}
                    aria-label={`${v.name} 완료`}
                  />
                  {/*
                    이름과 날짜를 위아래로 둡니다. 시각까지 한 줄에 넣으면 폭이
                    390px 인 휴대폰에서 이름이 두세 글자만 남습니다.
                  */}
                  <div className="what">
                    <span className="name">{v.name}</span>
                    <span className="when">
                      {scheduleWhen(v.due_date, v.due_time)}
                    </span>
                  </div>
                  <IconBt
                    type="button"
                    onClick={() => startEdit(v)}
                    aria-label={`${v.name} 수정`}
                  >
                    <HiPencil />
                  </IconBt>
                  <IconBt
                    type="button"
                    onClick={() => removeVacc(v)}
                    aria-label={`${v.name} 삭제`}
                  >
                    <HiTrash />
                  </IconBt>
                </VaccRow>
              )
            )}
            <AddRow>
              <input
                className="name"
                value={newVacc.name}
                onChange={(e) =>
                  setNewVacc((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="예: 종합백신 5차"
                aria-label="일정 이름"
              />
              <input
                className="date"
                type="date"
                value={newVacc.due_date}
                onChange={(e) =>
                  setNewVacc((p) => ({ ...p, due_date: e.target.value }))
                }
                aria-label="일정 날짜"
              />
              <input
                className="time"
                type="time"
                value={newVacc.due_time}
                onChange={(e) =>
                  setNewVacc((p) => ({ ...p, due_time: e.target.value }))
                }
                aria-label="일정 시각 (선택)"
              />
              <SmallBt type="button" onClick={handleAddVacc}>
                추가
              </SmallBt>
            </AddRow>
            <Hint>시각은 비워 둬도 됩니다. 알림은 날짜로 갑니다.</Hint>
          </VaccBox>
        )}

        {petId != null && (
          <DangerBt type="button" onClick={handleDelete}>
            이 반려동물 삭제
          </DangerBt>
        )}
      </Body>

      <Actions>
        <CancelBt type="button" onClick={() => navigate(-1)}>
          취소
        </CancelBt>
        <SubmitBt type="button" onClick={handleSave} disabled={saving}>
          {petId == null ? '등록' : '저장'}
        </SubmitBt>
      </Actions>
    </Page>
  );
}

export default PetForm;

const Page = styled.section`
  display: flex;
  flex-direction: column;
  flex: 1;
  background-color: ${({ theme }) => theme.color.surface};
  font-family: ${({ theme }) => theme.font.body};
`;

const Body = styled.form`
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: ${({ theme }) => theme.space.lg};
  padding: 0 ${({ theme }) => theme.space.lg} ${({ theme }) => theme.space.lg};
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};
`;

const Title = styled.h1`
  margin: 0;
  font-family: ${({ theme }) => theme.font.body};
  font-size: 17px;
  font-weight: 700;
`;

const Picker = styled.select`
  height: 34px;
  padding: 0 10px;
  border: 1px solid ${({ theme }) => theme.color.borderStrong};
  border-radius: ${({ theme }) => theme.radius.pill};
  background-color: ${({ theme }) => theme.color.surface};
  font-family: inherit;
  font-size: 13px;
  color: ${({ theme }) => theme.color.text};
  max-width: 55%;
`;

const PhotoRow = styled.div`
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: ${({ theme }) => theme.space.md};
  align-items: center;
`;

const PhotoFrame = styled.div`
  display: grid;
  place-items: center;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  overflow: hidden;
  background-color: ${({ theme }) => theme.color.surfaceMuted};
  border: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.textMuted};
  font-size: 30px;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

const PhotoTools = styled.div`
  display: grid;
  gap: 6px;
  justify-items: start;
`;

const GhostBt = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 12px;
  border: 1px solid ${({ theme }) => theme.color.borderStrong};
  border-radius: ${({ theme }) => theme.radius.pill};
  background-color: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.text};
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  &:hover {
    background-color: ${({ theme }) => theme.color.surfaceMuted};
  }
`;

const Hint = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.textMuted};
`;

/*
 * 날짜·시각 입력칸을 칸 안에 가둡니다.
 *
 * iOS 사파리는 date·time 입력에 제 나름의 고유 너비를 줍니다. 그 값이 칸보다
 * 넓으면 width:100% 를 줘도 줄지 않고 칸 밖으로 삐져나갑니다 — 한국어 로캘의
 * '2026. 9. 14.' 처럼 값이 길어질수록 심합니다. 아이폰에서 생일 칸이 넘친
 * 원인입니다. appearance 를 꺼야 비로소 우리가 준 너비를 따릅니다.
 *
 * 끄고 나면 아이폰이 글자를 가운데로 몰고 높이도 제멋대로가 되므로, 정렬과
 * 높이를 여기서 다시 정합니다.
 */
const dateInputReset = `
  &[type='date'],
  &[type='time'] {
    -webkit-appearance: none;
    appearance: none;
    min-width: 0;
    max-width: 100%;
    text-align: left;
    /* 값이 없을 때 iOS 가 칸을 접어 버리는 것을 막습니다. */
    min-height: 1em;
  }
`;

const Field = styled.div`
  display: grid;
  gap: 6px;
  label {
    font-size: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.color.textMuted};
  }
  input {
    ${dateInputReset}
  }
  input,
  select {
    width: 100%;
    height: 42px;
    padding: 0 12px;
    border: 1px solid ${({ theme }) => theme.color.borderStrong};
    border-radius: ${({ theme }) => theme.radius.sm};
    background-color: ${({ theme }) => theme.color.surface};
    font-family: inherit;
    font-size: 14px;
    color: ${({ theme }) => theme.color.text};
    box-sizing: border-box;
    &:focus {
      outline: none;
      border-color: ${({ theme }) => theme.color.primary};
    }
  }
`;

const Two = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space.md};
`;

const VaccBox = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space.sm};
  padding-top: ${({ theme }) => theme.space.md};
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const Muted = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textMuted};
`;

const VaccRow = styled.div<{ $done: boolean }>`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  gap: ${({ theme }) => theme.space.sm};
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  font-size: 14px;
  .what {
    display: grid;
    gap: 1px;
    min-width: 0;
  }
  .name {
    text-decoration: ${({ $done }) => ($done ? 'line-through' : 'none')};
    color: ${({ theme, $done }) =>
      $done ? theme.color.textMuted : theme.color.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .when {
    font-size: 12px;
    color: ${({ theme }) => theme.color.textMuted};
    font-variant-numeric: tabular-nums;
  }
`;

/*
 * 일정 한 줄을 고칠 때 펼쳐지는 칸.
 *
 * 이름·날짜·시각·버튼을 한 줄에 늘어놓으면 휴대폰에서 이름 칸이 몇 글자만 남습니다.
 * 이름을 윗줄에 통째로 두고, 아랫줄에 날짜·시각·버튼을 나눠 놓습니다.
 */
const EditRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  grid-template-areas:
    'name name name'
    'date time acts';
  gap: ${({ theme }) => theme.space.sm};
  align-items: center;
  padding: ${({ theme }) => theme.space.sm} 0;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  input {
    height: 38px;
    padding: 0 10px;
    border: 1px solid ${({ theme }) => theme.color.primary};
    border-radius: ${({ theme }) => theme.radius.sm};
    font-family: inherit;
    font-size: 13px;
    min-width: 0;
    box-sizing: border-box;
    ${dateInputReset}
  }
  .name {
    grid-area: name;
  }
  .date {
    grid-area: date;
  }
  .time {
    grid-area: time;
  }
  .acts {
    grid-area: acts;
    display: flex;
    gap: 6px;
  }
`;

const IconBt = styled.button`
  display: flex;
  padding: 4px;
  border: 0;
  background: none;
  color: ${({ theme }) => theme.color.textMuted};
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.color.danger};
  }
`;

/* 두 줄로 나눈 이유는 EditRow 주석과 같습니다. */
const AddRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  grid-template-areas:
    'name name name'
    'date time add';
  gap: ${({ theme }) => theme.space.sm};
  align-items: center;
  input {
    height: 38px;
    padding: 0 10px;
    border: 1px solid ${({ theme }) => theme.color.borderStrong};
    border-radius: ${({ theme }) => theme.radius.sm};
    font-family: inherit;
    font-size: 13px;
    min-width: 0;
    box-sizing: border-box;
    ${dateInputReset}
  }
  .name {
    grid-area: name;
  }
  .date {
    grid-area: date;
  }
  .time {
    grid-area: time;
  }
  button {
    grid-area: add;
  }
`;

const SmallBt = styled.button`
  height: 38px;
  padding: 0 14px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.textInverse};
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`;

/* 수정 중 '취소'. 저장과 나란히 서므로 같은 높이에 테두리만 있는 모양입니다. */
const GhostSmallBt = styled.button`
  height: 38px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => theme.color.borderStrong};
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.textMuted};
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
`;

const DangerBt = styled.button`
  align-self: flex-start;
  border: 0;
  background: none;
  color: ${({ theme }) => theme.color.danger};
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
`;
