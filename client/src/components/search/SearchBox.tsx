import styled from 'styled-components';
import Input from '../common/Input';
import Button from '../common/Button';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  clearSelectedPlace,
  setSearchInputPlace,
  setSearchResults,
} from '../../store/slices/placeSlice';
import { fetchPlaces } from '../../apis/place.api';

/**
 * 전국 검색 결과 상한.
 *
 * 이 조회는 "지도를 어디로 옮길지" 를 정하려고 씁니다. 옮기고 나면 화면 범위
 * 조회가 그 지역 마커를 다시 채우므로, 여기서 전국 것을 잔뜩 받을 이유가 없습니다.
 * 2000 건이던 시절 '약국' 검색 한 번이 933KB 였습니다. 서버가 적합도 순으로
 * 정렬해 보내므로 앞쪽 100 건이면 갈 곳을 정하기에 충분합니다.
 */
const SEARCH_RESULT_LIMIT = 100;

function SearchBox() {
  const dispatch = useDispatch();
  const { searchInputPlace } = useSelector((state: RootState) => state.place);

  const handleButtonClick = async () => {
    try {
      /*
       * 상한이 없으면 '약국' 처럼 흔한 낱말은 전국 13,709건(6.3MB)이 한 번에 내려옵니다.
       * 측정 결과 검색 한 번에 11초가 걸리고 지도 마커 렌더에서 프레임이 끊겼습니다.
       */
      const results = await fetchPlaces({
        keyword: searchInputPlace,
        limit: SEARCH_RESULT_LIMIT,
      });

      dispatch(setSearchResults(results));
      dispatch(clearSelectedPlace());
    } catch (error) {
      console.error('검색 결과를 불러오던 중 오류 발생:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    dispatch(setSearchInputPlace(value));
  };

  const handleKeyEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleButtonClick();
    }
  };

  return (
    <SearchBoxStyle>
      <Input
        name="placeName"
        type="text"
        size="medium"
        placeholder="장소명 혹은 주소지를 입력해주세요"
        value={searchInputPlace}
        onChange={handleInputChange}
        onKeyDown={handleKeyEnter}
      />
      <Button size="medium" scheme="positive" onClick={handleButtonClick}>
        검색
      </Button>
    </SearchBoxStyle>
  );
}

/*
 * 버튼은 줄이지 않고, 모자란 폭은 입력창이 양보합니다.
 *
 * 375px 화면의 후기 화면에서 입력창 272px + 간격 10px + 버튼 68px = 350px 를
 * 넣어야 했는데 상자가 336px 이라 둘 다 줄어들었습니다. 한글은 글자 사이에서도
 * 줄이 바뀌기 때문에 버튼이 66px 로 줄며 "검 / 색" 두 줄(높이 58px)이 됐습니다.
 *
 * 버튼만 못 줄게 하면 상자가 350px 로 커져 후기 화면의 좌우 여백(30px)을 먹고,
 * 320px 화면에서는 화면 밖으로 넘칩니다. 그래서 상자를 부모 폭 안에 가두고
 * (max-width), 입력창이 자기 기본 폭 밑으로도 줄 수 있게(min-width: 0) 둡니다.
 * 넓은 화면에서는 상자가 원래 폭(350px) 그대로입니다.
 */
const SearchBoxStyle = styled.div`
  display: flex;
  gap: 10px;
  max-width: 100%;

  input {
    min-width: 0;
  }

  button {
    flex-shrink: 0;
    white-space: nowrap;
  }
`;

export default SearchBox;
