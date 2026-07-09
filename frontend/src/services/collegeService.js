import api from "../api/axios";

export const getColleges = async () => {
  const response = await api.get("/user/colleges");

  return response.data;
};
