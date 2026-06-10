import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,

  withCredentials: true,

  headers: {
    "Content-Type": "application/json",
  },
});

// REQUEST

axiosInstance.interceptors.request.use(
  (config) => {
    try {
      const stored = localStorage.getItem("userInfo");

      console.log("REQUEST userInfo:", stored);

      if (stored) {
        const userInfo = JSON.parse(stored);

        if (userInfo?.accessToken) {
          config.headers.Authorization = `Bearer ${userInfo.accessToken}`;
        }
      }

      return config;
    } catch (err) {
      console.log("REQUEST ERROR", err);

      return config;
    }
  },

  (error) => Promise.reject(error),
);

// RESPONSE

axiosInstance.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    console.log("API ERROR:", error.response?.status, originalRequest?.url);

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      console.log("STARTING REFRESH");

      try {
        const refresh = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/user/refresh`,

          {},

          {
            withCredentials: true,
          },
        );

        console.log("REFRESH SUCCESS", refresh.data);

        const stored = localStorage.getItem("userInfo");

        console.log("BEFORE UPDATE:", stored);

        if (stored) {
          const userInfo = JSON.parse(stored);

          userInfo.accessToken = refresh.data.accessToken;

          localStorage.setItem(
            "userInfo",

            JSON.stringify(userInfo),
          );

          console.log("AFTER UPDATE:", localStorage.getItem("userInfo"));
        }

        originalRequest.headers.Authorization = `Bearer ${refresh.data.accessToken}`;

        return axiosInstance(originalRequest);
      } catch (err) {
        console.log(
          "REFRESH FAILED",
          err?.response?.status,
          err?.response?.data,
        );

        console.log("BEFORE REMOVE:", localStorage.getItem("userInfo"));

        if (err.response?.status === 401) {
          console.error("REFRESH 401 — KEEPING STORAGE FOR DEBUG");

          // localStorage.removeItem("userInfo");

          // window.location = "/login";
        }

        console.log("AFTER REMOVE:", localStorage.getItem("userInfo"));

        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
