import { useState } from 'react';
import styled from 'styled-components';

interface Props {
  src: string;
  /** 목록용 정사각 썸네일 / 대표글용 와이드 이미지 */
  variant: 'list' | 'hero';
}

/**
 * 본문에서 뽑은 대표 이미지.
 * 주소가 깨져 있으면 깨진 이미지 아이콘 대신 칸을 통째로 접습니다.
 */
function PostThumb({ src, variant }: Props) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;

  return (
    <Thumb
      $variant={variant}
      src={src}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}

const Thumb = styled.img<{ $variant: 'list' | 'hero' }>`
  display: block;
  object-fit: cover;
  background-color: ${({ theme }) => theme.color.surfaceMuted};
  border: 1px solid ${({ theme }) => theme.color.border};

  ${({ $variant, theme }) =>
    $variant === 'list'
      ? `
        width: 56px;
        height: 56px;
        border-radius: ${theme.radius.sm};
      `
      : `
        width: 100%;
        height: 160px;
        border-radius: ${theme.radius.sm};
      `}
`;

export default PostThumb;
