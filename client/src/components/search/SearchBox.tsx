import styled from 'styled-components';
import Input from '../common/Input';
import Button from '../common/Button';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  clearSelectedPlace,
  setResults,
  setSearchInputPlace,
} from '../../store/slices/placeSlice';
import { fetchPlaces } from '../../apis/place.api';

/** 검색 결과 상한. 지도가 감당할 수 있는 마커 수에 맞춥니다. */
const SEARCH_RESULT_LIMIT = 2000;

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

      dispatch(setResults(results));
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

const SearchBoxStyle = styled.div`
  display: flex;
  gap: 10px;
`;

export default SearchBox;
