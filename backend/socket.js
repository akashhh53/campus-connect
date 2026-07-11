let io;
const onlineUsers = new Map();

const setIO = (socketServer) => {
  io = socketServer;
};

const getIO = () => {
  if (!io) {
    throw new Error(
      "Socket.IO not initialized"
    );
  }

  return io;
};

const setUserOnline = (userId, socketId) => {
  if (!userId) return false;

  const key = String(userId);
  const sockets = onlineUsers.get(key) || new Set();
  const wasOffline = sockets.size === 0;
  sockets.add(socketId);
  onlineUsers.set(key, sockets);
  return wasOffline;
};

const setUserOffline = (userId, socketId) => {
  if (!userId) return false;

  const key = String(userId);
  const sockets = onlineUsers.get(key);
  if (!sockets) return false;

  sockets.delete(socketId);
  if (sockets.size > 0) return false;

  onlineUsers.delete(key);
  return true;
};

const isUserOnline = (userId) =>
  Boolean(userId && onlineUsers.get(String(userId))?.size);

const getOnlineUserIds = () => Array.from(onlineUsers.keys());

module.exports = {
  setIO,
  getIO,
  setUserOnline,
  setUserOffline,
  isUserOnline,
  getOnlineUserIds,
};
