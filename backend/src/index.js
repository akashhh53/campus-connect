const { setIO } = require("../socket");

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
require("dotenv").config();

const main = require("./config/db");
const cookierParser = require("cookie-parser");
const router = require("./routes/userauth");
const redisClient = require("./config/redis");
const lostFoundRoutes = require("./routes/lostFoundRoutes");
const feedRoutes = require("./routes/feedRoutes");

const cors = require("cors");

app.use(
  cors({
    origin: [process.env.FRONTEND_URL,"http://localhost:5173"],
    credentials: true,
  })
);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL,
      "http://localhost:5173",
    ],
    credentials: true,
  },
});
setIO(io);
io.on("connection", (socket) => {
  
  const userId =
    socket.handshake.auth?.userId;

  if (userId) {
    socket.join(userId);

    console.log(
      `User ${userId} joined`
    );
  }

  socket.emit(
    "welcome",
    "Socket connected successfully"
  );

  socket.on("disconnect", () => {
    console.log(
      "Disconnected:",
      socket.id
    );
  });
});
// Middleware
app.use(express.json());

app.use(cookierParser());

app.use("/user", router);
app.use("/user", lostFoundRoutes);
app.use("/user", feedRoutes);

const InitializeConnection = async () => {
  try {
    await Promise.all([main(), redisClient.connect()]);

    console.log("Connected to MongoDB and Redis");

    server.listen(process.env.PORT, () => {
      console.log(`Server is running on port ${process.env.PORT}`);
    });
  } catch (err) {
    console.log(err);
  }
};

InitializeConnection();