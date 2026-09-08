import styled from 'styled-components';

/**
 * 로딩 표시.
 *
 * 기존에는 출처가 불분명한 loadingLottie.json(416KB)을 lottie-react 로 재생했습니다.
 * 외부 에셋 없이 CSS 애니메이션으로 대체했습니다.
 */
function Spinner() {
  return <SpinnerStyle role="status" aria-label="불러오는 중" />;
}

const SpinnerStyle = styled.div`
  width: 44px;
  height: 44px;
  border: 4px solid #e3e3e3;
  border-top-color: #575757;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* 애니메이션을 줄이도록 설정한 사용자에게는 회전 대신 깜빡임으로 */
  @media (prefers-reduced-motion: reduce) {
    animation: pulse 1.4s ease-in-out infinite;

    @keyframes pulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.35;
      }
    }
  }
`;

export default Spinner;
