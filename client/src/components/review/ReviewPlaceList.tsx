import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { RootState } from '../../store';
import { PlaceData } from '../../types/place.type';
import { setSelectPlace } from '../../store/slices/placeSlice';
import PaginationComp from '../common/PaginationComp';
import { useState } from 'react';
import { MdInbox, MdSearch } from 'react-icons/md';
import {
  MdDoNotDisturbOnTotalSilence,
  MdExpandCircleDown,
} from 'react-icons/md';
import {
  HOSPITAL_MARKER,
  PHARMACY_MARKER,
  markerUrl,
} from '../../utils/markerIcons';

function ReviewPlaceList() {
  const dispatch = useDispatch();
  const { searchPlaceResults, searchSeq } = useSelector(
    (state: RootState) => state.place
  );

  /*
   * 아직 한 번도 검색하지 않은 상태와, 검색했는데 없는 상태는 다릅니다.
   * 예전에는 둘 다 "검색된 결과가 없습니다." 였습니다. 화면에 들어오자마자
   * 그 문구가 크게 떠서, 이 앱에 후기가 하나도 없는 것처럼 읽혔습니다.
   *
   * searchSeq 는 검색 버튼을 누를 때마다 올라갑니다(store/slices/placeSlice.ts).
   * 0 이면 아직 아무것도 찾아보지 않은 것입니다.
   */
  const notSearchedYet = searchSeq === 0 && searchPlaceResults.length === 0;

  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 6;
  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentPlaces = searchPlaceResults.slice(
    indexOfFirstPost,
    indexOfLastPost
  );

  const handleClick = (place: PlaceData) => {
    dispatch(setSelectPlace(place));
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <ReviewPlaceListStyle>
      {searchPlaceResults.length === 0 ? (
        <div className="noResults">
          {notSearchedYet ? (
            <MdSearch className="emptyIcon" />
          ) : (
            <MdInbox className="emptyIcon" />
          )}
          <p>
            {notSearchedYet
              ? '후기를 볼 시설을 검색해 주세요.'
              : '검색된 결과가 없습니다.'}
          </p>
          {notSearchedYet && (
            <span className="hint">
              병원·약국 이름이나 주소를 위에 입력하면 이곳에 나옵니다.
            </span>
          )}
        </div>
      ) : (
        <>
          {currentPlaces.map((place, index) => (
            <div
              key={index}
              className="placeWrap"
              onClick={() => handleClick(place)}
            >
              <span
                className={`marker_comm ${place.type === '병원' ? 'marker_hospital' : 'marker_pharmacy'}`}
              />
              <div className="place">
                <div className="info">
                  <div className="title">{place.bplcnm}</div>
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
                <div className="address">
                  <div className="rdnwhladdr">
                    {place.rdnwhladdr ? (
                      place.rdnwhladdr
                    ) : (
                      <div className="notPrepared">
                        <MdDoNotDisturbOnTotalSilence className="notIcon" />
                        <p>준비되지 않은 정보입니다</p>
                      </div>
                    )}
                  </div>
                  <div className="sitewhladdr">
                    {place.sitewhladdr ? (
                      place.sitewhladdr
                    ) : (
                      <div className="notPrepared">
                        <MdDoNotDisturbOnTotalSilence className="notIcon" />
                        <p>준비되지 않은 정보입니다</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="tel">
                  {place.sitetel ? (
                    <div className="siteTel">{place.sitetel}</div>
                  ) : (
                    <div className="notPrepared">
                      <MdDoNotDisturbOnTotalSilence className="notIcon" />
                      <p>준비되지 않은 정보입니다</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <PaginationComp
            totalItemsCount={searchPlaceResults.length}
            itemsCountPerPage={postsPerPage}
            currentPage={currentPage}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </ReviewPlaceListStyle>
  );
}

const ReviewPlaceListStyle = styled.div`
  /*
   * 한 줄의 높이는 내용이 정합니다.
   *
   * 예전에는 height: 80px 으로 못박혀 있었습니다. 주소가 짧을 때는 맞았지만,
   * 도로명과 지번이 각각 세 줄씩 되는 시설(예: "경기도 수원시 장안구 천천로 100,
   * 천천동 롯데시네마타워 104,113,115,116,117,118,202호")에서는 내용이 109px 이라
   * 28px 이 틀 밖으로 삐져나왔습니다. 아래 테두리가 전화번호를 가로질러 그어지고
   * 그 밑의 쪽 번호까지 글자가 덮었습니다.
   *
   * 폭도 350px 으로 못박혀 있었습니다. 열이 415px 이고 좌우 여백이 30px 씩이라
   * 지금은 맞아떨어지지만, 열 폭이 바뀌면 그때부터 어긋납니다.
   */
  .placeWrap {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 80px;
    padding: 6px 0;
    box-sizing: border-box;
    background-color: #f5f5f5;
    border-bottom: 1px solid #575757;
    cursor: pointer;
  }

  .marker_comm {
    flex: none;
    display: inline-block;
    width: 58px;
    height: 70px;
    margin: 5px;
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

  /*
   * min-width: 0 이 있어야 줄어듭니다. flex 항목은 기본적으로 내용의 최소 너비
   * 아래로 안 줄어들어서, 이게 없으면 긴 주소가 줄을 통째로 밀어냅니다.
   */
  .place {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    padding: 10px 0px;
    .info {
      display: flex;
      align-items: center;
      padding: 5px 0px;
      gap: 5px;
      .title {
        font-weight: bold;
        /* 상호가 길어도 줄바꿈으로 흘러가게 둡니다. */
        word-break: keep-all;
        overflow-wrap: anywhere;
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
    /*
     * 주소에는 "104,113,115,116,117,118,202호" 처럼 띄어쓰기 없이 긴 토막이
     * 들어옵니다. keep-all 만 주면 그 토막이 안 끊겨 칸을 넘어가므로
     * overflow-wrap 을 같이 겁니다 (댓글 본문과 같은 조합).
     */
    .address,
    .tel {
      font-size: 10px;
      color: #575757;
      word-break: keep-all;
      overflow-wrap: anywhere;
    }
  }

  .noResults {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 30px;

    .emptyIcon {
      width: 96px;
      height: 96px;
      color: #9e9e9e;
    }
    p {
      border-top: solid black;
      border-bottom: solid black;
      padding: 10px;
      font-size: 20px;
      /* 상호가 긴 시설처럼 이 문구도 좁은 화면에서 줄이 바뀝니다. */
      text-align: center;
      word-break: keep-all;
    }
    .hint {
      padding-top: 10px;
      font-size: 12px;
      color: #767676;
      text-align: center;
      word-break: keep-all;
    }
  }

  .notPrepared {
    display: flex;
    align-items: center;
    font-size: 8px;
    color: #a0a0a0;
    .notIcon {
      font-size: 9px;
    }
  }
`;

export default ReviewPlaceList;
