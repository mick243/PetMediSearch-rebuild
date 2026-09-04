import styled from 'styled-components';

interface Props {
  onClick: (onlyOpend: boolean) => void;
  onlyOpened: boolean;
}

function SearchMapToggle({ onClick, onlyOpened }: Props) {
  return (
    <SearchMapToggleStyle>
      <div
        onClick={() => onClick(!onlyOpened)}
        className={onlyOpened ? 'onlyOpened' : ''}
      >
        영업 중
      </div>
    </SearchMapToggleStyle>
  );
}

const SearchMapToggleStyle = styled.div`
  position: absolute;
  top: 10px;
  left: 100px;
  z-index: 10;

  div {
    background-color: white;
    border: 2px double #919191;
    border-radius: 8px;
    box-shadow: inset 1px 1px 1px rgba(0, 0, 0, 0.5);
    border-radius: 16px;
    padding: 5px 10px;
    cursor: pointer;
    transition:
      background-color 0.3s,
      color 0.3s;
  }

  div:hover {
    background-color: #e3e3e3;
    color: black;
    border: 2px double #919191;
  }

  .onlyOpened {
    background-color: #5ba95b;
    color: white;
    border: 2px double #e3e3e3;
  }
`;

export default SearchMapToggle;
