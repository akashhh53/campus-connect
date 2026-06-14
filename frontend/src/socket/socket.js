import { io } from "socket.io-client";

const stored =
  localStorage.getItem(
    "userInfo"
  );

const user =
  stored
    ? JSON.parse(stored)
    : null;

const socket = io(
  import.meta.env.VITE_API_BASE_URL,
  {
    withCredentials: true,
    auth: {
      userId: user?.user?._id,
    },
  }
);
export default socket;