import axiosInstance from "../api/axios";

export const getFeedPosts = async (page = 1, limit = 10) => {
  const response = await axiosInstance.get(
    `/user/posts?page=${page}&limit=${limit}`,
  );

  return response.data;
};
export const createPost = async (postData) => {
  const response = await axiosInstance.post("/user/posts", postData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const savePost = async (postId) => {
  const response = await axiosInstance.post(`/user/posts/${postId}/save`);

  return response.data;
};

export const unsavePost = async (postId) => {
  const response = await axiosInstance.delete(`/user/posts/${postId}/save`);

  return response.data;
};

export const getPostById = async (id) => {
  const response = await axiosInstance.get(`/user/posts/${id}`);

  return response.data;
};

export const deletePost =
async (postId) => {
  const response =
    await axiosInstance.delete(
      `/user/posts/${postId}`
    );

  return response.data;
};