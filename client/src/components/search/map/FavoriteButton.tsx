import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { HiOutlineStar, HiStar } from 'react-icons/hi2';
import { RootState } from '../../../store';
import {
  addFavorite,
  fetchFavorites,
  removeFavorite,
} from '../../../apis/favorites.api';
import { apiErrorMessage } from '../../../utils/apiError';

interface Props {
  facilityId: number;
}

/**
 * 지도 정보창의 즐겨찾기(★) 토글.
 * 로그인 전에는 눌렀을 때 로그인으로 보냅니다. 홈의 '즐겨찾기' 목록이 여기서 채워집니다.
 */
function FavoriteButton({ facilityId }: Props) {
  const isLogin = useSelector((s: RootState) => s.auth.isLogin);
  const navigate = useNavigate();
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLogin) return undefined;
    let alive = true;
    fetchFavorites()
      .then(
        (list) => alive && setOn(list.some((f) => f.facility_id === facilityId))
      )
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [isLogin, facilityId]);

  const toggle = async () => {
    if (!isLogin) {
      if (window.confirm('즐겨찾기는 로그인 후 쓸 수 있어요. 로그인할까요?'))
        navigate('/login');
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      if (on) await removeFavorite(facilityId);
      else await addFavorite(facilityId);
      setOn(!on);
    } catch (error: any) {
      alert(apiErrorMessage(error, '저장하지 못했습니다.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Star
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? '즐겨찾기 해제' : '즐겨찾기에 추가'}
      title={on ? '즐겨찾기 해제' : '즐겨찾기에 추가'}
      $on={on}
    >
      {on ? <HiStar /> : <HiOutlineStar />}
    </Star>
  );
}

const Star = styled.button<{ $on: boolean }>`
  display: flex;
  align-items: center;
  padding: 4px;
  border: 0;
  background: none;
  color: ${({ $on }) => ($on ? '#e0a400' : '#9e9e9e')};
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  &:hover {
    color: #e0a400;
  }
`;

export default FavoriteButton;
