import api from "../api/axios";

export const getUserDetails = async (userId) => {
  const response = await api.get(`/user/users/${userId}`);
  return response.data;
};

export const getUserPosts = async (userId, page = 1, limit = 10) => {
  const response = await api.get(
    `/user/posts?authorId=${userId}&page=${page}&limit=${limit}`
  );
  return response.data;
};

// Add pagination support for followers
export const getFollowers = async (userId, page = 1, limit = 20) => {
  const response = await api.get(
    `/user/users/${userId}/followers?page=${page}&limit=${limit}`
  );
  return response.data;
};

// Add pagination support for following
export const getFollowing = async (userId, page = 1, limit = 20) => {
  const response = await api.get(
    `/user/users/${userId}/following?page=${page}&limit=${limit}`
  );
  return response.data;
};