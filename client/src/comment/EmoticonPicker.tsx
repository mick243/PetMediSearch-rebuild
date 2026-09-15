import { RefObject, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { emoticonImageUrl } from '../apis/emoticon.api';
import { Emoticon } from '../types/emoticon.type';

interface Props {
  emoticons: Emoticon[];
  loading: boolean;
  /** 목록을 못 받았을 때의 문구. 빈 목록과 구분합니다. */
  failed: string | null;
  /** 이 피커를 여는 버튼. 그 버튼을 누른 것은 '바깥'으로 치지 않습니다. */
  anchorRef: RefObject<HTMLElement>;
  onPick: (emoticon: Emoticon) => void;
  onClose: () => void;
}

/**
 * 이모티콘 고르는 판. 입력창 바로 위에 뜹니다.
 *
 * 화면 아래에 떠 있는 입력창(Composer)의 자식이라, 뷰포트가 아니라 그 415px 열에
 * 맞춰 뜹니다 — 넓은 화면에서 판만 왼쪽 끝에 붙는 일이 없습니다.
 */
export default function EmoticonPicker({
  emoticons,
  loading,
  failed,
  anchorRef,
  onPick,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    /*
     * 여는 버튼을 눌렀을 때는 여기서 닫지 않습니다. 닫고 나면 이어서 그 버튼의
     * onClick 이 다시 열어, 눌러도 안 닫히는 것처럼 보입니다.
     */
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [anchorRef, onClose]);

  return (
    <Panel ref={panelRef} role="group" aria-label="이모티콘 고르기">
      {loading && <Notice>불러오는 중…</Notice>}
      {!loading && failed && <Notice className="failed">{failed}</Notice>}
      {!loading && !failed && emoticons.length === 0 && (
        <Notice>아직 등록된 이모티콘이 없습니다.</Notice>
      )}

      {emoticons.length > 0 && (
        <Grid>
          {emoticons.map((emoticon) => (
            <Pick
              key={emoticon.emoticon_id}
              type="button"
              title={emoticon.name}
              onClick={() => onPick(emoticon)}
            >
              <img
                src={emoticonImageUrl(emoticon.emoticon_id)}
                alt={emoticon.name}
                loading="lazy"
              />
            </Pick>
          ))}
        </Grid>
      )}
    </Panel>
  );
}

const Panel = styled.div`
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  max-height: 232px;
  overflow-y: auto;
  padding: ${({ theme }) => theme.space.md};
  box-sizing: border-box;
  background-color: ${({ theme }) => theme.color.surface};
  border-top: 1px solid ${({ theme }) => theme.color.border};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  box-shadow: ${({ theme }) => theme.shadow.md};
`;

const Notice = styled.p`
  margin: 0;
  padding: ${({ theme }) => theme.space.lg} 0;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textMuted};

  &.failed {
    color: ${({ theme }) => theme.color.danger};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
  gap: ${({ theme }) => theme.space.sm};
`;

const Pick = styled.button`
  display: grid;
  place-items: center;
  aspect-ratio: 1 / 1;
  padding: 4px;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: none;
  cursor: pointer;

  img {
    max-width: 100%;
    max-height: 100%;
  }

  &:hover,
  &:focus-visible {
    border-color: ${({ theme }) => theme.color.border};
    background-color: ${({ theme }) => theme.color.surfaceMuted};
  }
`;
