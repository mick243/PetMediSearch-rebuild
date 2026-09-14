import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PlaceData, PlaceState } from '../../types/place.type';

const initialState: PlaceState = {
  data: [], // 장소 전체 데이터
  searchPlaceResults: [], // 장소 검색 결과
  searchInputPlace: '', // 검색하려는 장소명
  selectedPlace: null,
  searchSeq: 0,
};

const placeSlice = createSlice({
  name: 'place',
  initialState,
  reducers: {
    setSearchInputPlace(state, action: PayloadAction<string>) {
      state.searchInputPlace = action.payload;
    },
    /** 지도 화면 범위 조회 결과. 지도를 옮기지 않습니다. */
    setResults(state, action: PayloadAction<PlaceData[]>) {
      state.searchPlaceResults = action.payload;
    },
    /*
     * 검색 버튼 결과. 지도를 첫 결과로 옮겨야 하므로 순번을 함께 올립니다.
     *
     * setResults 로 뭉쳐 두면 화면 범위 조회 결과가 도착할 때마다 지도가 따라
     * 움직입니다. 움직이면 조회가 또 돌고, 그 결과가 첫 항목을 또 바꿔서
     * 지도가 결과 사이를 계속 튀어 다녔습니다.
     */
    setSearchResults(state, action: PayloadAction<PlaceData[]>) {
      state.searchPlaceResults = action.payload;
      state.searchSeq += 1;
    },
    setSelectPlace(state, action: PayloadAction<PlaceData>) {
      state.selectedPlace = action.payload;
    },
    clearSelectedPlace: (state) => {
      state.selectedPlace = null;
    },
  },
});

export const {
  setSearchInputPlace,
  setResults,
  setSearchResults,
  setSelectPlace,
  clearSelectedPlace,
} = placeSlice.actions;
export const placeReducer = placeSlice.reducer;
