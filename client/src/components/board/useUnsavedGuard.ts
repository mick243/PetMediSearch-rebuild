import { useEffect, useRef } from 'react';
import { useBlocker, useNavigate } from 'react-router-dom';

/**
 * 쓰다 만 글을 두고 화면을 떠나려 할 때 한 번 물어봅니다.
 *
 * 예전에는 제목과 본문을 다 채운 뒤 뒤로 가기를 누르면 아무 말 없이 홈으로 갔고,
 * 쓰던 글은 그대로 사라졌습니다. 길게 쓴 글일수록 손해가 큽니다.
 *
 * 나가는 길이 두 가지라 둘 다 막습니다.
 *   - 앱 안에서 옮기는 것(뒤로 가기·메뉴) → 라우터의 useBlocker
 *   - 브라우저를 닫거나 새로고침 → beforeunload
 *
 * beforeunload 의 문구는 브라우저가 자기 것으로 바꿔 보여 줍니다. 우리가 정한
 * 문구는 앱 안에서 옮길 때만 쓰입니다.
 *
 * @param isDirty 지킬 것이 있는지 그 자리에서 판단하는 함수.
 *   값이 아니라 함수로 받습니다. 등록·취소로 나갈 때는 이미 한 번 물었으므로 또
 *   묻지 않아야 하는데, 그때 `setState` 로 끄면 navigate 가 같은 tick 에 일어나
 *   아직 이전 값이 남아 있습니다. 부를 때 읽으면 그 문제가 없습니다.
 * @param message 앱 안에서 옮길 때 보여 줄 문구.
 */
export function useUnsavedGuard(isDirty: () => boolean, message: string): void {
  const navigate = useNavigate();

  /* 렌더마다 새로 만들어지는 함수를 블로커·이벤트가 붙들지 않게 담아 둡니다. */
  const dirtyRef = useRef(isDirty);
  dirtyRef.current = isDirty;

  /*
   * "그래도 나갈래" 를 누른 뒤에는 통과시킵니다.
   *
   * proceed() 는 막았던 이동을 다시 실행하는데, 그때 이 판단 함수가 한 번 더
   * 불립니다. 그대로 두면 아직 쓰던 글이 남아 있으니 또 막혀서, 확인을 눌러도
   * 화면이 그 자리에 있었습니다.
   */
  const allowRef = useRef(false);

  /** 확인을 누른 뒤 실제로 옮겨 갈 자리. 리셋이 끝난 다음 tick 에 씁니다. */
  const pendingRef = useRef<string | null>(null);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowRef.current &&
      dirtyRef.current() &&
      currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    /*
     * blocker.proceed() 를 쓰지 않습니다.
     *
     * 뒤로 가기(POP)를 막으면 그 히스토리 칸은 이미 써 버린 뒤라, proceed() 로는
     * 그 이동을 되살리지 못합니다. 확인을 눌러도 화면이 그 자리에 남았습니다.
     * 막았던 목적지를 직접 들고 옮깁니다.
     *
     * 옮기는 일은 리셋이 끝난 뒤로 미룹니다. 같은 자리에서 reset() 과 navigate()
     * 를 잇달아 부르면 라우터가 아직 막는 중이라 그 이동을 삼킵니다 —
     * navigate 는 불리는데 주소가 그대로였습니다.
     */
    if (blocker.state === 'blocked') {
      if (window.confirm(message)) {
        const to = blocker.location;
        pendingRef.current = `${to.pathname}${to.search}${to.hash}`;
        allowRef.current = true;
      }
      blocker.reset();
      return;
    }

    const to = pendingRef.current;
    if (!to) return;
    pendingRef.current = null;
    // 뒤로 가려던 것이니 히스토리 칸을 새로 쌓지 않습니다.
    navigate(to, { replace: true });
  }, [blocker, message, navigate]);

  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current()) return;
      e.preventDefault();
      /* 옛 브라우저는 returnValue 를 봐야 물어봅니다. */
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, []);
}

/**
 * ReactQuill 이 빈 글을 `<p><br></p>` 로 주기 때문에, 문자열이 비었는지만 봐서는
 * 안 됩니다. 서버의 richTextHasContent(server/controller/validate.js)와 같은 판단입니다.
 */
export function richTextIsEmpty(html: string): boolean {
  return (
    html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim().length === 0
  );
}
