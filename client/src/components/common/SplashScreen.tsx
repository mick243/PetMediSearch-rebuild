import { useEffect, useState } from 'react';
import styled from 'styled-components';
import Logo from './Logo';

/** 첫 진입에서 로고가 온전히 보이는 시간. */
const FIRST_MS = 2000;
/** 사라지는 데 걸리는 시간. */
const FADE_MS = 300;
/**
 * 이 시간 안에 로딩이 끝나면 아예 띄우지 않습니다.
 *
 * 다시 들어올 때는 대개 100ms 도 안 걸려서, 조건 없이 띄우면 화면이 한 번
 * 번쩍이고 맙니다. 그건 기다림을 덜어 주는 게 아니라 하나 더 만드는 것입니다.
 */
const GRACE_MS = 300;

/** 이번 방문에서 이미 인사를 했는지. 한 번의 방문 = 한 번의 세션입니다. */
const GREETED_KEY = 'petMediSearchGreeted';

/**
 * 첫 진입인지 보고, 맞으면 표시를 남깁니다.
 *
 * sessionStorage 라 탭을 닫았다 다시 열면 또 인사합니다. localStorage 로 두면
 * 한 번 본 사람은 다시는 못 보는데, 그건 "앱에 들어왔다" 는 느낌을 주는
 * 화면으로서는 맞지 않습니다.
 *
 * 시크릿 모드나 저장소를 막아 둔 브라우저에서는 읽기·쓰기가 그대로 던집니다.
 * 그때는 첫 진입으로 봅니다 — 인사가 한 번 더 뜨는 쪽이, 필요할 때 안 뜨는
 * 쪽보다 낫습니다.
 */
function takeFirstVisit() {
  try {
    if (sessionStorage.getItem(GREETED_KEY)) return false;
    sessionStorage.setItem(GREETED_KEY, '1');
    return true;
  } catch {
    return true;
  }
}

type Reason = 'first' | 'loading' | null;

/**
 * 앱을 덮는 화면. 세 가지 경우에만 뜹니다.
 *
 *   ① 첫 진입   — 이번 방문에 처음 들어왔을 때 2초
 *   ② 로딩      — 다시 들어왔는데 준비가 GRACE_MS 보다 오래 걸릴 때, 끝날 때까지
 *   ③ 연결 끊김 — 인터넷이 끊겨 있는 동안 계속. 돌아오면 저절로 사라집니다
 *
 * 앱을 **가리기만** 하고 막지는 않습니다. 뒤에서는 라우터가 이미 붙어 화면을
 * 그리고 데이터를 받아 옵니다 — 그래야 덮여 있는 동안이 그냥 기다리는 시간이
 * 아니라 홈이 준비되는 시간이 됩니다.
 *
 * 화면을 옮겨 다닐 때는 끼어들지 않습니다. App 은 페이지가 뜰 때 한 번
 * 마운트되고 라우팅으로는 다시 마운트되지 않습니다.
 *
 * JS 가 읽히기 전까지는 React 가 아무것도 그릴 수 없어 빈 화면이 잠깐 있습니다.
 * 그 구간이 눈에 띄지 않도록 배경색을 body 와 같은 값(App.css 의 --app-bg,
 * theme.color.bg)으로 맞춰 두었습니다.
 */
function SplashScreen() {
  /*
   * 첫 진입 판단은 마운트 때 딱 한 번만 합니다. 렌더마다 부르면 표시를 남기는
   * 쪽이 두 번 돌아, 개발 중 StrictMode 의 이중 렌더에서 첫 진입을 놓칩니다.
   */
  const [firstVisit] = useState(takeFirstVisit);
  const [reason, setReason] = useState<Reason>(firstVisit ? 'first' : null);
  const [offline, setOffline] = useState(() => !navigator.onLine);

  // ① 첫 진입 — 정해진 시간만 보여 줍니다.
  useEffect(() => {
    if (!firstVisit) return;
    const done = setTimeout(() => setReason(null), FIRST_MS);
    return () => clearTimeout(done);
  }, [firstVisit]);

  // ② 다시 들어왔을 때 — 느릴 때만, 끝날 때까지.
  useEffect(() => {
    if (firstVisit || document.readyState === 'complete') return;

    const show = setTimeout(() => {
      if (document.readyState !== 'complete') setReason('loading');
    }, GRACE_MS);

    const finish = () => {
      clearTimeout(show);
      setReason(null);
    };
    window.addEventListener('load', finish);
    return () => {
      clearTimeout(show);
      window.removeEventListener('load', finish);
    };
  }, [firstVisit]);

  /*
   * ③ 연결 끊김.
   *
   * navigator.onLine 이 false 면 확실히 끊긴 것이지만, true 라고 해서 우리 서버에
   * 닿는다는 뜻은 아닙니다(공유기에는 붙었는데 바깥이 안 되는 경우). 그래서 이
   * 화면은 "끊겼다" 만 알리고, 요청이 실패했을 때의 문구는 각 화면이 그대로
   * 맡습니다 (utils/apiError.ts).
   */
  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const visible = offline || reason !== null;

  /*
   * 사라질 때 바로 빼지 않고 페이드가 끝나기를 기다립니다.
   * DOM 에서 빼 두는 이유는, 투명하게만 두면 그 위를 누를 수 없기 때문입니다.
   */
  const [mounted, setMounted] = useState(visible);
  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    const remove = setTimeout(() => setMounted(false), FADE_MS);
    return () => clearTimeout(remove);
  }, [visible]);

  if (!mounted) return null;

  return (
    <SplashStyle
      $fading={!visible}
      // 연결이 끊긴 것은 알림이 아니라 지금 잘못된 상태라 alert 로 알립니다.
      role={offline ? 'alert' : 'status'}
      aria-label={offline ? '인터넷 연결 끊김' : '앱을 준비하는 중'}
    >
      <div className="mark">
        <Mark />
      </div>
      {offline ? (
        <>
          <p className="brand display">인터넷이 끊겼어요</p>
          <p className="tagline">연결되면 이 화면은 저절로 사라집니다.</p>
        </>
      ) : (
        <>
          <p className="brand display">PetMediSearch</p>
          <p className="tagline">우리 아이 곁의 병원·약국</p>
        </>
      )}
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
  padding: ${({ theme }) => theme.space.lg};
  text-align: center;

  /* body 와 같은 색입니다 (App.css 의 --app-bg). JS 가 읽히기 전 빈 화면과 이어집니다. */
  background-color: ${({ theme }) => theme.color.bg};

  opacity: ${({ $fading }) => ($fading ? 0 : 1)};
  transition: opacity ${FADE_MS}ms ease-out;

  /*
   * 사라지는 동안에는 누르는 것을 통과시킵니다. 아직 반투명하게 덮여 있는 사이에
   * 누른 것이 먹히지 않으면, 사용자에게는 앱이 한 번 무시한 것으로 보입니다.
   */
  pointer-events: ${({ $fading }) => ($fading ? 'none' : 'auto')};

  .mark {
    animation: splash-rise 700ms ease-out both;
  }

  .brand {
    margin: 0;
    font-family: ${({ theme }) => theme.font.display};
    font-size: 30px;
    line-height: 1.2;
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
