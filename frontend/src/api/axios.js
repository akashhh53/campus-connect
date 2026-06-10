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

      if (stored) {
        const userInfo = JSON.parse(stored);

        if (userInfo?.accessToken) {
          config.headers.Authorization = `Bearer ${userInfo.accessToken}`;
        }
      }

      return config;
    } catch {
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

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      try {
        const refresh = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/user/refresh`,

          {},

          {
            withCredentials: true,
          },
        );

        const stored = localStorage.getItem("userInfo");

        if (stored) {
          localStorage.setItem(
            "userInfo",

            JSON.stringify({
              ...JSON.parse(stored),

              accessToken: refresh.data.accessToken,
            }),
          );
        }

        originalRequest.headers.Authorization = `Bearer ${refresh.data.accessToken}`;

        return axiosInstance(originalRequest);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem("userInfo");

          window.location = "/login";
        }

        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
