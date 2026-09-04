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

function SearchBox() {
  const dispatch = useDispatch();
  const { searchInputPlace } = useSelector((state: RootState) => state.place);

  const handleButtonClick = async () => {
    try {
      const results = await fetchPlaces({
        keyword: searchInputPlace,
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
