import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    try {
      const stored =
        localStorage.getItem("userInfo");

      if (stored) {
        const userInfo =
          JSON.parse(stored);

        if (userInfo.accessToken) {
          config.headers.Authorization =
            `Bearer ${userInfo.accessToken}`;
        }
      }

      return config;

    } catch (err) {
      console.log("Token parse error", err);

      return config;
    }
  },

  (error) => Promise.reject(error)
);

export default axiosInstance;