import { io } from "socket.io-client";
import { API_BASE_URL } from "../api/axios";

const socket = io(API_BASE_URL, {
  withCredentials: true,
  autoConnect: false,
});

export const connectSocket = (userId) => {
  if (!userId) return;

  if (socket.connected && String(socket.auth?.userId) === String(userId)) {
    return;
  }

  if (socket.connected) socket.disconnect();
  socket.auth = { userId };
  socket.connect();
};

export const disconnectSocket = () => {
  socket.disconnect();
};

export const joinRoom = (roomId) => {
  socket.emit("join_room", roomId);
};

export const leaveRoom = (roomId) => {
  socket.emit("leave_room", roomId);
};

export default socket;
