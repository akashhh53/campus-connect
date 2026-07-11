import axiosInstance from "../api/axios";

export const loginUser = async (userData) => {
  const response = await axiosInstance.post("/user/login", userData);

  return response.data;
};

export const registerUser = async (userData) => {
  const response = await axiosInstance.post("/user/register-user", userData);

  return response.data;
};

export const requestOtp = async (payload) => {
  const response = await axiosInstance.post("/user/request-otp", payload);

  return response.data;
};

export const verifyOtp = async (payload) => {
  const response = await axiosInstance.post("/user/verify-otp", payload);

  return response.data;
};

export const resendOtp = async (payload) => {
  const response = await axiosInstance.post("/user/resend-otp", payload);

  return response.data;
};

export const forgotPassword = async (payload) => {
  const response = await axiosInstance.post("/user/forgot-password", payload);

  return response.data;
};

export const resetPassword = async (payload) => {
  const response = await axiosInstance.post("/user/reset-password", payload);

  return response.data;
};

export const logoutUser = async () => {
  const response = await axiosInstance.post("/user/logout");

  return response.data;
};
