import { FaX } from 'react-icons/fa6';
import styled from 'styled-components';
import { PlaceData } from '../../../types/place.type';
import {
  MdDoNotDisturbOnTotalSilence,
  MdExpandCircleDown,
} from 'react-icons/md';

interface Props {
  onClick: (markerId: number) => void;
  place: PlaceData;
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    alert(`글 복사 완료: ${text}`);
  } catch (err) {
    console.error(`글 복사 실패: ${err}`);
  }
};

const notPrepared = () => (
  <div className="notPrepared">
    <MdDoNotDisturbOnTotalSilence className="notIcon" />
    <p>준비되지 않은 정보입니다</p>
  </div>
);

function SearchMapOverlay({ onClick, place }: Props) {
  return (
    <SearchMapOverlayStyle>
      <div className="overlayWrap">
        <div className="info">
          <div className="title">
            <div
              className="bplcnm"
              onClick={() => copyToClipboard(place.bplcnm)}
            >
              {place.bplcnm}
            </div>
            <div className="state">
              {place.dtlstatenm === '정상' ? (
                <div className="opened">
                  <MdExpandCircleDown className="stateIcon" />
                  {place.dtlstatenm}
                </div>
              ) : (
                <div className="closed">
                  <MdDoNotDisturbOnTotalSilence className="stateIcon" />
                  {place.dtlstatenm}
                </div>
              )}
            </div>
          </div>
          <FaX
            className="closebttn"
            aria-label="닫기"
            onClick={() => onClick(place.id)}
          />
        </div>
        <div className="address">
          {place.sitewhladdr ? (
            <div
              className="sitewhladdr"
              onClick={() => copyToClipboard(place.sitewhladdr)}
            >
              {place.sitewhladdr}
            </div>
          ) : (
            notPrepared()
          )}
          {place.rdnwhladdr ? (
            <div
              className="rdnwhladdr"
              onClick={() => copyToClipboard(place.rdnwhladdr)}
            >
              {place.rdnwhladdr}
            </div>
          ) : (
            notPrepared()
          )}
        </div>
        <div className="bottom">
          {place.sitetel ? (
            <div
              className="siteTel"
              onClick={() => copyToClipboard(place.sitetel)}
            >
              {place.sitetel}
            </div>
          ) : (
            notPrepared()
          )}
          <div className="review">
            <a href="/review">후기 작성하기</a>
          </div>
        </div>
      </div>
    </SearchMapOverlayStyle>
  );
}

const SearchMapOverlayStyle = styled.div`
  position: absolute;
  bottom: 60px;
  left: -140px;
  cursor: default;

  .overlayWrap {
    border-radius: 16px;
    background-color: white;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
    position: relative;
    border-radius: 16px;
    width: 280px;
    white-space: normal;

    .info {
      display: flex;
      justify-content: space-between;
      padding: 10px;
      border-top-left-radius: 16px;
      border-top-right-radius: 16px;
      align-items: center;
      gap: 10px;
      .title {
        display: flex;
        font-size: 18px;
        font-weight: bold;
        border-bottom: solid #d9d9d9;
        align-items: end;
        gap: 5px;
        .bplcnm {
          cursor: pointer;
        }
        .state {
          font-size: 12px;
          .opened {
            display: flex;
            color: #5ba95b;
          }
          .closed {
            display: flex;
            color: #e44c4c;
          }
          .stateIcon {
            font-size: 14px;
            padding-bottom: 1px;
          }
        }
      }
      .closebttn {
        cursor: pointer;
        font-size: 12px;
        color: #d9d9d9;
      }
      .closebttn:hover {
        color: black;
      }
    }

    .address {
      padding: 0 10px 5px;
      font-size: 14px;
      .sitewhladdr {
        cursor: pointer;
      }
      .rdnwhladdr {
        font-size: 11px;
        color: #464646;
        cursor: pointer;
      }
    }

    .bottom {
      display: flex;
      justify-content: space-between;
      background-color: #d9d9d9;
      border-bottom-left-radius: 16px;
      border-bottom-right-radius: 16px;
      padding: 5px 15px 5px 15px;
      font-size: 12px;
      .siteTel {
        cursor: pointer;
      }
      .review {
        a {
          color: #464646;
          text-decoration: none;
          font-weight: bold;
        }

        a:hover {
          color: #5ba95b;
        }
      }
    }

    .notPrepared {
      display: flex;
      align-items: center;
      font-size: 6px;
      color: #a0a0a0;
      .notIcon {
        font-size: 9px;
      }
    }
  }
  .overlayWrap:after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    width: 0;
    height: 0;
    border: 21px solid transparent;
    border-top-color: #d9d9d9;
    border-bottom: 0;
    margin-left: -21px;
    margin-bottom: -15px;
  }
`;

export default SearchMapOverlay;
