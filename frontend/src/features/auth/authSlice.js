import { createSlice } from "@reduxjs/toolkit";

const userInfoFromStorage = localStorage.getItem("userInfo")
  ? JSON.parse(localStorage.getItem("userInfo"))
  : null;

const initialState = {
  user: userInfoFromStorage?.user || null,

  accessToken: userInfoFromStorage?.accessToken || null,

  isAuthenticated: userInfoFromStorage ? true : false,
};

const authSlice = createSlice({
  name: "auth",

  initialState,

  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;

      state.accessToken = action.payload.accessToken;

      state.isAuthenticated = true;

      localStorage.setItem("userInfo", JSON.stringify(action.payload));
    },

    logout: (state) => {

      state.user = null;

      state.accessToken = null;

      state.isAuthenticated = false;

      localStorage.removeItem("userInfo");
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;

export default authSlice.reducer;
