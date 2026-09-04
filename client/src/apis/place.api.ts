import { httpClient } from './http';

interface PlaceParams {
  type?: string;
  keyword?: string;
}

export const fetchPlaces = async (params: PlaceParams) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.append(key, value);
    }
  });

  const url = `/facilities?${query.toString()}`;

  try {
    const response = await httpClient.get(url);
    return response.data;
  } catch (error) {
    console.error(
      `Failed to fetch places with query: ${query.toString()}`,
      error
    );
    throw new Error('Failed to fetch places');
  }
};
