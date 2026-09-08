import styled from 'styled-components';

/**
 * PetMediSearch 로고 마크 — 지도 핀 + 발바닥.
 *
 * 기존에는 출처가 불분명한 logoLottie.json(1.7MB)을 lottie-react 로 재생했습니다.
 * 외부 에셋 없이 인라인 SVG 로 대체했고, 색은 currentColor 를 따릅니다.
 */
interface Props {
  className?: string;
}

function Logo({ className }: Props) {
  return (
    <LogoStyle
      className={className}
      viewBox="0 0 48 60"
      role="img"
      aria-label="PetMediSearch"
    >
      <path
        d="M24 2C12.4 2 3 11.4 3 23c0 14.3 17.4 32.6 19.4 34.7a2.2 2.2 0 0 0 3.2 0C27.6 55.6 45 37.3 45 23 45 11.4 35.6 2 24 2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinejoin="round"
      />
      <ellipse cx="24" cy="27.5" rx="7" ry="5.6" fill="currentColor" />
      <circle cx="14.6" cy="19.6" r="3.1" fill="currentColor" />
      <circle cx="20.4" cy="14.6" r="3.1" fill="currentColor" />
      <circle cx="27.6" cy="14.6" r="3.1" fill="currentColor" />
      <circle cx="33.4" cy="19.6" r="3.1" fill="currentColor" />
    </LogoStyle>
  );
}

const LogoStyle = styled.svg`
  display: block;
  height: auto;
  color: #575757;
`;

export default Logo;
