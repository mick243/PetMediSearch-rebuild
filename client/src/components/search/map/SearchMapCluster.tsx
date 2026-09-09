import styled from 'styled-components';

interface Props {
  count: number;
  hospitalCount: number;
  pharmacyCount: number;
  onClick: () => void;
}

/**
 * 서버가 격자로 묶어준 시설 개수를 보여주는 풍선.
 *
 * 개별 마커를 limit 으로 잘라 보내면 잘려나간 지역이 지도에서 사라집니다.
 * 줌이 넓을 때는 이 풍선으로 화면 전체를 빠짐없이 덮고, 확대하면 개별 마커로 바뀝니다.
 */
function SearchMapCluster({ count, hospitalCount, pharmacyCount, onClick }: Props) {
  // 개수에 따라 크기를 키워 밀집도가 한눈에 보이도록
  const size = count >= 1000 ? 62 : count >= 300 ? 54 : count >= 50 ? 46 : 38;
  const label = count >= 1000 ? `${Math.round(count / 100) / 10}천` : String(count);

  return (
    <ClusterStyle
      $size={size}
      onClick={onClick}
      title={`병원 ${hospitalCount} · 약국 ${pharmacyCount}`}
      role="button"
      aria-label={`이 지역 시설 ${count}곳. 병원 ${hospitalCount}곳, 약국 ${pharmacyCount}곳`}
    >
      <span className="count">{label}</span>
    </ClusterStyle>
  );
}

const ClusterStyle = styled.div<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-sizing: border-box;

  background-color: ${({ theme }) => theme.color.primary};
  border: 3px solid ${({ theme }) => theme.color.surface};
  box-shadow: ${({ theme }) => theme.shadow.md};
  transition: transform 0.15s;

  .count {
    color: ${({ theme }) => theme.color.textInverse};
    font-size: ${({ $size }) => ($size >= 54 ? 15 : 13)}px;
    font-weight: 700;
    line-height: 1;
  }

  &:hover {
    transform: scale(1.08);
  }
`;

export default SearchMapCluster;
