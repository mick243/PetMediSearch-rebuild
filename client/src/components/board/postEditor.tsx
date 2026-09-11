import { useMemo } from 'react';
import type ReactQuill from 'react-quill';
import styled from 'styled-components';
import { shrinkToDataUrl } from '../../utils/image';

/**
 * 글 작성·수정 화면이 함께 쓰는 에디터 설정과 스타일.
 *
 * 두 화면이 툴바·포맷·입력창·버튼을 각각 들고 있어서 한쪽만 고쳐지는 일이 잦았습니다.
 * 여기 모아두고 양쪽에서 가져다 씁니다.
 */

/*
 * 툴바를 두 줄로 나눠 둡니다.
 * 한 줄로 두면 415px 폭에서 제멋대로 접혀 아이콘 열이 어긋납니다.
 * 1줄: 글자 꾸밈 / 2줄: 문단(목록·들여쓰기·정렬)과 삽입.
 */
const TOOLBAR_CONTAINER = [
  ['bold', 'italic', 'underline', 'strike', 'blockquote'],
  [{ size: ['small', false, 'large', 'huge'] }, { color: [] }],
  [
    { list: 'ordered' },
    { list: 'bullet' },
    { indent: '-1' },
    { indent: '+1' },
    { align: [] },
  ],
  ['link', 'image'],
];

/**
 * 본문에 넣는 사진의 긴 변. 화면 폭이 415px 이라 2배 해상도까지 덮습니다.
 *
 * 기본 동작은 고른 파일을 **원본 그대로** base64 로 본문에 박아 넣습니다.
 * 요즘 휴대폰 사진이 3~5MB 라, 글 한 건이 그만큼 커지고 그 글이 목록에
 * 섞이면 목록 응답까지 같이 부풀어 오릅니다. 넣기 전에 줄입니다.
 */
const BODY_IMAGE_MAX_SIDE = 900;

/**
 * 에디터 설정. 사진을 줄여 넣으려면 에디터 인스턴스가 필요해 훅으로 둡니다.
 *
 * modules 는 매 렌더마다 새 객체를 주면 react-quill 이 툴바를 다시 만듭니다.
 * useMemo 로 한 번만 만듭니다.
 */
export function useQuillModules(quillRef: React.RefObject<ReactQuill>) {
  return useMemo(
    () => ({
      toolbar: {
        container: TOOLBAR_CONTAINER,
        handlers: {
          image() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file) return;

              const editor = quillRef.current?.getEditor();
              if (!editor) return;

              try {
                const dataUrl = await shrinkToDataUrl(
                  file,
                  BODY_IMAGE_MAX_SIDE
                );
                // 파일 고르는 사이 커서를 잃으므로 다시 잡습니다(true = 없으면 만듭니다).
                const range = editor.getSelection(true);
                editor.insertEmbed(range.index, 'image', dataUrl);
                editor.setSelection(range.index + 1, 0);
              } catch (error) {
                console.error('사진을 넣지 못했습니다:', error);
                alert('사진을 불러오지 못했습니다.');
              }
            };
            input.click();
          },
        },
      },
    }),
    [quillRef]
  );
}

// 'align' 이 빠져 있어 툴바의 정렬 버튼이 눌러도 반응이 없었습니다.
export const QUILL_FORMATS = [
  'size',
  'color',
  'background',
  'bold',
  'italic',
  'underline',
  'strike',
  'blockquote',
  'list',
  'indent',
  'align',
  'link',
  'image',
];

/*
 * Layout 이 min-height:100vh + justify-content:space-between 이라,
 * 화면이 남는 세로 공간을 가져가지 않으면 헤더와 콘텐츠 사이가 벌어집니다.
 * 여기서 받은 높이를 에디터까지 흘려보내 빈 공간을 에디터가 채웁니다.
 */
export const EditorPage = styled.section`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background-color: ${({ theme }) => theme.color.surface};
`;

export const EditorBody = styled.form`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.lg};
`;

export const TitleInput = styled.input`
  width: 100%;
  padding: ${({ theme }) => `${theme.space.sm} 0`};
  border: 0;
  border-bottom: 1px solid ${({ theme }) => theme.color.borderStrong};
  background: none;
  font-size: 17px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
  font-family: ${({ theme }) => theme.font.body};

  &::placeholder {
    color: ${({ theme }) => theme.color.textMuted};
    font-weight: 400;
  }

  &:focus {
    outline: none;
    border-bottom-color: ${({ theme }) => theme.color.primary};
  }
`;

export const EditorFrame = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 240px;

  /* react-quill 루트. 툴바 + 본문을 세로로 쌓고 본문이 남는 높이를 가져갑니다. */
  .quill {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .ql-toolbar.ql-snow {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 0;
    padding: ${({ theme }) => theme.space.sm};
    border: 1px solid ${({ theme }) => theme.color.border};
    border-radius: ${({ theme }) => theme.radius.sm}
      ${({ theme }) => theme.radius.sm} 0 0;
  }

  /* 두 그룹씩 한 줄. 열이 맞아야 줄이 바뀌어도 어긋나 보이지 않습니다. */
  .ql-toolbar.ql-snow .ql-formats {
    display: flex;
    align-items: center;
    margin-right: ${({ theme }) => theme.space.md};
  }

  .ql-container.ql-snow {
    flex: 1;
    min-height: 0;
    height: auto;
    overflow-y: auto;
    border: 1px solid ${({ theme }) => theme.color.border};
    border-top: 0;
    border-radius: 0 0 ${({ theme }) => theme.radius.sm}
      ${({ theme }) => theme.radius.sm};
    font-family: ${({ theme }) => theme.font.body};
    font-size: 14px;
  }

  .ql-editor.ql-blank::before {
    color: ${({ theme }) => theme.color.textMuted};
    font-style: normal;
  }
`;

export const Actions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => `0 ${theme.space.lg} ${theme.space.lg}`};
`;

const ActionBt = styled.button`
  height: 44px;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 15px;
  font-weight: 600;
  font-family: ${({ theme }) => theme.font.body};
  cursor: pointer;
  transition:
    background-color 0.15s,
    color 0.15s;
`;

export const SubmitBt = styled(ActionBt)`
  border: 0;
  background-color: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.textInverse};

  &:hover {
    background-color: ${({ theme }) => theme.color.primaryHover};
  }
`;

export const CancelBt = styled(ActionBt)`
  border: 1px solid ${({ theme }) => theme.color.borderStrong};
  background-color: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.text};

  &:hover {
    background-color: ${({ theme }) => theme.color.surfaceMuted};
  }
`;
