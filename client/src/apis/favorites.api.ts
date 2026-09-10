import { httpClient } from './http';
import { FavoriteFacility } from '../types/pet.type';

/** 내 단골 병원·약국. 시설 정보가 붙어서 옵니다. */
export const fetchFavorites = async () => {
  const res = await httpClient.get<FavoriteFacility[]>('/favorites');
  return res.data;
};

export const addFavorite = async (facilityId: number) => {
  const res = await httpClient.post(`/favorites/${facilityId}`);
  return res.data;
};

export const removeFavorite = async (facilityId: number) => {
  const res = await httpClient.delete(`/favorites/${facilityId}`);
  return res.data;
};
