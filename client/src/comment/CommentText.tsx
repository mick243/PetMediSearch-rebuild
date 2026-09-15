import { useState } from 'react';
import styled from 'styled-components';
import { emoticonImageUrl } from '../apis/emoticon.api';
import { REMOVED_EMOTICON_ID, splitEmoticons } from '../utils/emoticon';

/**
 * 이모티콘 한 장.
 *
 * 지워진 자리(0번)는 요청도 보내지 않고 바로 글자로 그립니다. 그 밖에 못 불러온
 * 경우도 같은 글자로 답니다 — 옛 댓글이 깨진 그림 아이콘만 남기고 무슨 말이었는지
 * 알 수 없게 되는 것을 막습니다.
 * 목록에 있는지 미리 보지 않고 onError 로 처리하는 이유는, 목록을 아직 못 받은
 * 동안에도 그림은 뜨기 때문입니다 — 순서에 기대지 않습니다.
 */
function EmoticonImage({ id, name }: { id: number; name?: string }) {
  const [failed, setFailed] = useState(false);

  if (id <= REMOVED_EMOTICON_ID || failed)
    return <Missing>(삭제된 이모티콘)</Missing>;

  return (
    <Image
      src={emoticonImageUrl(id)}
      alt={name ?? '이모티콘'}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

interface Props {
  content: string;
  /** id → 이름. 대체 텍스트로 씁니다. 목록을 못 받았으면 비어 있습니다. */
  names: Map<number, string>;
}

/** 댓글 본문. [emoticon:12] 표시만 그림으로 바꿔 답니다. 나머지는 글자 그대로입니다. */
export default function CommentText({ content, names }: Props) {
  return (
    <>
      {splitEmoticons(content).map((part, i) =>
        part.kind === 'text' ? (
          part.text
        ) : (
          <EmoticonImage
            key={`${i}-${part.id}`}
            id={part.id}
            name={names.get(part.id)}
          />
        )
      )}
    </>
  );
}

/*
 * 크기는 긴 변 120px 로 맞춥니다. 모바일 열이 415px 이라 한 줄에 세 개까지
 * 들어오고, 그보다 크면 댓글 하나가 화면을 다 차지합니다.
 */
const Image = styled.img`
  max-width: 120px;
  max-height: 120px;
  vertical-align: middle;
`;

const Missing = styled.span`
  color: ${({ theme }) => theme.color.textMuted};
  font-size: 13px;
`;
