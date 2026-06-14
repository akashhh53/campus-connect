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
  "http://localhost:3000",
  {
    withCredentials: true,

    auth: {
      userId: user?.user?._id,
    },
  }
);

export default socket;