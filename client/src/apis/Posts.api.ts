import { PostState } from '../types/post.type';
import { httpClient } from './http';

export const getPosts = async (postId: number) => {
  try {
    const response = await httpClient.get<PostState[]>(`/posts/${postId}`);
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const addPosts = async (
  userId: number,
  title: string,
  content: string,
  category_id: string
) => {
  try {
    const response = await httpClient.post(`/posts`, {
      user_id: userId,
      title: title,
      content: content,
      category_id: category_id,
    });
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const deletePosts = async (post_id: number) => {
  try {
    const response = await httpClient.delete(`/posts/${post_id}`);
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const editPosts = async (
  post_id: number,
  changeTitle: string,
  changeContent: string
) => {
  try {
    const response = await httpClient.put(`/posts/${post_id}`, {
      title: changeTitle,
      content: changeContent,
    });
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
