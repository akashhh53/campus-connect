import api from "../api/axios";

export const reactToPost =
  async (postId, type) => {

    const response =
      await api.post(
        `/user/posts/${postId}/reactions`,
        { type }
      );

    return response.data;
};

export const removeReaction =
  async (postId) => {

    const response =
      await api.delete(
        `/user/posts/${postId}/reactions`
      );

    return response.data;
};