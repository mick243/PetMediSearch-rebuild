import {
  CustomOverlayMap,
  Map,
  MapMarker,
  useKakaoLoader,
} from 'react-kakao-maps-sdk';
import styled from 'styled-components';
import Loading from '../common/Loading';
import { useEffect, useState } from 'react';
import MarkerSprites from '../../assets/images/MarkerSprites.png';
import { PlaceData } from '../../types/place.type';
import proj4 from 'proj4';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  setResults,
  setTransformedResults,
} from '../../store/slices/placeSlice';
import React from 'react';
import SearchMapOverlay from './map/SearchMapOverlay';
import SearchMapCategory from './map/SearchMapCategory';
import { fetchPlaces } from '../../apis/place.api';
import SearchMapControlBar from './map/SearchMapControlBar';
import SearchMapToggle from './map/SearchMapToggle';
import { FaLocationCrosshairs } from 'react-icons/fa6';

proj4.defs(
  'EPSG:5181',
  '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs'
);

const latOffset = 0.0028;
const lngOffset = 0.0009;

const applyOffset = (
  lat: number,
  lng: number,
  latOffset: number,
  lngOffset: number
) => {
  return {
    lat: lat + latOffset,
    lng: lng + lngOffset,
  };
};

function SearchMap() {
  const dispatch = useDispatch();
  const [loading, error] = useKakaoLoader({
    appkey: import.meta.env.VITE_K_JAVASCRIPT_KEY,
  });
  const { searchPlaceResults, transformedResults } = useSelector(
    (state: RootState) => state.place
  );

  const imgSize = { width: 36.25, height: 43.75 };
  const spriteSize = { width: 145.375, height: 43.75 };

  const currentOrigin = { x: 72.5, y: 0 };
  const hospitalOrigin = { x: 0, y: 0 };
  const pharmacyOrigin = { x: 37.5, y: 0 };

  const [selectedCategory, setSelectedCategory] = useState('allPlace');
  const [openedMarkers, setOpenedMarkers] = useState<number[]>([]);
  const [mapLevel, setMapLevel] = useState(7);
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [onlyOpened, setOnlyIsOpened] = useState(false);
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

  const handleMapCreate = (map: kakao.maps.Map) => {
    setMap(map);
  };

  const handleOnlyOpenedToggle = (toggleOnlyOpened: boolean) => {
    setOnlyIsOpened(toggleOnlyOpened);
  };

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

  const handleMarkerClick = (markerId: number) => {
    if (openedMarkers.includes(markerId)) {
      setOpenedMarkers(openedMarkers.filter((id) => id !== markerId));
    } else {
      setOpenedMarkers([...openedMarkers, markerId]);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const data = await fetchPlaces({});
        dispatch(setResults(data));
      } catch (error) {
        console.error('초기 위치를 불러오던 중 오류 발생:', error);
      }
    };
    loadInitialData();
  }, [dispatch]);

  useEffect(() => {
    setOpenedMarkers([]);

    const transformed = searchPlaceResults
      .map((place) => {
        const x = Number(place.x);
        const y = Number(place.y);

        if (place.x === null || place.y === null) {
          return null;
        }

        if (!isNaN(x) && !isNaN(y) && isFinite(x) && isFinite(y)) {
          try {
            const [lng, lat] = proj4('EPSG:5181', 'EPSG:4326', [x, y]);

            const adjustedCoords = applyOffset(
              parseFloat(lat.toFixed(10)),
              parseFloat(lng.toFixed(10)),
              latOffset,
              lngOffset
            );

            if (isValidLatLng(adjustedCoords.lat, adjustedCoords.lng)) {
              return {
                ...place,
                x: adjustedCoords.lat,
                y: adjustedCoords.lng,
              };
            } else {
              console.warn(
                `변환된 좌표 범위 오류 발생: ${place.id}:`,
                adjustedCoords.lat,
                adjustedCoords.lng
              );
              return null;
            }
          } catch (projError) {
            console.error(`좌표 변환 중 오류 발생:  ${place.id}:`, projError);
            return null;
          }
        } else {
          console.warn(`좌표 오류 발생: ${place.id}`, place);
          return null;
        }
      })
      .filter((place) => place !== null);

    dispatch(setTransformedResults(transformed as PlaceData[]));
  }, [dispatch, error, searchPlaceResults]);

  const filteredResults = transformedResults
    .filter((place) => {
      if (onlyOpened && place.dtlstatenm !== '정상') {
        return false;
      }

      if (selectedCategory === 'allPlace') return true;
      if (selectedCategory === 'onlyHospital') return place.type === '병원';
      if (selectedCategory === 'onlyPharmacy') return place.type === '약국';
      return false;
    })
    .filter((place) => isValidLatLng(place.x as number, place.y as number));

  return (
    <SearchMapStyle>
      {loading ? (
        <Loading />
      ) : (
        <div>
          <div className="resultsLength">
            검색된 시설의 개수:{' '}
            {filteredResults.length ? filteredResults.length : '-'}
          </div>
          <div className="mapwrap">
            <Map
              center={
                currentPosition
                  ? { lat: currentPosition.lat, lng: currentPosition.lng }
                  : { lat: 37.56729298121172, lng: 126.98014624989 }
              }
              style={{ width: '350px', height: '500px' }}
              level={mapLevel}
              onCreate={handleMapCreate}
            >
              <SearchMapControlBar
                onClickZoom={handleMapLevelClick}
                onClickType={handleMapTypeClick}
              />
              <SearchMapToggle
                onClick={handleOnlyOpenedToggle}
                onlyOpened={onlyOpened}
              />
              {currentPosition && (
                <MapMarker
                  position={{
                    lat: currentPosition.lat,
                    lng: currentPosition.lng,
                  }}
                  image={{
                    src: MarkerSprites,
                    size: imgSize,
                    options: {
                      spriteSize: spriteSize,
                      spriteOrigin: currentOrigin,
                    },
                  }}
                />
              )}
              {filteredResults.map((place) => (
                <React.Fragment key={`place-${place.id}`}>
                  <MapMarker
                    position={{
                      lat: place.x as number,
                      lng: place.y as number,
                    }}
                    image={{
                      src: MarkerSprites,
                      size: imgSize,
                      options: {
                        spriteSize: spriteSize,
                        spriteOrigin:
                          place.type === '병원'
                            ? hospitalOrigin
                            : pharmacyOrigin,
                      },
                    }}
                    onClick={() => handleMarkerClick(place.id)}
                  />
                  {openedMarkers.includes(place.id) && (
                    <CustomOverlayMap
                      position={{
                        lat: place.x as number,
                        lng: place.y as number,
                      }}
                    >
                      <SearchMapOverlay
                        onClick={handleMarkerClick}
                        place={place}
                      />
                    </CustomOverlayMap>
                  )}
                </React.Fragment>
              ))}
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
  padding-top: 10px;
  padding-bottom: 10px;

  .mapwrap {
    position: relative;
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
