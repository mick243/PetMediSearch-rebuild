import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { PostState } from '../types/post.type';
import Button from '../components/common/Button';
import ReactQuill from 'react-quill';
import { editPosts } from '../apis/Posts.api';

interface EditPostProps {
  post: PostState;
  onEdit: (post_id: number, updateTitle: string, updateContent: string) => void;
  onCancel: () => void;
}

function EditPost({ post, onEdit, onCancel }: EditPostProps) {
  const [updateTitle, setUpdateTitle] = useState<string>();
  const [updateContent, setUpdateContent] = useState<string>();
  const quillRef = useRef<ReactQuill>(null);

  const handleEdit = () => {
    onEdit(post.post_id, updateTitle, updateContent);
  };

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await editPosts(post.post_id, updateTitle, updateContent);
        setUpdateTitle(res.data.updateTitle);
        setUpdateContent(res.data.updateContent);
      } catch (error) {
        console.error(error);
      }
    };

    fetchPost();
  }, [post.post_id]);

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
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
        ],
      },
    }),
    []
  );
  const formats = [
    'size',
    'color',
    'background',
    'bold',
    'italic',
    'underline',
    'strike',
    'blockquote',
    'list',
    'bullet',
    'indent',
    'link',
    'image',
  ];

  return (
    <EditPostStyle>
      <Title>
        <label htmlFor="title">제목 : </label>
        <input
          id="title"
          value={updateTitle}
          onChange={(e) => setUpdateTitle(e.target.value)}
          placeholder="제목을 입력해주세요"
        ></input>
      </Title>
      <ReactQuill
        style={{ width: '100%', height: '500px' }}
        ref={quillRef}
        value={updateContent}
        modules={modules}
        formats={formats}
        onChange={setUpdateContent}
        theme="snow"
        placeholder="내용을 입력해주세요."
      />
      <EditButton>
        <div className="bttn">
          <Button size="small" scheme="positive" onClick={handleEdit}>
            수정
          </Button>
          <Button size="small" scheme="negative" onClick={onCancel}>
            취소
          </Button>
        </div>
      </EditButton>
    </EditPostStyle>
  );
}

const EditPostStyle = styled.div`
  .bttn {
    display: flex;
    justify-content: end;
    gap: 5px;
  }
`;

const Title = styled.div`
  margin-top: 10px;
  margin-bottom: 10px;
  height: 30px;
  #title {
    width: 88%;
    height: 30px;
  }
`;

const EditButton = styled.div`
  margin-top: 100px;
`;

export default EditPost;
