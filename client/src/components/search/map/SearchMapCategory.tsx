import styled from 'styled-components';
import {
  HOSPITAL_MARKER,
  PHARMACY_MARKER,
  CURRENT_MARKER,
  markerUrl,
} from '../../../utils/markerIcons';
interface Props {
  onClick: (value: React.SetStateAction<string>) => void;
  selectedCategory: string;
}
function SearchMapCategory({ onClick, selectedCategory }: Props) {
  return (
    <SearchMapCategoryStyle>
      <ul>
        <li
          id="allPlace"
          className={selectedCategory === 'allPlace' ? 'is_selected' : ''}
          onClick={() => onClick('allPlace')}
        >
          <span className="marker_comm marker_all"></span>
          <p>전체</p>
        </li>
        <li
          id="onlyHospital"
          className={selectedCategory === 'onlyHospital' ? 'is_selected' : ''}
          onClick={() => onClick('onlyHospital')}
        >
          <span className="marker_comm marker_hospital"></span>
          <p>병원</p>
        </li>
        <li
          id="onlyPharmacy"
          className={selectedCategory === 'onlyPharmacy' ? 'is_selected' : ''}
          onClick={() => onClick('onlyPharmacy')}
        >
          <span className="marker_comm marker_pharmacy"></span>
          <p>약국</p>
        </li>
      </ul>
    </SearchMapCategoryStyle>
  );
}
const SearchMapCategoryStyle = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: white;
  padding: 0 6px;
  border: 1px solid ${({ theme }) => theme.color.borderStrong};
  border-radius: ${({ theme }) => theme.radius.sm};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  z-index: 10;

  ul {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    font-size: 12px;
    gap: 3px;
    margin: 6px 0px;
    li {
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 3px 6px;
      gap: 4px;
      border-radius: 8px;
      border: 1px solid ${({ theme }) => theme.color.border};
      p {
        margin: 0;
      }
      transition:
        background-color 0.3s,
        color 0.3s;
    }
    li:hover {
      background-color: #e3e3e3;
      color: #575757;
    }
  }
  .is_selected {
    font-weight: bold;
    background-color: #575757;
    color: white;
  }
  .marker_comm {
    display: inline-block;
    width: 18px;
    height: 22px;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
  }
  .marker_pharmacy {
    background-image: ${markerUrl(PHARMACY_MARKER)};
  }
  .marker_hospital {
    background-image: ${markerUrl(HOSPITAL_MARKER)};
  }
  .marker_all {
    background-image: ${markerUrl(CURRENT_MARKER)};
  }
`;
export default SearchMapCategory;
