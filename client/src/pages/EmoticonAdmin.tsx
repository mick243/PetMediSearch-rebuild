import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import {
  createEmoticon,
  deleteEmoticon,
  emoticonImageUrl,
  getEmoticons,
} from '../apis/emoticon.api';
import { Emoticon } from '../types/emoticon.type';
import { apiErrorMessage } from '../utils/apiError';

/**
 * 올릴 수 있는 형식. 서버 imageType.js 의 SIGNATURES 와 같아야 합니다.
 * 서버는 이 이름이 아니라 파일 앞머리 바이트를 보고 다시 확인합니다.
 */
const ACCEPT = 'image/jpeg,image/png,image/gif';

/** 서버 controller/emoticon.js 의 MAX_EMOTICON_BYTES 와 같은 값이어야 합니다. */
const MAX_BYTES = 512 * 1024;

/**
 * 이모티콘 관리 — 관리자 전용 화면입니다.
 *
 * 마이페이지 안의 칸이 아니라 따로 둡니다. 마이페이지는 내 글·댓글·후기를 보러
 * 들르는 곳이고, 여기는 서비스 전체에 영향을 주는 자리라 성격이 다릅니다.
 * 들어오는 길은 마이페이지의 링크 하나뿐이고, 그 링크도 관리자에게만 보입니다.
 *
 * 고른 파일을 줄이거나 다시 굽지 않고 그대로 올립니다. canvas 로 다시 그리면
 * GIF 는 첫 장만 남아 움직임이 사라지고, PNG 는 투명한 배경이 검게 칠해집니다.
 * (반려동물 사진·후기 사진은 사용자가 찍은 원본이라 줄여 보내지만, 이모티콘은
 *  관리자가 미리 다듬어 올리는 것이라 손대지 않는 편이 맞습니다.)
 * 대신 크기 상한을 여기서 한 번, 서버에서 한 번 봅니다.
 */
function EmoticonAdmin() {
  const [emoticons, setEmoticons] = useState<Emoticon[]>([]);
  const [loading, setLoading] = useState(true);
  /* 못 불러온 것과 하나도 없는 것은 다른 상태입니다 (AccountSection 과 같은 이유). */
  const [loadFailed, setLoadFailed] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  /*
   * 지운 직후 목록의 그림을 다시 받아 오게 하는 값.
   *
   * 번호가 한 칸씩 당겨지면 같은 주소가 다른 그림을 뜻하게 되는데, 브라우저는
   * 1분간 들고 있던 것을 그대로 씁니다. 그러면 지운 자리부터 아래로 그림만
   * 한 칸씩 밀려 보입니다 — 이름은 맞는데 그림이 틀린 상태라 더 헷갈립니다.
   */
  const [imageBust, setImageBust] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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
  }, []);

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

  /*
   * 지우면 되돌릴 수 없고, 뒤엣것의 번호가 한 칸씩 당겨집니다.
   * 이미 올라간 댓글은 서버가 같은 순간에 함께 고쳐 주므로 밀리지 않습니다.
   * 화면 쪽 번호도 서버와 같은 규칙으로 다시 매겨, 새로고침 없이 맞춥니다.
   */
  const handleDelete = async (emoticon: Emoticon) => {
    const message =
      `'${emoticon.name}' 이모티콘을 삭제합니다.\n` +
      '되돌릴 수 없고, 뒤에 있는 이모티콘의 번호가 한 칸씩 당겨집니다.\n' +
      '이미 이 이모티콘을 쓴 댓글에는 (삭제된 이모티콘) 으로 표시됩니다.';
    if (!window.confirm(message)) return;

    setRemoving(emoticon.emoticon_id);
    try {
      await deleteEmoticon(emoticon.emoticon_id);
      setEmoticons((rows) =>
        rows
          .filter((row) => row.emoticon_id !== emoticon.emoticon_id)
          .map((row) =>
            row.emoticon_id > emoticon.emoticon_id
              ? { ...row, emoticon_id: row.emoticon_id - 1 }
              : row
          )
      );
      setImageBust(Date.now());
    } catch (error) {
      alert(apiErrorMessage(error, '이모티콘을 삭제하지 못했습니다.'));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <EmoticonAdminStyle>
      <header className="head">
        <h1>이모티콘 관리</h1>
        <Link to="/myprofile" className="back">
          마이페이지로
        </Link>
      </header>
      <p className="lead">
        여기 올린 것이 댓글 입력칸의 웃는 얼굴에 그대로 보입니다. JPG · PNG ·
        GIF 를 {MAX_BYTES / 1024}KB 까지 올릴 수 있고, 움직이는 GIF 는 움직이는
        채로 저장됩니다.
      </p>

      <form className="form" onSubmit={handleSubmit}>
        <label htmlFor="emoticon-file">이미지</label>
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
          placeholder="고르는 칸에 보이는 이름"
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

      <h2 className="listTitle">
        등록된 이모티콘{emoticons.length > 0 && ` ${emoticons.length}개`}
      </h2>

      {loading && <p className="notice">불러오는 중…</p>}
      {!loading && loadFailed && <p className="notice failed">{loadFailed}</p>}
      {!loading && !loadFailed && emoticons.length === 0 && (
        <p className="notice">아직 등록된 이모티콘이 없습니다.</p>
      )}

      {emoticons.length > 0 && (
        <ul className="list">
          {emoticons.map((emoticon) => (
            <li key={emoticon.emoticon_id}>
              {/* 번호는 지울 때마다 다시 매겨져 언제나 1부터 이어집니다. */}
              <span className="no">#{emoticon.emoticon_id}</span>
              <img
                src={emoticonImageUrl(emoticon.emoticon_id, imageBust)}
                alt={emoticon.name}
                loading="lazy"
              />
              <span className="name">{emoticon.name}</span>
              <button
                type="button"
                className="remove"
                disabled={removing !== null}
                onClick={() => handleDelete(emoticon)}
              >
                {removing === emoticon.emoticon_id ? '삭제 중…' : '삭제'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </EmoticonAdminStyle>
  );
}

export default EmoticonAdmin;

const EmoticonAdminStyle = styled.div`
  padding: 0 ${({ theme }) => theme.space.xl} ${({ theme }) => theme.space.xl};
  font-family: ${({ theme }) => theme.font.body};

  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: ${({ theme }) => theme.space.md};

    h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: ${({ theme }) => theme.color.text};
    }

    .back {
      flex: none;
      font-size: 13px;
      color: ${({ theme }) => theme.color.textMuted};
    }
  }

  .lead {
    margin: ${({ theme }) => theme.space.sm} 0 0;
    font-size: 13px;
    line-height: 1.6;
    color: ${({ theme }) => theme.color.textMuted};
    word-break: keep-all;
  }

  .form {
    display: flex;
    flex-direction: column;
    margin-top: ${({ theme }) => theme.space.xl};
    padding: ${({ theme }) => theme.space.lg};
    border: 1px solid ${({ theme }) => theme.color.border};
    border-radius: ${({ theme }) => theme.radius.sm};
    background-color: ${({ theme }) => theme.color.surfaceMuted};

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

  .listTitle {
    margin: ${({ theme }) => theme.space.xl} 0 0;
    font-size: 14px;
    font-weight: 700;
    color: ${({ theme }) => theme.color.text};
  }

  .notice {
    margin: ${({ theme }) => theme.space.md} 0 0;
    font-size: 13px;
    color: ${({ theme }) => theme.color.textMuted};
  }

  .notice.failed {
    color: ${({ theme }) => theme.color.danger};
  }

  .list {
    display: grid;
    gap: ${({ theme }) => theme.space.sm};
    margin: ${({ theme }) => theme.space.md} 0 0;
    padding: 0;
    list-style: none;

    li {
      display: grid;
      grid-template-columns: auto 40px minmax(0, 1fr) auto;
      align-items: center;
      gap: ${({ theme }) => theme.space.md};
      padding: ${({ theme }) => theme.space.sm};
      border: 1px solid ${({ theme }) => theme.color.border};
      border-radius: ${({ theme }) => theme.radius.sm};
      background-color: ${({ theme }) => theme.color.surface};
    }

    .no {
      font-size: 12px;
      color: ${({ theme }) => theme.color.textMuted};
      font-variant-numeric: tabular-nums;
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

      &:disabled {
        color: ${({ theme }) => theme.color.textMuted};
        cursor: default;
      }
    }
  }
`;
