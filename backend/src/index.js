const {
  setIO,
  setUserOnline,
  setUserOffline,
  getOnlineUserIds,
} = require("../socket");

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

const chatRoutes = require("./routes/chatRoutes");

const Message = require("./models/chat/message");
const ChatParticipant =
require(
"./models/chat/chatParticipant"
);
const User = require("./models/userIdentity/user");

const cors = require("cors");

app.set("trust proxy", 1);

const normalizeOrigin = (origin) => origin?.trim().replace(/\/$/, "");

const configuredFrontendOrigins = [
  process.env.FRONTEND_URL,
  process.env.PUBLIC_FRONTEND_URL,
  process.env.CLIENT_URL,
  process.env.APP_URL,
  process.env.FRONTEND_URLS,
]
  .filter(Boolean)
  .flatMap((origin) => origin.split(","))
  .map(normalizeOrigin)
  .filter(Boolean);

const allowedOrigins = new Set(
  [
    ...configuredFrontendOrigins,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",

  //capacitor
    "https://localhost",
"capacitor://localhost",
  ]
    .filter(Boolean)
    .map(normalizeOrigin)
    .filter(Boolean),
);

const corsOptions = {
  origin(origin, callback) {
    const normalizedOrigin = normalizeOrigin(origin);
    const allowUnconfiguredHttpsOrigin =
      configuredFrontendOrigins.length === 0 &&
      /^https:\/\//i.test(normalizedOrigin || "");

    if (
      !origin ||
      allowedOrigins.has(normalizedOrigin) ||
      allowUnconfiguredHttpsOrigin
    ) {
      return callback(null, true);
    }

    return callback(null, false);
  },

  credentials: true,
};

// CORS
app.use(cors(corsOptions));

// SOCKET
const io = new Server(server, {
  cors: corsOptions,
});

setIO(io);

// ================= SOCKET =================

io.on("connection", (socket) => {
  socket.activeRoom = null;

  const userId =
    socket.handshake.auth?.userId;

  if (userId) {
    socket.join(userId);
    if (setUserOnline(userId, socket.id)) {
      socket.broadcast.emit("presence_update", { userId, isOnline: true });
    }

    console.log(
      `User ${userId} joined`
    );
  }

  socket.emit(
    "welcome",
    "Socket connected successfully"
  );

  socket.on("request_presence", () => {
    socket.emit("presence_snapshot", getOnlineUserIds());
  });

  // WebRTC media stays between the two callers. The server only relays the
  // short-lived signaling messages required to establish that connection.
  socket.on("call_user", async ({ targetId, callId, mode }) => {
    if (!userId || !targetId || !callId || !["audio", "video"].includes(mode)) {
      return;
    }

    const [caller, target] = await Promise.all([
      User.findById(userId).select("name profilePicture collegeId").lean(),
      User.findById(targetId).select("collegeId").lean(),
    ]);

    if (!caller || !target || String(caller.collegeId) !== String(target.collegeId)) {
      return;
    }

    io.to(String(targetId)).emit("incoming_call", {
      callId,
      mode,
      caller: caller || { _id: userId, name: "Campus member" },
    });
  });

  socket.on("webrtc_offer", ({ targetId, callId, mode, sdp }) => {
    if (!userId || !targetId || !callId || !sdp) return;
    io.to(String(targetId)).emit("webrtc_offer", {
      fromId: userId,
      callId,
      mode,
      sdp,
    });
  });

  socket.on("webrtc_answer", ({ targetId, callId, sdp }) => {
    if (!userId || !targetId || !callId || !sdp) return;
    io.to(String(targetId)).emit("webrtc_answer", { fromId: userId, callId, sdp });
  });

  socket.on("webrtc_ice_candidate", ({ targetId, callId, candidate }) => {
    if (!userId || !targetId || !callId || !candidate) return;
    io.to(String(targetId)).emit("webrtc_ice_candidate", {
      fromId: userId,
      callId,
      candidate,
    });
  });

  socket.on("call_declined", ({ targetId, callId }) => {
    if (!userId || !targetId || !callId) return;
    io.to(String(targetId)).emit("call_declined", { fromId: userId, callId });
  });

  socket.on("call_end", ({ targetId, callId }) => {
    if (!userId || !targetId || !callId) return;
    io.to(String(targetId)).emit("call_end", { fromId: userId, callId });
  });

  // JOIN ROOM

  socket.on(
    "join_room",

    (roomId) => {
      if (
        socket.activeRoom
      ) {
        socket.leave(
          socket.activeRoom
        );
      }

      socket.activeRoom =
        String(roomId);

      socket.join(
        roomId
      );

      console.log(
        `User ${userId} active in room ${roomId}`
      );
    }
  );

  // LEAVE ROOM

  socket.on(
    "leave_room",

    (roomId) => {
      socket.leave(
        roomId
      );

      if (
        socket.activeRoom ===
        String(roomId)
      ) {
        socket.activeRoom =
          null;
      }

      console.log(
        `User ${userId} left room ${roomId}`
      );
    }
  );

  // TYPING

  socket.on(
    "typing",

    ({ roomId, user }) => {
      socket
        .to(roomId)
        .emit(
          "user_typing",
         {roomId,
        name: user,} 
        );
    }
  );

  socket.on(
    "stop_typing",

    (roomId) => {
      socket
        .to(roomId)
        .emit(
          "user_stop_typing"
        );
    }
  );

  // DELIVERED

  socket.on(
    "message_delivered",

    async ({
      messageId,
      roomId,
    }) => {
      try {
        await Message.findByIdAndUpdate(
          messageId,
          {
            status:
              "delivered",
          }
        );

        io.to(roomId).emit(
          "message_status",

          {
            messageId,

            status:
              "delivered",
          }
        );
      } catch (err) {
        console.log(err);
      }
    }
  );

  // SEEN

 socket.on(
  "message_seen",

  async ({
    roomId,
    userId,
  }) => {
    try {

      const updated =
        await Message.find({
          chatRoomId:
            roomId,

          sender: {
            $ne:
              userId,
          },

          status: {
            $in: [
              "sent",
              "delivered",
            ],
          },
        }).select(
          "_id"
        );

      await Message.updateMany(
        {
          _id: {
            $in:
              updated.map(
                (m) =>
                  m._id
              ),
          },
        },

        {
          status:
            "seen",
        }
      );

      // RESET UNREAD COUNT
      await ChatParticipant.updateOne(
        {
          chatRoomId:
            roomId,

          userId:
            userId,
        },

        {
          unreadCount:
            0,
        }
      );

      updated.forEach(
        (
          msg
        ) => {
          io.to(
            roomId
          ).emit(
            "message_status",

            {
              messageId:
                msg._id,

              status:
                "seen",
            }
          );
        }
      );

      // REFRESH BADGES
      io.to(
        userId
      ).emit(
        "chat_updated"
      );

    } catch (err) {
      console.log(
        err
      );
    }
  }
);

  socket.on(
    "disconnect",

    () => {
      if (setUserOffline(userId, socket.id)) {
        socket.broadcast.emit("presence_update", { userId, isOnline: false });
      }
      socket.activeRoom =
        null;

      console.log(
        "Disconnected:",
        socket.id
      );
    }
  );
});

// ================= END SOCKET =================

// Middleware

app.use(express.json());

app.use(cookierParser());

// Routes

app.use("/user", router);

app.use("/user", lostFoundRoutes);

app.use("/user", feedRoutes);

app.use("/chat", chatRoutes);

app.use((error, req, res, next) => {
  if (error?.name === "MulterError") {
    return res.status(400).json({ success: false, message: error.message });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Unable to upload this file.",
    });
  }

  return next();
});

// Start

const InitializeConnection = async () => {
  try {
    await main();

    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }

      console.log("Connected to MongoDB and Redis");
    } catch (redisError) {
      console.warn("Connected to MongoDB. Redis cache is unavailable:", redisError.message);
    }

    server.listen(
      process.env.PORT,

      () => {
        console.log(`Server is running on port ${process.env.PORT}`);
      },
    );
  } catch (err) {
    console.log(err);
  }
};

InitializeConnection();
