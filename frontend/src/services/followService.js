import api from "../api/axios";

export const followUser = async (userId) => {
  const response = await api.post(`/user/follow/${userId}`);

  return response.data;
};

export const unfollowUser = async (userId) => {
  const response = await api.delete(`/user/follow/${userId}`);

  return response.data;
};
