import { Dispatch, SetStateAction, useState } from 'react';
import { FaStar } from 'react-icons/fa';
import styled from 'styled-components';

interface Props {
  rating: number; // reviewBox에서 전달받을 값
  interactive?: boolean;
  setClickRating?: Dispatch<SetStateAction<number>>; // reviewInput에서 사용할 때만 필요
}

function Star({ rating, interactive = false, setClickRating }: Props) {
  const ratingIndex = [1, 2, 3, 4, 5];
  const [clickRating, setClickRatingState] = useState<number>(rating);

  const handleClick = (rating: number) => {
    if (interactive && setClickRating) {
      setClickRating(rating); // 부모 컴포넌트의 상태 업데이트
      setClickRatingState(rating); // 클릭한 상태 업데이트
    }
  };

  return (
    <StarStyle>
      {ratingIndex.map((rating) => (
        <FaStar
          key={rating}
          className={rating <= clickRating ? 'active' : ''}
          onClick={() => handleClick(rating)}
        />
      ))}
      <div className="text">
        {interactive &&
          (rating === 5
            ? '아주 좋아요'
            : rating === 4
              ? '맘에 들어요'
              : rating === 3
                ? '보통이에요'
                : rating === 2
                  ? '그냥 그래요'
                  : '별로에요')}
      </div>
    </StarStyle>
  );
}

const StarStyle = styled.div`
  display: flex;
  font-size: 12px;
  align-items: center;

  svg {
    cursor: pointer;
    color: #c3c3c3;
    transition: color 0.3s;

    &.active {
      color: #575757;
    }
  }

  .text {
    padding: 0 5px;
  }
`;

export default Star;
