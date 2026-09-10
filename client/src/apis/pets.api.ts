import { httpClient } from './http';
import { Pet, PetInput } from '../types/pet.type';

/** 내 반려동물 목록. 접종 일정이 함께 옵니다. */
export const fetchMyPets = async () => {
  const res = await httpClient.get<Pet[]>('/pets');
  return res.data;
};

export const addPet = async (input: PetInput) => {
  const res = await httpClient.post<{ petId: number }>('/pets', toBody(input));
  return res.data;
};

export const updatePet = async (petId: number, input: PetInput) => {
  const res = await httpClient.put(`/pets/${petId}`, toBody(input));
  return res.data;
};

export const deletePet = async (petId: number) => {
  const res = await httpClient.delete(`/pets/${petId}`);
  return res.data;
};

export const addVaccination = async (
  petId: number,
  name: string,
  dueDate: string
) => {
  const res = await httpClient.post(`/pets/${petId}/vaccinations`, {
    name,
    due_date: dueDate,
  });
  return res.data;
};

export const setVaccinationDone = async (
  vaccinationId: number,
  done: boolean
) => {
  const res = await httpClient.patch(`/pets/vaccinations/${vaccinationId}`, {
    done,
  });
  return res.data;
};

export const deleteVaccination = async (vaccinationId: number) => {
  const res = await httpClient.delete(`/pets/vaccinations/${vaccinationId}`);
  return res.data;
};

/* 빈 문자열은 null 로 보내 DB 에 '' 가 들어가지 않게 합니다. */
function toBody(input: PetInput) {
  return {
    name: input.name.trim(),
    category_id: input.category_id,
    breed: input.breed.trim() || null,
    birth_date: input.birth_date || null,
    weight_kg: input.weight_kg === '' ? null : Number(input.weight_kg),
    photo: input.photo,
  };
}
