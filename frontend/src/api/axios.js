import axios from "axios";

const resolveApiBaseUrl = () => {
  const configuredBaseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_SERVER_URL ||
    "";

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  if (import.meta.env.DEV) {
    return "http://localhost:4000";
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }

  return "http://localhost:4000";
};

export const API_BASE_URL = resolveApiBaseUrl();
export const API_TIMEOUT_MS =
  Number(import.meta.env.VITE_API_TIMEOUT_MS) || 30000;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,

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
