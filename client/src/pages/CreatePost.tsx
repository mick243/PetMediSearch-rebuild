import { useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import CreateCategory from '../components/board/CreateCategory';
import {
  Actions,
  CancelBt,
  EditorBody,
  EditorFrame,
  EditorPage,
  QUILL_FORMATS,
  useQuillModules,
  SubmitBt,
  TitleInput,
} from '../components/board/postEditor';
import {
  useUnsavedGuard,
  richTextIsEmpty,
} from '../components/board/useUnsavedGuard';
import { RootState } from '../store';
import { addPosts } from '../apis/Posts.api';
import { apiErrorMessage } from '../utils/apiError';

const CreatePost = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  /** 등록·취소로 나갈 때는 이미 한 번 물었으므로 또 묻지 않습니다. */
  const leavingRef = useRef(false);
  /** 따로 고르지 않으면 통합(1)에 올라갑니다. */
  const [categoryId, setCategoryId] = useState<number | null>(1);
  const quillRef = useRef<ReactQuill>(null);
  const modules = useQuillModules(quillRef);
  const user = useSelector((state: RootState) => state.auth.user);

  useUnsavedGuard(
    () =>
      !leavingRef.current &&
      (title.trim().length > 0 || !richTextIsEmpty(content)),
    '쓰던 글이 사라집니다. 그래도 나가시겠습니까?'
  );

  const formSubmit = async () => {
    if (categoryId == null) {
      alert('분류를 선택해주세요');
      return;
    }
    if (title.trim().length === 0) {
      alert('제목을 입력해주세요');
      return;
    }
    if (content.length === 0) {
      alert('내용을 입력해 주세요');
      return;
    }
    if (!window.confirm('게시글을 등록하시겠습니까?')) return;

    try {
      await addPosts(user.id, title, content, String(categoryId));
      alert('게시글이 등록되었습니다.');
      leavingRef.current = true;
      navigate(`/posts?categoryId=${categoryId}`);
    } catch (error) {
      console.error(error);
      alert(apiErrorMessage(error, '게시글을 등록하지 못했습니다.'));
    }
  };

  const formCancel = () => {
    if (window.confirm('게시글 작성을 취소하시겠습니까?')) {
      leavingRef.current = true;
      navigate('/posts');
    }
  };

  return (
    <EditorPage>
      <CreateCategory selectedId={categoryId} onSelect={setCategoryId} />

      <EditorBody onSubmit={(e) => e.preventDefault()}>
        <TitleInput
          id="title"
          aria-label="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력해주세요"
        />
        <EditorFrame>
          <ReactQuill
            ref={quillRef}
            value={content}
            modules={modules}
            formats={QUILL_FORMATS}
            onChange={setContent}
            theme="snow"
            placeholder="내용을 입력해주세요."
          />
        </EditorFrame>
      </EditorBody>

      <Actions>
        <CancelBt type="button" onClick={formCancel}>
          취소
        </CancelBt>
        <SubmitBt type="button" onClick={formSubmit}>
          등록
        </SubmitBt>
      </Actions>
    </EditorPage>
  );
};

export default CreatePost;
