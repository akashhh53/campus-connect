const ChatRoom = require("../models/chat/chatRoom");

const ChatParticipant = require("../models/chat/chatParticipant");
const Message = require("../models/chat/message");

const { getIO } = require("../../socket");

const createOrOpenRoom = async (req, res) => {
  try {
    const user = req.user;

    const { recipientId } = req.body || {};

    if (!recipientId) {
      return res.status(400).json({
        success: false,

        message: "recipientId is required",
      });
    }

    const myRooms = await ChatParticipant.find({
      userId: user._id,
    }).select("chatRoomId");

    const roomIds = myRooms.map((r) => r.chatRoomId);

    const participants = await ChatParticipant.find({
      chatRoomId: {
        $in: roomIds,
      },
    }).populate("chatRoomId");

    let room = null;

    for (const p of participants) {
      if (!p.chatRoomId) continue;

      if (p.chatRoomId.type !== "oneToOne") continue;

      const users = await ChatParticipant.find({
        chatRoomId: p.chatRoomId._id,
      });

      const ids = users.map((u) => u.userId.toString());

      if (
        ids.length === 2 &&
        ids.includes(user._id.toString()) &&
        ids.includes(recipientId)
      ) {
        room = p.chatRoomId;

        break;
      }
    }
    if (room) {
      await ChatParticipant.findOneAndUpdate(
        {
          chatRoomId: room._id,

          userId: user._id,
        },
        {
          unreadCount: 0,
        },
      );

      return res.json({
        success: true,

        room,
      });
    }

    room = await ChatRoom.create({
      type: "oneToOne",

      collegeId: user.collegeId,
    });

    await ChatParticipant.insertMany([
      {
        chatRoomId: room._id,

        userId: user._id,
      },
      {
        chatRoomId: room._id,

        userId: recipientId,
      },
    ]);

    return res.status(201).json({
      success: true,

      room,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const user = req.user;

    const { roomId, content, replyTo, attachments } = req.body;

    const room = await ChatRoom.findById(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
      });
    }

    const message = await Message.create({
      chatRoomId: roomId,

      sender: user._id,

      content,

      attachments: attachments || [],

      replyTo: replyTo || null,
    });

    room.lastMessage = message._id;

    room.lastMessageAt = new Date();

    await room.save();

    const io = getIO();

    const participants = await ChatParticipant.find({
      chatRoomId: roomId,
    });

    for (const p of participants) {
      if (p.userId.toString() === user._id.toString()) {
        continue;
      }

      // user room open?

      const roomSockets = io.sockets.adapter.rooms.get(roomId.toString());

      let userInside = false;

      if (roomSockets) {
        for (const socketId of roomSockets) {
          const socket = io.sockets.sockets.get(socketId);

          if (
            socket?.handshake?.auth?.userId === p.userId.toString() &&
            socket.activeRoom === roomId
          ) {
            userInside = true;

            break;
          }
        }
      }

      if (!userInside) {
        await ChatParticipant.findByIdAndUpdate(p._id, {
          $inc: {
            unreadCount: 1,
          },
        });
      }
    }
    const populated = await Message.findById(message._id)

      .populate(
        "sender",

        "_id name profilePicture",
      )

      .populate({
        path: "replyTo",

        select: "_id content sender createdAt",
      });

   io.to(roomId).emit(
  "new_message",
  populated
);

// refresh unread only for participants

participants.forEach(
  (p) => {
    io
      .to(
        p.userId.toString()
      )
      .emit(
        "chat_updated"
      );
  }
);
    res.json({
      success: true,

      message: populated,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const user = req.user;

    const { roomId } = req.params;

    const page = Number(req.query.page) || 1;

    const limit = 30;

    await Message.updateMany(
      {
        chatRoomId: roomId,

        sender: {
          $ne: user._id,
        },

        status: {
          $in: ["sent"],
        },
      },

      {
        status: "delivered",
      },
    );

    const messages = await Message.find({
      chatRoomId: roomId,
    })

      .populate("sender", "_id name")

      .populate({
        path: "replyTo",

        select: "_id content sender createdAt",
      })

      .sort({
        createdAt: -1,
      })

      .skip((page - 1) * limit)

      .limit(limit);

    res.json({
      success: true,

      messages: messages.reverse(),

      hasMore: messages.length === limit,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
    });
  }
};

const getMyChats = async (req, res) => {
  try {
    const user = req.user;

    const rooms = await ChatParticipant.find({
      userId: user._id,
    }).populate({
      path: "chatRoomId",

      populate: {
        path: "lastMessage",

        populate: {
          path: "sender",

          select: "_id name",
        },
      },
    });

    const chats = await Promise.all(
      rooms.map(async (r) => {
        const room = r.chatRoomId;

        if (!room || !room.lastMessage) return null;

        const members = await ChatParticipant.find({
          chatRoomId: room._id,
        }).populate("userId", "_id name profilePicture");

        const other = members.find(
          (m) => m.userId._id.toString() !== user._id.toString(),
        );

        return {
          roomId: room._id,

          user: other?.userId,

          lastMessage: room.lastMessage?.content || "",

          lastMessageAt: room.lastMessageAt,

          unreadCount: r.unreadCount,
        };
      }),
    );

    res.json({
      success: true,

      chats: chats
        .filter(Boolean)
        .sort(
          (a, b) =>
            new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0),
        ),
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
    });
  }
};

module.exports = {
  createOrOpenRoom,
  sendMessage,
  getMessages,
  getMyChats,
};
