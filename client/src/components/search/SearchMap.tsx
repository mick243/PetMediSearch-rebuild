import {
  CustomOverlayMap,
  Map,
  MapMarker,
  MarkerClusterer,
  useKakaoLoader,
} from 'react-kakao-maps-sdk';
import styled from 'styled-components';
import Loading from '../common/Loading';
import { useEffect, useRef, useState } from 'react';
import {
  HOSPITAL_MARKER,
  PHARMACY_MARKER,
  CURRENT_MARKER,
  MARKER_SIZE,
} from '../../utils/markerIcons';
import { PlaceData } from '../../types/place.type';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  setResults,
  setTransformedResults,
} from '../../store/slices/placeSlice';
import SearchMapOverlay from './map/SearchMapOverlay';
import SearchMapCategory from './map/SearchMapCategory';
import { fetchPlaces } from '../../apis/place.api';
import SearchMapControlBar from './map/SearchMapControlBar';
// '영업 중' 토글은 폐업 시설을 API 단계에서 걸러내면서 잠시 비활성화했습니다.
// import SearchMapToggle from './map/SearchMapToggle';
import { FaLocationCrosshairs } from 'react-icons/fa6';

/**
 * 한 화면에 그릴 마커 상한.
 * 클러스터러에 2만개를 한 번에 넘기면 RangeError(스택 오버플로)로 죽습니다.
 */
const MAX_MARKERS = 2000;

function SearchMap() {
  const dispatch = useDispatch();
  const [loading, error] = useKakaoLoader({
    appkey: import.meta.env.VITE_K_JAVASCRIPT_KEY,
    // MarkerClusterer 는 clusterer 라이브러리를 함께 받아야 동작합니다.
    libraries: ['clusterer'],
    // 기본값이 http 라서 HTTPS 로 배포하면 mixed content 로 차단됩니다.
    url: 'https://dapi.kakao.com/v2/maps/sdk.js',
  });
  const { searchPlaceResults, transformedResults, searchInputPlace } =
    useSelector((state: RootState) => state.place);


  const [selectedCategory, setSelectedCategory] = useState('allPlace');
  const [openedMarkerId, setOpenedMarkerId] = useState<number | null>(null);
  /*
   * 마지막으로 조회한 화면 범위.
   * 조회 결과가 들어오면 마커가 다시 그려지고 그 과정에서 idle 이 또 발생해
   * 같은 범위를 반복 조회하는 루프가 생깁니다. 같은 범위면 건너뜁니다.
   */
  const lastBoundsRef = useRef<string | null>(null);
  /*
   * 검색 결과로 옮겨간 지도 중심.
   * 검색은 전국을 대상으로 하는데 지도가 그대로 있으면 결과가 화면 밖에 남습니다.
   * center 가 제어 프롭이라 imperative 하게 setCenter 하면 리렌더에 되돌아가므로 상태로 둡니다.
   */
  const [searchCenter, setSearchCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  /** 어떤 검색어의 어떤 결과로 이미 옮겼는지. 같은 검색에 반복 이동하지 않도록. */
  const centeredForRef = useRef<string | null>(null);
  const [mapLevel, setMapLevel] = useState(7);
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  // const [onlyOpened, setOnlyIsOpened] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const isValidLatLng = (lat: number, lng: number) => {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  };

  const handleCurrentPositionClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCurrentPosition({ lat, lng });
        },
        (error) => {
          console.error('Error getting current position:', error);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  };

  useEffect(() => {
    handleCurrentPositionClick();
  }, []);

  /**
   * 지도 이동·확대가 멈추면 보이는 영역의 시설만 다시 불러옵니다.
   * 전국을 한 번에 받으면 응답이 13MB, 마커가 2만개가 되어 첫 렌더에 15초가 걸렸습니다.
   * 키워드 검색 중에는 결과가 덮이지 않도록 건너뜁니다.
   */
  const handleMapIdle = async (target: kakao.maps.Map) => {
    if (searchInputPlace) return;

    try {
      const bounds = target.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();

      // 소수 4자리(약 10m)까지 같으면 같은 화면으로 봅니다.
      const boundsKey = [sw.getLat(), sw.getLng(), ne.getLat(), ne.getLng()]
        .map((v) => v.toFixed(4))
        .join(',');
      if (lastBoundsRef.current === boundsKey) return;
      lastBoundsRef.current = boundsKey;

      const data = await fetchPlaces({
        swLat: sw.getLat(),
        swLng: sw.getLng(),
        neLat: ne.getLat(),
        neLng: ne.getLng(),
        limit: MAX_MARKERS,
      });
      dispatch(setResults(data));
    } catch (err) {
      console.error('화면 범위의 시설을 불러오던 중 오류 발생:', err);
    }
  };

  const handleMapCreate = (map: kakao.maps.Map) => {
    setMap(map);
    // idle 은 지도가 움직인 뒤에만 발생해서, 첫 진입에는 여기서 한 번 불러옵니다.
    handleMapIdle(map);
  };

  // const handleOnlyOpenedToggle = (toggleOnlyOpened: boolean) => {
  //   setOnlyIsOpened(toggleOnlyOpened);
  // };

  const handleMapLevelClick = (action: string) => {
    if (action === 'zoomIn') {
      setMapLevel((prev) => Math.max(prev - 1, 1));
    } else {
      setMapLevel((prev) => Math.min(prev + 1, 14));
    }
  };

  const handleMapTypeClick = (mapType: 'roadmap' | 'skyview') => {
    if (map) {
      if (mapType === 'roadmap') {
        map.removeOverlayMapTypeId(kakao.maps.MapTypeId.HYBRID); // 스카이뷰 제거
      } else if (mapType === 'skyview') {
        map.addOverlayMapTypeId(kakao.maps.MapTypeId.HYBRID); // 스카이뷰 추가
      }
    }
  };

  /**
   * 인포창은 한 번에 하나만 엽니다.
   * 다른 장소를 고르면 먼저 열려 있던 인포는 닫히고, 같은 장소를 다시 누르면 닫힙니다.
   * (이전에는 배열에 계속 쌓여 인포가 여러 개 겹쳐 떴습니다.)
   */
  const handleMarkerClick = (markerId: number) => {
    setOpenedMarkerId((prev) => (prev === markerId ? null : markerId));
  };

  useEffect(() => {
    /*
     * 예전에는 여기서 전국 데이터를 한 번에 받았습니다(응답 13MB, 마커 2만개).
     * 지금은 지도가 만들어진 직후 onIdle 이 보이는 영역만 불러옵니다.
     */
  }, [dispatch]);

  useEffect(() => {
    setOpenedMarkerId(null);

    /*
     * 좌표는 서버가 적재 시점에 WGS84 로 변환해 lat/lng 컬럼에 담아 보냅니다.
     * 이전에는 조회할 때마다 클라이언트가 3만여 건을 proj4 로 변환했습니다.
     * 아래에서 x/y 에 넣는 이유는 하위 컴포넌트가 x=위도, y=경도로 쓰고 있기 때문입니다.
     */
    const transformed = searchPlaceResults
      .map((place) => {
        const lat = Number(place.lat);
        const lng = Number(place.lng);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        if (!isValidLatLng(lat, lng)) return null;

        return { ...place, x: lat, y: lng };
      })
      .filter((place) => place !== null);

    dispatch(setTransformedResults(transformed as PlaceData[]));
  }, [dispatch, error, searchPlaceResults]);

  const filteredResults = transformedResults
    .filter((place) => {
      // if (onlyOpened && place.dtlstatenm !== '정상') {
      //   return false;
      // }

      if (selectedCategory === 'allPlace') return true;
      if (selectedCategory === 'onlyHospital') return place.type === '병원';
      if (selectedCategory === 'onlyPharmacy') return place.type === '약국';
      return false;
    })
    .filter((place) => isValidLatLng(place.x as number, place.y as number));

  /* 검색하면 첫 결과로 지도를 옮깁니다. 검색어를 비우면 다시 화면 범위 조회로 돌아갑니다. */
  useEffect(() => {
    if (!searchInputPlace) {
      centeredForRef.current = null;
      setSearchCenter(null);
      return;
    }

    const first = filteredResults[0];
    if (!first) return;

    const key = `${searchInputPlace}:${first.id}`;
    if (centeredForRef.current === key) return;
    centeredForRef.current = key;

    setSearchCenter({ lat: first.x as number, lng: first.y as number });
    // 너무 넓게 보고 있으면 결과가 보이도록 당겨줍니다. (숫자가 작을수록 확대)
    setMapLevel((level) => (level > 5 ? 5 : level));
  }, [searchInputPlace, filteredResults]);

  const openedPlace = filteredResults.find(
    (place) => place.id === openedMarkerId
  );

  return (
    <SearchMapStyle>
      {loading ? (
        <Loading />
      ) : (
        <div className="mapArea">
          <div className="resultsLength">
            검색된 시설의 개수:{' '}
            {filteredResults.length ? filteredResults.length : '-'}
          </div>
          <div className="mapwrap">
            <Map
              center={
                searchCenter ??
                (currentPosition
                  ? { lat: currentPosition.lat, lng: currentPosition.lng }
                  : { lat: 37.56729298121172, lng: 126.98014624989 })
              }
              style={{ width: '100%', height: '100%' }}
              level={mapLevel}
              onCreate={handleMapCreate}
              onIdle={handleMapIdle}
            >
              <SearchMapControlBar
                onClickZoom={handleMapLevelClick}
                onClickType={handleMapTypeClick}
              />
              {/* <SearchMapToggle
                onClick={handleOnlyOpenedToggle}
                onlyOpened={onlyOpened}
              /> */}
              {currentPosition && (
                <MapMarker
                  position={{
                    lat: currentPosition.lat,
                    lng: currentPosition.lng,
                  }}
                  image={{
                    src: CURRENT_MARKER,
                    size: MARKER_SIZE,
                  }}
                />
              )}
              {/*
                마커가 많으면 줌 레벨에 따라 묶어서 그립니다.
                minLevel 보다 확대하면 개별 마커로 풀립니다.
              */}
              <MarkerClusterer averageCenter={true} minLevel={5}>
                {filteredResults.map((place) => (
                  <MapMarker
                    key={`place-${place.id}`}
                    position={{
                      lat: place.x as number,
                      lng: place.y as number,
                    }}
                    image={{
                      src:
                        place.type === '병원'
                          ? HOSPITAL_MARKER
                          : PHARMACY_MARKER,
                      size: MARKER_SIZE,
                    }}
                    onClick={() => handleMarkerClick(place.id)}
                  />
                ))}
              </MarkerClusterer>

              {/* 인포창은 하나만 열리므로 클러스터러 밖에서 따로 그립니다. */}
              {openedPlace && (
                <CustomOverlayMap
                  position={{
                    lat: openedPlace.x as number,
                    lng: openedPlace.y as number,
                  }}
                >
                  <SearchMapOverlay
                    onClick={handleMarkerClick}
                    place={openedPlace}
                  />
                </CustomOverlayMap>
              )}
            </Map>
            <SearchMapCategory
              onClick={setSelectedCategory}
              selectedCategory={selectedCategory}
            />
            <FaLocationCrosshairs
              className="currentPosBttn"
              onClick={handleCurrentPositionClick}
            />
          </div>
        </div>
      )}
    </SearchMapStyle>
  );
}

const SearchMapStyle = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  box-sizing: border-box;
  /* 좌우 16px 여백만 두고 남은 폭을 모두 사용 */
  padding: 10px ${({ theme }) => theme.space.lg};

  .mapArea {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .mapwrap {
    position: relative;
    flex: 1;
    /* 카카오맵은 컨테이너 높이가 0 이면 타일을 그리지 않으므로 하한을 둠 */
    min-height: 320px;
    border-radius: ${({ theme }) => theme.radius.sm};
    overflow: hidden;
    /*
     * 지도 div 는 인라인으로 height:100% 를 받는데, flex 로 얻은 부모 높이에는
     * 백분율이 해석되지 않아 0 이 됩니다. 절대 배치로 부모를 그대로 채웁니다.
     * (컨트롤바 등 형제는 이미 absolute 라 영향 없음)
     */
    > div:first-of-type {
      position: absolute;
      inset: 0;
      height: auto;
    }
  }

  .resultsLength {
    font-size: 10px;
    padding-bottom: 5px;
    text-align: end;
  }

  .currentPosBttn {
    position: absolute;
    bottom: 5px;
    right: 5px;
    z-index: 10;

    background-color: white;
    padding: 4px;
    border: 1px solid #919191;
    border-radius: 8px;
    font-size: 20px;
    transition:
      background-color 0.3s,
      color 0.3s;

    &:hover {
      background-color: #c6cdbe;
      color: white;
    }
  }
`;

export default SearchMap;
