import styled from 'styled-components';
import SearchBox from '../components/search/SearchBox';
import SearchMap from '../components/search/SearchMap';

function Search() {
  return (
    <SearchStyle>
      <SearchBox />
      <SearchMap />
    </SearchStyle>
  );
}

const SearchStyle = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-height: 0;
`;

export default Search;
