import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { RootState } from '../../store';
import {
  createEmoticon,
  deleteEmoticon,
  emoticonImageUrl,
  getEmoticons,
} from '../../apis/emoticon.api';
import { Emoticon } from '../../types/emoticon.type';
import { apiErrorMessage } from '../../utils/apiError';

/**
 * 올릴 수 있는 형식. 서버 controller/emoticon.js 의 SIGNATURES 와 같아야 합니다.
 * 서버는 이름이 아니라 파일 앞머리 바이트를 보고 다시 확인합니다.
 */
const ACCEPT = 'image/jpeg,image/png,image/gif';

/** 서버 controller/emoticon.js 의 MAX_EMOTICON_BYTES 와 같은 값이어야 합니다. */
const MAX_BYTES = 512 * 1024;

/**
 * 이모티콘 등록 칸 — 관리자에게만 보입니다.
 *
 * 고른 파일을 줄이거나 다시 굽지 않고 그대로 올립니다. canvas 로 다시 그리면
 * GIF 는 첫 장만 남아 움직임이 사라지고, PNG 는 투명한 배경이 검게 칠해집니다.
 * (반려동물 사진·후기 사진은 사용자가 찍은 원본이라 줄여 보내지만, 이모티콘은
 *  관리자가 미리 다듬어 올리는 것이라 손대지 않는 편이 맞습니다.)
 * 대신 크기 상한을 여기서 한 번, 서버에서 한 번 봅니다.
 */
function EmoticonAdminSection() {
  const user = useSelector((state: RootState) => state.auth.user);
  const isAdmin = user?.role === 'admin';

  const [emoticons, setEmoticons] = useState<Emoticon[]>([]);
  const [loading, setLoading] = useState(true);
  /* 못 불러온 것과 하나도 없는 것은 다른 상태입니다 (AccountSection 과 같은 이유). */
  const [loadFailed, setLoadFailed] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let alive = true;
    getEmoticons()
      .then((rows) => alive && setEmoticons(rows))
      .catch((error) => {
        console.error('이모티콘을 불러오는 중 오류 발생:', error);
        if (alive)
          setLoadFailed(
            apiErrorMessage(error, '이모티콘을 불러오지 못했습니다.')
          );
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [isAdmin]);

  if (!isAdmin) return null;

  const pickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSaveError(null);

    if (file.size > MAX_BYTES) {
      setImage(null);
      setSaveError(
        `${Math.round(file.size / 1024)}KB 입니다. ${MAX_BYTES / 1024}KB 이하로 줄여서 올려주세요.`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.onerror = () => setSaveError('파일을 읽지 못했습니다.');
    reader.readAsDataURL(file);

    /* 이름을 아직 안 적었으면 파일 이름에서 확장자만 떼어 채워 둡니다. */
    if (!name.trim()) setName(file.name.replace(/\.[^.]+$/, '').slice(0, 30));
  };

  const reset = () => {
    setName('');
    setImage(null);
    setSaveError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!image) {
      setSaveError('이미지를 골라주세요.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const added = await createEmoticon(name.trim(), image);
      setEmoticons((rows) => [...rows, added]);
      reset();
    } catch (error) {
      setSaveError(apiErrorMessage(error, '이모티콘을 등록하지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (emoticon: Emoticon) => {
    if (!window.confirm(`'${emoticon.name}' 이모티콘을 삭제하시겠습니까?`))
      return;
    try {
      await deleteEmoticon(emoticon.emoticon_id);
      setEmoticons((rows) =>
        rows.filter((row) => row.emoticon_id !== emoticon.emoticon_id)
      );
    } catch (error) {
      alert(apiErrorMessage(error, '이모티콘을 삭제하지 못했습니다.'));
    }
  };

  return (
    <EmoticonStyle>
      <div className="head">
        <p className="title">이모티콘 관리</p>
        <button
          type="button"
          className="edit"
          onClick={() => {
            /* 닫을 때는 고르던 것을 비웁니다. 다시 열었을 때 남아 있으면 헷갈립니다. */
            if (open) reset();
            setOpen(!open);
          }}
        >
          {open ? '닫기' : '등록'}
        </button>
      </div>

      {open && (
        <form className="form" onSubmit={handleSubmit}>
          <label htmlFor="emoticon-file">이미지 (JPG · PNG · GIF)</label>
          <input
            id="emoticon-file"
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            onChange={pickFile}
          />

          <label htmlFor="emoticon-name">이름</label>
          <input
            id="emoticon-name"
            type="text"
            value={name}
            maxLength={30}
            onChange={(e) => setName(e.target.value)}
            placeholder="피커에서 보이는 이름"
          />

          {image && (
            <div className="preview">
              {/* 움직이는 GIF 는 여기서도 그대로 움직입니다. */}
              <img src={image} alt="고른 이모티콘 미리보기" />
              <span>올린 그대로 저장됩니다</span>
            </div>
          )}

          {saveError && <p className="error">{saveError}</p>}

          <div className="actions">
            <button type="submit" className="save" disabled={saving}>
              {saving ? '등록하는 중…' : '등록'}
            </button>
          </div>
        </form>
      )}

      {loading && <p className="notice">불러오는 중…</p>}
      {!loading && loadFailed && <p className="notice failed">{loadFailed}</p>}
      {!loading && !loadFailed && emoticons.length === 0 && (
        <p className="notice">등록된 이모티콘이 없습니다.</p>
      )}

      {emoticons.length > 0 && (
        <ul className="list">
          {emoticons.map((emoticon) => (
            <li key={emoticon.emoticon_id}>
              <img
                src={emoticonImageUrl(emoticon.emoticon_id)}
                alt={emoticon.name}
                loading="lazy"
              />
              <span className="name">{emoticon.name}</span>
              <button
                type="button"
                className="remove"
                onClick={() => handleDelete(emoticon)}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </EmoticonStyle>
  );
}

export default EmoticonAdminSection;

const EmoticonStyle = styled.div`
  margin-bottom: ${({ theme }) => theme.space.xl};
  padding: ${({ theme }) => theme.space.lg};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.color.surfaceMuted};

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .title {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      color: ${({ theme }) => theme.color.text};
    }

    .edit {
      padding: 4px 12px;
      border: 1px solid ${({ theme }) => theme.color.borderStrong};
      border-radius: ${({ theme }) => theme.radius.pill};
      background-color: ${({ theme }) => theme.color.surface};
      font-family: inherit;
      font-size: 12px;
      color: ${({ theme }) => theme.color.text};
      cursor: pointer;
    }
  }

  .notice {
    margin: ${({ theme }) => theme.space.lg} 0 0;
    font-size: 13px;
    color: ${({ theme }) => theme.color.textMuted};
  }

  .notice.failed {
    color: ${({ theme }) => theme.color.danger};
  }

  .form {
    display: flex;
    flex-direction: column;
    margin-top: ${({ theme }) => theme.space.lg};

    label {
      margin-bottom: 4px;
      font-size: 13px;
      color: ${({ theme }) => theme.color.textMuted};
    }

    label + input {
      margin-bottom: ${({ theme }) => theme.space.md};
    }

    input[type='text'] {
      padding: 8px 10px;
      border: 1px solid ${({ theme }) => theme.color.border};
      border-radius: ${({ theme }) => theme.radius.sm};
      background-color: ${({ theme }) => theme.color.surface};
      font-family: inherit;
      font-size: 13px;
      color: ${({ theme }) => theme.color.text};
    }

    input[type='file'] {
      font-size: 12px;
      color: ${({ theme }) => theme.color.text};
    }

    .preview {
      display: flex;
      align-items: center;
      gap: ${({ theme }) => theme.space.md};
      padding: ${({ theme }) => theme.space.md};
      border: 1px solid ${({ theme }) => theme.color.border};
      border-radius: ${({ theme }) => theme.radius.sm};
      background-color: ${({ theme }) => theme.color.surface};

      img {
        max-width: 80px;
        max-height: 80px;
      }

      span {
        font-size: 12px;
        color: ${({ theme }) => theme.color.textMuted};
      }
    }

    .error {
      margin: ${({ theme }) => theme.space.sm} 0 0;
      font-size: 13px;
      color: ${({ theme }) => theme.color.danger};
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      margin-top: ${({ theme }) => theme.space.md};
    }

    .save {
      padding: 8px 16px;
      border: 0;
      border-radius: ${({ theme }) => theme.radius.pill};
      background-color: ${({ theme }) => theme.color.primary};
      color: ${({ theme }) => theme.color.textInverse};
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;

      &:disabled {
        background-color: ${({ theme }) => theme.color.border};
        color: ${({ theme }) => theme.color.textMuted};
        cursor: default;
      }
    }
  }

  .list {
    display: grid;
    gap: ${({ theme }) => theme.space.sm};
    margin: ${({ theme }) => theme.space.lg} 0 0;
    padding: 0;
    list-style: none;

    li {
      display: grid;
      grid-template-columns: 40px minmax(0, 1fr) auto;
      align-items: center;
      gap: ${({ theme }) => theme.space.md};
      padding: ${({ theme }) => theme.space.sm};
      border: 1px solid ${({ theme }) => theme.color.border};
      border-radius: ${({ theme }) => theme.radius.sm};
      background-color: ${({ theme }) => theme.color.surface};
    }

    img {
      max-width: 40px;
      max-height: 40px;
      justify-self: center;
    }

    .name {
      font-size: 13px;
      color: ${({ theme }) => theme.color.text};
      overflow-wrap: anywhere;
    }

    .remove {
      padding: 2px 8px;
      border: 1px solid ${({ theme }) => theme.color.borderStrong};
      border-radius: ${({ theme }) => theme.radius.pill};
      background-color: ${({ theme }) => theme.color.surface};
      color: ${({ theme }) => theme.color.danger};
      font-family: inherit;
      font-size: 12px;
      cursor: pointer;
    }
  }
`;
