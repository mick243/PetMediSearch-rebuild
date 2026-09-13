/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,
  },
  test: {
    /*
     * jsdom 이 필요한 이유는 oauthState 가 sessionStorage 를 쓰기 때문입니다.
     * 나머지 유틸은 순수 함수라 환경을 타지 않습니다.
     */
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
