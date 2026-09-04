import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { RootState } from '../../store';
import { PlaceData } from '../../types/place.type';
import { setSelectPlace } from '../../store/slices/placeSlice';
import PaginationComp from '../common/PaginationComp';
import { useState } from 'react';
import Programming from '../../assets/images/Programming.png';
import {
  MdDoNotDisturbOnTotalSilence,
  MdExpandCircleDown,
} from 'react-icons/md';
import MarkerSprites from '../../assets/images/MarkerSprites.png';

function ReviewPlaceList() {
  const dispatch = useDispatch();
  const { searchPlaceResults } = useSelector((state: RootState) => state.place);

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
          <img src={Programming} />
          <p>검색된 결과가 없습니다.</p>
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
  .placeWrap {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 350px;
    height: 80px;
    background-color: #f5f5f5;
    border-bottom: 1px solid #575757;
  }

  .marker_comm {
    display: inline-block;
    width: 58px;
    height: 70px;
    margin: 5px;
    background-image: url(${MarkerSprites});
    background-size: 232.6px 70px;
  }
  .marker_pharmacy {
    background-position: -58px 0px;
  }
  .marker_hospital {
    background-position: 0px 0px;
  }

  .place {
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
    .address {
      font-size: 10px;
      color: #575757;
    }

    .tel {
      font-size: 10px;
      color: #575757;
    }
  }

  .noResults {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 30px;

    img {
      width: 200px;
    }
    p {
      border-top: solid black;
      border-bottom: solid black;
      padding: 10px;
      font-size: 20px;
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
