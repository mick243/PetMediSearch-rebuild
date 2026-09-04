import axios from 'axios';
import { getToken } from '../utils/localStorage';

const BASE_URL = import.meta.env.VITE_BASE_URL;

export const httpClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'content-type': 'application/json',
    Authorization: getToken() ? `Bearer ${getToken()}` : '',
  },
  withCredentials: true,
});

// 요청 추가
httpClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
