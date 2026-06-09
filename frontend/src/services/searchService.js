import api from "../api/axios";

// ✅ Updated with pagination
export const searchUsers = async (query, page = 1, limit = 20) => {
  const response = await api.get(
    `/user/search/users?q=${query}&page=${page}&limit=${limit}`
  );
  return response.data;
};