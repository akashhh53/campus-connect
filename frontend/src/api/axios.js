import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,

  withCredentials: true,

  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise = null;

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${API_BASE_URL}/user/refresh`,

        {},

        {
          withCredentials: true,
        },
      )
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

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
        const refresh = await refreshAccessToken();

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

        originalRequest.headers = originalRequest.headers || {};
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
