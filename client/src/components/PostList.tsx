import { PostState } from '../types/post.type';
import { useNavigate } from 'react-router-dom';

interface Props {
  post: PostState[];
}

const PostList = ({ post }: Props) => {
  const navigate = useNavigate();

  const handleTitleClick = (post_id: number) => {
    navigate(`/posts/${post_id}`);
  };

  return (
    <>
      {post.map((item) => (
        <p onClick={() => handleTitleClick(item.post_id)} key={item.post_id}>
          {item.title} {item.username}
        </p>
      ))}
    </>
  );
};
export default PostList;
