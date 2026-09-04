import styled from 'styled-components';
import MarkerSprites from '../../../assets/images/MarkerSprites.png';
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
  padding: 0 8px;
  border: 1px solid #919191;
  border-radius: 16px;
  z-index: 10;

  ul {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    font-size: 15px;
    gap: 5px;
    margin: 8px 0px;
    li {
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 5px 8px;
      gap: 5px;
      border-radius: 12px;
      border: 1px solid #919191;
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
    width: 29px;
    height: 35px;
    background-image: url(${MarkerSprites});
    background-size: 116.3px 35px;
  }
  .marker_pharmacy {
    background-position: -29px 0px;
  }
  .marker_hospital {
    background-position: 0px 0px;
  }
  .marker_all {
    background-position: -87px 0px;
  }
`;
export default SearchMapCategory;
