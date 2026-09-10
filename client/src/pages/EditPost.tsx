import { useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { PostState } from '../types/post.type';
import {
  Actions,
  CancelBt,
  EditorBody,
  EditorFrame,
  EditorPage,
  QUILL_FORMATS,
  QUILL_MODULES,
  SubmitBt,
  TitleInput,
} from '../components/board/postEditor';

interface EditPostProps {
  post: PostState;
  onEdit: (post_id: number, updateTitle: string, updateContent: string) => void;
  onCancel: () => void;
}

/**
 * 글 수정 화면. 작성 화면과 같은 에디터 부품을 씁니다.
 *
 * 예전에는 마운트 시점에 editPosts(PUT) 를 호출해 값을 "불러오려" 했는데,
 * 그 API 는 저장용이라 빈 제목·내용으로 글을 덮어쓸 수 있었습니다.
 * 받은 post 로 초기값을 잡고, 저장은 onEdit 에서만 합니다.
 */
function EditPost({ post, onEdit, onCancel }: EditPostProps) {
  const [updateTitle, setUpdateTitle] = useState(post.title);
  const [updateContent, setUpdateContent] = useState(post.content);
  const quillRef = useRef<ReactQuill>(null);

  const handleEdit = () => {
    if (updateTitle.trim().length === 0) {
      alert('제목을 입력해주세요');
      return;
    }
    if (updateContent.length === 0) {
      alert('내용을 입력해 주세요');
      return;
    }
    onEdit(post.post_id, updateTitle, updateContent);
  };

  return (
    <EditorPage>
      <EditorBody onSubmit={(e) => e.preventDefault()}>
        <TitleInput
          id="title"
          aria-label="제목"
          value={updateTitle}
          onChange={(e) => setUpdateTitle(e.target.value)}
          placeholder="제목을 입력해주세요"
        />
        <EditorFrame>
          <ReactQuill
            ref={quillRef}
            value={updateContent}
            modules={QUILL_MODULES}
            formats={QUILL_FORMATS}
            onChange={setUpdateContent}
            theme="snow"
            placeholder="내용을 입력해주세요."
          />
        </EditorFrame>
      </EditorBody>

      <Actions>
        <CancelBt type="button" onClick={onCancel}>
          취소
        </CancelBt>
        <SubmitBt type="button" onClick={handleEdit}>
          수정
        </SubmitBt>
      </Actions>
    </EditorPage>
  );
}

export default EditPost;
