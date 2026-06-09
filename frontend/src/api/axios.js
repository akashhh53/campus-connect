import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,

  headers: {
    "Content-Type": "application/json",
  },

  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config) => {
    // FIX: use same key as authSlice
    const authData =
      localStorage.getItem("userInfo");

    if (authData) {
      const parsedData =
        JSON.parse(authData);

      const token =
        parsedData?.accessToken;

      if (token) {
        config.headers.Authorization =
          `Bearer ${token}`;
      }
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;