import { useRef } from 'react';
import styled from 'styled-components';
import { MdPhotoCamera } from 'react-icons/md';
import { shrinkToDataUrl } from '../../utils/image';

/** 서버(server/controller/review.js 의 MAX_IMAGES)와 같은 값이어야 합니다. */
export const MAX_IMAGES = 5;

/** 붙임 사진은 긴 변을 이 크기로 줄여 보냅니다. 화면에는 더 작게 보여 줍니다. */
const IMAGE_MAX_SIDE = 720;

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
}

/**
 * 후기에 붙일 사진을 고르는 칸. 후기 작성과 수정이 같이 씁니다.
 *
 * 고른 사진은 부모가 들고 있고 여기서는 바꿔 달라고만 합니다. 수정 화면에서
 * 이미 붙어 있던 사진과 새로 고른 사진을 한 목록으로 다뤄야 하기 때문입니다.
 */
function ReviewImagePicker({ images, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const room = MAX_IMAGES - images.length;

  const handlePick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // 한 번에 여러 장을 골라도 상한을 넘기지 않게 앞에서 자릅니다.
    const picked = Array.from(files).slice(0, room);
    const added: string[] = [];

    for (const file of picked) {
      if (!file.type.startsWith('image/')) continue;
      try {
        added.push(await shrinkToDataUrl(file, IMAGE_MAX_SIDE));
      } catch (error) {
        console.error('사진을 읽지 못했습니다:', error);
      }
    }

    if (added.length < picked.length) {
      alert('일부 파일은 사진이 아니거나 읽지 못해 빠졌습니다.');
    }
    if (added.length > 0) onChange([...images, ...added]);

    // 같은 파일을 다시 골라도 change 가 뜨도록 비워 둡니다.
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeAt = (index: number) =>
    onChange(images.filter((_, i) => i !== index));

  return (
    <PickerStyle>
      <div className="tools">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handlePick(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={room <= 0}
        >
          <MdPhotoCamera aria-hidden="true" />
          사진 첨부
        </button>
        <span className="count">
          {images.length}/{MAX_IMAGES}
        </span>
      </div>

      {images.length > 0 && (
        <ul className="thumbs">
          {images.map((src, index) => (
            <li key={src.slice(0, 64) + index}>
              <img src={src} alt={`첨부한 사진 ${index + 1}`} />
              <button
                type="button"
                aria-label={`사진 ${index + 1} 빼기`}
                onClick={() => removeAt(index)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </PickerStyle>
  );
}

const PickerStyle = styled.div`
  padding-top: 6px;

  .tools {
    display: flex;
    align-items: center;
    gap: 6px;

    button {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border: 1px solid #bdbdbd;
      border-radius: 999px;
      background-color: #f5f5f5;
      font-family: inherit;
      font-size: 11px;
      color: #333;
      cursor: pointer;
    }

    button:hover:enabled {
      background-color: #ebebeb;
    }

    button:disabled {
      opacity: 0.5;
      cursor: default;
    }

    .count {
      font-size: 11px;
      color: #575757;
      font-variant-numeric: tabular-nums;
    }
  }

  /* 고른 사진은 정방형 조각으로 늘어놓습니다. 원본 비율은 후기 화면에서 보입니다. */
  .thumbs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 6px 0 0;
    padding: 0;
    list-style: none;

    li {
      position: relative;
    }

    img {
      display: block;
      width: 56px;
      height: 56px;
      object-fit: cover;
      border-radius: 6px;
    }

    li button {
      position: absolute;
      top: -5px;
      right: -5px;
      width: 18px;
      height: 18px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background-color: rgba(0, 0, 0, 0.6);
      color: #fff;
      font-size: 10px;
      line-height: 1;
      cursor: pointer;
    }
  }
`;

export default ReviewImagePicker;
