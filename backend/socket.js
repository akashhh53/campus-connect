let io;

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

module.exports = {
  setIO,
  getIO,
};