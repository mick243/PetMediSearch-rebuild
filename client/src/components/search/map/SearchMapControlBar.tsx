import { FaMinus, FaPlus } from 'react-icons/fa';
import styled from 'styled-components';

interface Props {
  onClickZoom: (action: string) => void;
  onClickType: (mapType: 'roadmap' | 'skyview') => void;
}

function SearchMapControlBar({ onClickZoom, onClickType }: Props) {
  return (
    <SearchMapControlBarStyle>
      <div className="typecontrol radius_border">
        <span id="bttnRoadmap" onClick={() => onClickType('roadmap')}>
          지도
        </span>
        <span
          id="bttnSkyview"
          onClick={() => {
            onClickType('skyview');
          }}
        >
          스카이뷰
        </span>
      </div>
      <div className="zoomcontrol radius_border">
        <span onClick={() => onClickZoom('zoomIn')}>
          <FaPlus />
        </span>
        <span onClick={() => onClickZoom('zoomOut')}>
          <FaMinus />
        </span>
      </div>
    </SearchMapControlBarStyle>
  );
}

const SearchMapControlBarStyle = styled.div`
  position: absolute;
  z-index: 10;
  top: 10px;
  right: 10px;

  .radius_border {
    border: 1px solid #919191;
    border-radius: 12px;
  }
  .typecontrol {
    width: 121px;
    height: 30px;
    margin: 0;
    padding: 0;
    font-size: 15px;
    background: white;
    span {
      display: block;
      width: 60px;
      height: 30px;
      float: left;
      text-align: center;
      line-height: 30px;
      cursor: pointer;
      transition:
        background-color 0.3s,
        color 0.3s;
    }
    span:hover {
      color: #e3e3e3;
    }
    span:first-child {
      border-right: 1px solid #bfbfbf;
    }
  }

  .zoomcontrol {
    position: absolute;
    top: 40px;
    right: 0;
    width: 30px;
    height: 70px;
    background-color: white;
    span {
      display: block;
      width: 30px;
      height: 35px;
      text-align: center;
      cursor: pointer;
      svg {
        width: 15px;
        height: 15px;
        padding: 10px 0;
        color: #575757;
        transition:
          background-color 0.3s,
          color 0.3s;
      }
    }
    span:hover {
      svg {
        color: #e3e3e3;
      }
    }
    span:first-child {
      border-bottom: 1px solid #bfbfbf;
    }
  }
`;

export default SearchMapControlBar;
