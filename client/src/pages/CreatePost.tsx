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
  QUILL_MODULES,
  SubmitBt,
  TitleInput,
} from '../components/board/postEditor';
import { RootState } from '../store';
import { addPosts } from '../apis/Posts.api';

const CreatePost = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  /** 따로 고르지 않으면 통합(1)에 올라갑니다. */
  const [categoryId, setCategoryId] = useState<number | null>(1);
  const quillRef = useRef<ReactQuill>(null);
  const user = useSelector((state: RootState) => state.auth.user);

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
      navigate(`/posts?categoryId=${categoryId}`);
    } catch (error) {
      console.error(error);
    }
  };

  const formCancel = () => {
    if (window.confirm('게시글 작성을 취소하시겠습니까?')) {
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
            modules={QUILL_MODULES}
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
