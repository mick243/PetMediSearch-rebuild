import { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  canStartPull,
  PULL_THRESHOLD,
  pullDistance,
  shouldRefresh,
} from '../../utils/pullToRefresh';

/**
 * 페이지 맨 위에서 아래로 당기면 새로고침합니다.
 *
 * 터치 이벤트에만 반응하므로 마우스만 있는 화면에서는 아무 일도 하지 않습니다.
 * 브라우저 자체의 당겨서 새로고침(Android Chrome)과 겹치지 않도록 App.css 에서
 * `overscroll-behavior-y: contain` 을 걸어 두었습니다. 둘이 같이 돌면 새로고침이
 * 두 번 일어납니다.
 *
 * 어디서 당기면 안 되는지는 utils/pullToRefresh.ts 의 canStartPull 이 정합니다.
 */
export default function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  /* 리스너는 한 번만 붙이므로 최신 당김 거리는 ref 로 봅니다. */
  const pullRef = useRef(0);
  const start = useRef<{ x: number; y: number } | null>(null);

  const apply = (next: number) => {
    pullRef.current = next;
    setPull(next);
  };

  useEffect(() => {
    const reset = () => {
      start.current = null;
      apply(0);
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || !canStartPull(e.target, window.scrollY)) {
        start.current = null;
        return;
      }
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY };
    };

    const onMove = (e: TouchEvent) => {
      if (!start.current || e.defaultPrevented) return;
      const t = e.touches[0];
      const dx = t.clientX - start.current.x;
      const dy = t.clientY - start.current.y;

      /* 아직 당기기 전인데 가로로 더 움직였으면 탭 넘기기 같은 가로 스와이프입니다. */
      if (pullRef.current === 0 && Math.abs(dx) > Math.abs(dy)) {
        start.current = null;
        return;
      }
      /* 당기다가 페이지가 실제로 스크롤됐으면 그냥 스크롤이었던 것입니다. */
      if (window.scrollY > 0) {
        reset();
        return;
      }
      apply(pullDistance(dy));
    };

    const onEnd = () => {
      if (!start.current) return;
      start.current = null;
      if (shouldRefresh(pullRef.current)) {
        setRefreshing(true);
        window.location.reload();
        return;
      }
      apply(0);
    };

    /* passive: 스크롤을 막지 않습니다. 브라우저 새로고침은 CSS 로 막아 두었습니다. */
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', reset);
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', reset);
    };
  }, []);

  if (pull === 0 && !refreshing) return null;

  const progress = Math.min(1, pull / PULL_THRESHOLD);

  return (
    <Track aria-hidden="true">
      <Bubble
        $y={refreshing ? PULL_THRESHOLD : pull}
        $armed={refreshing || progress >= 1}
        style={{ opacity: refreshing ? 1 : 0.3 + progress * 0.7 }}
      >
        <Spinner
          $spin={refreshing}
          style={{
            transform: refreshing ? undefined : `rotate(${progress * 360}deg)`,
          }}
        />
      </Bubble>
    </Track>
  );
}

/* 415px 열의 가운데에 맞춥니다. 뷰포트 가운데가 아닙니다 — Layout 이 그 폭으로 정렬돼 있습니다. */
const Track = styled.div`
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 415px;
  pointer-events: none;
  z-index: 40;
`;

const Bubble = styled.div<{ $y: number; $armed: boolean }>`
  position: absolute;
  top: 0;
  left: 50%;
  width: 36px;
  height: 36px;
  margin-left: -18px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.color.surface};
  border: 1px solid
    ${({ theme, $armed }) =>
      $armed ? theme.color.primary : theme.color.border};
  box-shadow: ${({ theme }) => theme.shadow.md};
  /* 표시기가 손가락보다 36px 위에서 시작해 당긴 만큼 내려옵니다. */
  transform: translateY(${({ $y }) => $y - 36}px);
`;

const turn = keyframes`
  to { transform: rotate(360deg); }
`;

const Spinner = styled.span<{ $spin: boolean }>`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid ${({ theme }) => theme.color.border};
  border-top-color: ${({ theme }) => theme.color.primary};
  animation: ${({ $spin }) => ($spin ? turn : 'none')} 0.8s linear infinite;
`;
