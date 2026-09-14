import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { HiBellAlert } from 'react-icons/hi2';
import {
  currentPushState,
  disablePush,
  enablePush,
  isInstalledApp,
  isIos,
  pushSupported,
} from '../../utils/push';
import { apiErrorMessage } from '../../utils/apiError';

/**
 * 접종·검진 알림 받기 스위치.
 *
 * 구독은 사람이 아니라 **이 브라우저**에 붙습니다. 휴대폰에서 켜도 노트북에는
 * 켜지지 않아서, 문구도 "이 기기에서" 로 씁니다.
 *
 * 켤 수 없는 경우가 두 가지라 문구를 갈라 줍니다. 뭉뚱그리면 아이폰 사용자가
 * "왜 안 되지" 로 끝나고, 홈 화면에 추가하면 된다는 것을 알 길이 없습니다.
 */
function PushToggle() {
  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const supported = pushSupported();
  /* 아이폰은 홈 화면에 추가해야 PushManager 가 생깁니다 (iOS 16.4+). */
  const needsInstall = !supported && isIos() && !isInstalledApp();
  const blocked =
    supported &&
    typeof Notification !== 'undefined' &&
    Notification.permission === 'denied';

  useEffect(() => {
    let alive = true;
    currentPushState()
      .then((state) => alive && setOn(state))
      .catch(() => undefined)
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  /*
   * 결과가 뻔한 조작이라 화면부터 바꾸고 보냅니다. 실패하면 되돌립니다.
   * 다만 켤 때는 권한 창이 떠서 사용자가 거절할 수 있으므로, 그때도 되돌립니다.
   */
  const toggle = async () => {
    if (busy || blocked || !supported) return;
    const next = !on;

    setBusy(true);
    setOn(next);
    try {
      if (next) {
        const granted = await enablePush();
        if (!granted) {
          setOn(false);
          alert('브라우저에서 알림을 허용해야 받을 수 있어요.');
        }
      } else {
        await disablePush();
      }
    } catch (error) {
      setOn(!next);
      alert(apiErrorMessage(error, '알림 설정을 바꾸지 못했습니다.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <HiBellAlert aria-hidden="true" />
      <div>
        <Label>접종·검진 알림</Label>
        <Hint>
          {needsInstall
            ? '아이폰은 공유 → "홈 화면에 추가" 후에 받을 수 있어요.'
            : !supported
              ? '이 브라우저는 알림을 지원하지 않아요.'
              : blocked
                ? '브라우저 설정에서 이 사이트의 알림을 허용해 주세요.'
                : '이 기기로 3일·2일·1일 전에 알려드려요.'}
        </Hint>
      </div>
      <Switch
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="접종·검진 알림 받기"
        disabled={!ready || busy || blocked || !supported}
        $on={on}
        onClick={toggle}
      >
        <Knob $on={on} />
      </Switch>
    </Box>
  );
}

const Box = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: ${({ theme }) => theme.space.md};
  align-items: center;
  padding: ${({ theme }) => theme.space.md};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.color.surfaceMuted};
  font-size: 18px;
  color: ${({ theme }) => theme.color.textMuted};
`;

const Label = styled.strong`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
`;

const Hint = styled.span`
  display: block;
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.35;
  color: ${({ theme }) => theme.color.textMuted};
`;

const Switch = styled.button<{ $on: boolean }>`
  position: relative;
  flex: none;
  width: 46px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  background-color: ${({ theme, $on }) =>
    $on ? theme.color.success : theme.color.borderStrong};
  cursor: pointer;
  transition: background-color 0.15s;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

/* 색만으로 켜짐을 알리지 않도록 손잡이 위치도 함께 움직입니다. */
const Knob = styled.span<{ $on: boolean }>`
  position: absolute;
  top: 3px;
  left: ${({ $on }) => ($on ? '23px' : '3px')};
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.color.surface};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  transition: left 0.15s;
`;

export default PushToggle;
