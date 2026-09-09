import { configureStore } from '@reduxjs/toolkit';
import reducer from './reducer/reducer';

const store = configureStore({
  reducer,
  /*
   * 시설 목록은 한 번에 수천~수만 건이 들어옵니다.
   * RTK 의 기본 dev 검사(serializableCheck / immutableCheck)는 액션마다 상태 전체를
   * 재귀 순회해서, 측정 결과 액션 하나에 300ms 이상 걸리며 검색 시 프레임이 끊겼습니다.
   * 해당 경로만 검사에서 제외하고 나머지 상태의 안전망은 남겨둡니다.
   */
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: { ignoredPaths: ['place.searchPlaceResults'] },
      immutableCheck: { ignoredPaths: ['place.searchPlaceResults'] },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
