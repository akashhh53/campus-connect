import api from "../api/axios";

// ✅ Updated with pagination
export const getComments = async (postId, page = 1, limit = 20) => {
  const response = await api.get(
    `/user/posts/${postId}/comments?page=${page}&limit=${limit}`
  );
  return response.data;
};

export const addComment = async (postId, content) => {
  const response = await api.post(
    `/user/posts/${postId}/comments`,
    { content }
  );
  return response.data;
};

export const replyToComment = async (commentId, content, replyToUser) => {
  const response = await api.post(
    `/user/comments/${commentId}/reply`,
    {
      content,
      replyToUser,
    }
  );
  return response.data;
};

export const likeComment = async (commentId) => {
  const response = await api.post(
    `/user/comments/${commentId}/like`
  );
  return response.data;
};

export const unlikeComment = async (commentId) => {
  const response = await api.delete(
    `/user/comments/${commentId}/like`
  );
  return response.data;
};

export const deleteComment = async (commentId) => {
  const response = await api.delete(
    `/user/comments/${commentId}`
  );
  return response.data;
};