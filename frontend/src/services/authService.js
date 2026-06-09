import axiosInstance from "../api/axios";

export const loginUser = async (userData) => {
  const response = await axiosInstance.post(
    "/user/login",
    userData
  );

  return response.data;
};

export const registerUser = async (userData) => {
  const response = await axiosInstance.post(
    "/user/register-user",
    userData
  );

  return response.data;
};