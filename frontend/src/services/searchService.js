import api from "../api/axios";

// ✅ Updated with pagination
export const searchUsers = async (query, page = 1, limit = 20) => {
  const response = await api.get("/user/search/users", {
    params: {
      q: query,
      page,
      limit,
    },
  });

  return response.data;
};
