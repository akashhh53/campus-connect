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
      const stored =
        localStorage.getItem(
          "userInfo",
        );

      if (stored) {
        const userInfo =
          JSON.parse(stored);

        if (
          userInfo.accessToken
        ) {
          config.headers.Authorization =
            `Bearer ${userInfo.accessToken}`;
        }
      }

      return config;
    } catch (err) {
      console.log(
        "TOKEN PARSE ERROR",
        err,
      );

      return config;
    }
  },

  (error) =>
    Promise.reject(error),
);

// RESPONSE

axiosInstance.interceptors.response.use(
  (response) =>
    response,

  async (error) => {
    const originalRequest =
      error.config;

    console.log(
      "STATUS:",
      error.response?.status,
    );

    if (
      error.response
        ?.status ===
        401 &&

      !originalRequest
        ?._retry
    ) {
      console.log(
        "401 DETECTED",
      );

      originalRequest._retry =
        true;

      try {
        console.log(
          "CALLING REFRESH",
        );

        const refresh =
          await axios.post(
            `${import.meta.env.VITE_API_BASE_URL}/user/refresh`,

            {},

            {
              withCredentials:
                true,
            },
          );

        console.log(
          "REFRESH SUCCESS",
          refresh.data,
        );

        const stored =
          JSON.parse(
            localStorage.getItem(
              "userInfo",
            ),
          );

        stored.accessToken =
          refresh.data.accessToken;

        localStorage.setItem(
          "userInfo",

          JSON.stringify(
            stored,
          ),
        );

        originalRequest.headers.Authorization =
          `Bearer ${refresh.data.accessToken}`;

        return axiosInstance(
          originalRequest,
        );
      } catch (err) {
        console.log(
          "REFRESH FAILED",
          err?.response
            ?.data,
        );

        return Promise.reject(
          err,
        );
      }
    }

    return Promise.reject(
      error,
    );
  },
);

export default axiosInstance;