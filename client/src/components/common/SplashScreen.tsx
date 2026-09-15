import { useEffect, useState } from 'react';
import styled from 'styled-components';
import Logo from './Logo';

/** 로고가 온전히 보이는 시간. */
const SHOW_MS = 2400;
/** 사라지는 데 걸리는 시간. 합쳐서 2.8초쯤 보입니다. */
const FADE_MS = 400;

type Phase = 'show' | 'fading' | 'gone';

/**
 * 앱에 들어올 때 잠깐 덮는 화면.
 *
 * 앱을 **가리기만** 하고 막지는 않습니다. 뒤에서는 라우터가 이미 붙어 화면을
 * 그리고 데이터를 받아 옵니다 — 그래야 이 2.4초가 그냥 기다리는 시간이 아니라
 * 홈이 준비되는 시간이 됩니다. 덮은 뒤에 앱을 띄우면 그만큼 통째로 늦어집니다.
 *
 * 한 번만 뜹니다. App 은 페이지가 뜰 때 한 번 마운트되고 화면을 옮겨 다녀도
 * 다시 마운트되지 않아서, 라우팅할 때마다 끼어들지 않습니다.
 *
 * JS 가 읽히기 전까지는 React 가 아무것도 그릴 수 없어 빈 화면이 잠깐 있습니다.
 * 그 구간이 눈에 띄지 않도록 배경색을 body 와 같은 값(App.css 의 --app-bg,
 * theme.color.bg)으로 맞춰 두었습니다.
 */
function SplashScreen() {
  const [phase, setPhase] = useState<Phase>('show');

  useEffect(() => {
    const startFade = setTimeout(() => setPhase('fading'), SHOW_MS);
    const remove = setTimeout(() => setPhase('gone'), SHOW_MS + FADE_MS);
    return () => {
      clearTimeout(startFade);
      clearTimeout(remove);
    };
  }, []);

  // DOM 에서 아예 빼 둡니다. 투명하게만 두면 그 위를 누를 수 없습니다.
  if (phase === 'gone') return null;

  return (
    <SplashStyle
      $fading={phase === 'fading'}
      role="status"
      aria-label="앱을 준비하는 중"
    >
      <div className="mark">
        <Mark />
      </div>
      <p className="brand display">PetMediSearch</p>
      <p className="tagline">우리 아이 곁의 병원·약국</p>
    </SplashStyle>
  );
}

const SplashStyle = styled.div<{ $fading: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 100;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space.md};

  /* body 와 같은 색입니다 (App.css 의 --app-bg). JS 가 읽히기 전 빈 화면과 이어집니다. */
  background-color: ${({ theme }) => theme.color.bg};

  opacity: ${({ $fading }) => ($fading ? 0 : 1)};
  transition: opacity ${FADE_MS}ms ease-out;

  /*
   * 사라지는 동안에는 누르는 것을 통과시킵니다. 아직 반투명하게 덮여 있는 0.4초
   * 사이에 누른 것이 먹히지 않으면, 사용자에게는 앱이 한 번 무시한 것으로 보입니다.
   */
  pointer-events: ${({ $fading }) => ($fading ? 'none' : 'auto')};

  .mark {
    animation: splash-rise 700ms ease-out both;
  }

  .brand {
    margin: 0;
    font-family: ${({ theme }) => theme.font.display};
    font-size: 30px;
    line-height: 1;
    color: ${({ theme }) => theme.color.text};
    animation: splash-rise 700ms ease-out 120ms both;
  }

  .tagline {
    margin: 0;
    font-size: 13px;
    color: ${({ theme }) => theme.color.textMuted};
    animation: splash-rise 700ms ease-out 240ms both;
  }

  @keyframes splash-rise {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  /*
   * 애니메이션을 줄이도록 설정한 사용자에게는 움직임을 빼고 그냥 보여 줍니다
   * (Spinner 와 같은 판단). 사라질 때의 페이드는 자리 이동이 없어 그대로 둡니다.
   */
  @media (prefers-reduced-motion: reduce) {
    .mark,
    .brand,
    .tagline {
      animation: none;
    }
  }
`;

/*
 * Logo 는 자기 스타일에 색을 박아 두고 있습니다. styled(Logo) 로 감싸면
 * className 이 전달되면서 우선순위가 이쪽으로 넘어와, 크기와 색을 여기서 정합니다.
 */
const Mark = styled(Logo)`
  width: 76px;
  color: ${({ theme }) => theme.color.primary};
`;

export default SplashScreen;
