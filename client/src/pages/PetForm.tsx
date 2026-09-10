import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { useNavigate, useParams } from 'react-router-dom';
import { HiCamera, HiTrash, HiXMark } from 'react-icons/hi2';
import { Category } from '../types/post.type';
import { Pet, PetInput, Vaccination } from '../types/pet.type';
import {
  addPet,
  addVaccination,
  deletePet,
  deleteVaccination,
  fetchMyPets,
  setVaccinationDone,
  updatePet,
} from '../apis/pets.api';
import { Actions, CancelBt, SubmitBt } from '../components/board/postEditor';

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
 * 고른 이미지를 정방형으로 잘라 줄인 data URL 로 바꿉니다.
 * 원본을 그대로 올리면 수 MB 가 DB 에 들어가서, 브라우저에서 먼저 줄입니다.
 */
function shrinkToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = PHOTO_SIZE;
      canvas.height = PHOTO_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('canvas unavailable'));
        return;
      }
      ctx.drawImage(img, sx, sy, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 읽을 수 없습니다'));
    };
    img.src = url;
  });
}

/**
 * 반려동물 등록·수정.
 * /pets/new 는 등록, /pets/:id/edit 는 수정이고 수정 화면에서만 접종 일정을 다룹니다.
 * (일정은 pet_id 가 있어야 저장할 수 있어서 등록 직후 수정 화면으로 보냅니다.)
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
  const [newVacc, setNewVacc] = useState({ name: '', due_date: '' });
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
      set('photo', await shrinkToDataUrl(file));
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
        const res = await addPet(form);
        alert('등록되었습니다. 접종 일정을 이어서 추가할 수 있어요.');
        navigate(`/pets/${res.petId}/edit`, { replace: true });
      } else {
        await updatePet(petId, form);
        alert('저장되었습니다.');
        navigate('/');
      }
    } catch (error: any) {
      alert(error?.response?.data?.message ?? '저장하지 못했습니다.');
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
      alert(error?.response?.data?.message ?? '삭제하지 못했습니다.');
    }
  };

  const handleAddVacc = async () => {
    if (petId == null) return;
    if (!newVacc.name.trim() || !newVacc.due_date) {
      alert('일정 이름과 날짜를 입력해주세요');
      return;
    }
    try {
      await addVaccination(petId, newVacc.name.trim(), newVacc.due_date);
      setNewVacc({ name: '', due_date: '' });
      await load();
    } catch (error: any) {
      alert(error?.response?.data?.message ?? '추가하지 못했습니다.');
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
            {vaccinations.map((v) => (
              <VaccRow key={v.vaccination_id} $done={!!v.done}>
                <input
                  type="checkbox"
                  checked={!!v.done}
                  onChange={() => toggleDone(v)}
                  aria-label={`${v.name} 완료`}
                />
                <span className="name">{v.name}</span>
                <span className="date">{v.due_date.slice(0, 10)}</span>
                <IconBt
                  type="button"
                  onClick={() => removeVacc(v)}
                  aria-label="일정 삭제"
                >
                  <HiTrash />
                </IconBt>
              </VaccRow>
            ))}
            <AddRow>
              <input
                value={newVacc.name}
                onChange={(e) =>
                  setNewVacc((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="예: 종합백신 5차"
                aria-label="일정 이름"
              />
              <input
                type="date"
                value={newVacc.due_date}
                onChange={(e) =>
                  setNewVacc((p) => ({ ...p, due_date: e.target.value }))
                }
                aria-label="일정 날짜"
              />
              <SmallBt type="button" onClick={handleAddVacc}>
                추가
              </SmallBt>
            </AddRow>
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

const Field = styled.div`
  display: grid;
  gap: 6px;
  label {
    font-size: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.color.textMuted};
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
  .name {
    text-decoration: ${({ $done }) => ($done ? 'line-through' : 'none')};
    color: ${({ theme, $done }) =>
      $done ? theme.color.textMuted : theme.color.text};
  }
  .date {
    font-size: 12px;
    color: ${({ theme }) => theme.color.textMuted};
    font-variant-numeric: tabular-nums;
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

const AddRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: ${({ theme }) => theme.space.sm};
  input {
    height: 38px;
    padding: 0 10px;
    border: 1px solid ${({ theme }) => theme.color.borderStrong};
    border-radius: ${({ theme }) => theme.radius.sm};
    font-family: inherit;
    font-size: 13px;
    min-width: 0;
    box-sizing: border-box;
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
