const ChatRoom = require("../models/chat/chatRoom");

const ChatParticipant = require("../models/chat/chatParticipant");
const Message = require("../models/chat/message");

const { getIO, isUserOnline } = require("../../socket");

const parseAttachments = (attachments) => {
  if (!attachments) return [];
  if (Array.isArray(attachments)) return attachments;

  try {
    const parsed = JSON.parse(attachments);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return typeof attachments === "string" && attachments.trim()
      ? [attachments.trim()]
      : [];
  }
};

const populateMessage = (messageId) =>
  Message.findById(messageId)
    .populate("sender", "_id name profilePicture")
    .populate({ path: "replyTo", select: "_id content attachments sender createdAt" });

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

    const { roomId, content = "", replyTo, attachments } = req.body;
    const text = content.trim();
    const uploadedAttachments = (req.files || []).map((file) => file.path);
    const allAttachments = [
      ...parseAttachments(attachments),
      ...uploadedAttachments,
    ];

    if (!text && allAttachments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Write a message or attach a file.",
      });
    }

    const room = await ChatRoom.findById(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
      });
    }

    const isParticipant = await ChatParticipant.exists({
      chatRoomId: roomId,
      userId: user._id,
    });

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "Chat access denied" });
    }

    const message = await Message.create({
      chatRoomId: roomId,

      sender: user._id,

      content: text,

      attachments: allAttachments,

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
            String(socket.activeRoom) === String(roomId)
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
    const populated = await populateMessage(message._id);

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
      isDeleted: false,
      deletedFor: { $ne: user._id },
    })

      .populate("sender", "_id name")

      .populate({
        path: "replyTo",

        select: "_id content attachments sender createdAt",
      })

      .sort({
        createdAt: -1,
      })

      .skip((page - 1) * limit)

      .limit(limit)
      .lean();

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
    })
      .populate({
        path: "chatRoomId",

        populate: {
          path: "lastMessage",

          populate: {
            path: "sender",

            select: "_id name",
          },
        },
      })
      .lean();

    const activeRooms = rooms
      .map((participant) => participant.chatRoomId)
      .filter(Boolean);
    const roomIds = activeRooms.map((room) => room._id);
    const [otherParticipants, visibleLastMessages] = roomIds.length
      ? await Promise.all([
          ChatParticipant.find({
            chatRoomId: { $in: roomIds },
            userId: { $ne: user._id },
          })
            .populate("userId", "_id name profilePicture")
            .lean(),
          Message.find({
            chatRoomId: { $in: roomIds },
            isDeleted: false,
            deletedFor: { $ne: user._id },
          })
            .sort({ createdAt: -1 })
            .populate("sender", "_id name")
            .lean(),
        ])
      : [[], []];
    const otherUserByRoom = new Map(
      otherParticipants.map((participant) => [
        String(participant.chatRoomId),
        participant.userId,
      ]),
    );
    const lastMessageByRoom = new Map();

    visibleLastMessages.forEach((message) => {
      const roomId = String(message.chatRoomId);

      if (!lastMessageByRoom.has(roomId)) {
        lastMessageByRoom.set(roomId, message);
      }
    });

    const chats = rooms.map((participant) => {
      const room = participant.chatRoomId;
      const visibleLastMessage = lastMessageByRoom.get(String(room?._id));

      if (!room || !visibleLastMessage) return null;

      return {
        roomId: room._id,

        user: otherUserByRoom.get(String(room._id)),

        lastMessage:
          visibleLastMessage.content ||
          (visibleLastMessage.attachments?.length ? "Attachment" : ""),

        lastMessageAt: visibleLastMessage.createdAt,

        unreadCount: participant.unreadCount,
        isOnline: isUserOnline(otherUserByRoom.get(String(room._id))?._id),
      };
    });

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

const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.messageId,
      sender: req.user._id,
      isDeleted: false,
    });

    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    const roomId = message.chatRoomId;
    const messageId = message._id;

    await message.deleteOne();

    const latestMessage = await Message.findOne({
      chatRoomId: roomId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .select("_id createdAt")
      .lean();

    await ChatRoom.findByIdAndUpdate(roomId, {
      $set: {
        lastMessage: latestMessage?._id || null,
        lastMessageAt: latestMessage?.createdAt || null,
      },
    });

    const io = getIO();
    io.to(String(roomId)).emit("message_deleted", {
      messageId,
      roomId,
    });

    const participants = await ChatParticipant.find({ chatRoomId: roomId })
      .select("userId")
      .lean();

    participants.forEach((participant) => {
      io.to(String(participant.userId)).emit("chat_updated");
    });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const clearChatForMe = async (req, res) => {
  try {
    const isParticipant = await ChatParticipant.exists({
      chatRoomId: req.params.roomId,
      userId: req.user._id,
    });

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "Chat access denied" });
    }

    await Message.updateMany(
      { chatRoomId: req.params.roomId },
      { $addToSet: { deletedFor: req.user._id } },
    );
    await ChatParticipant.updateOne(
      { chatRoomId: req.params.roomId, userId: req.user._id },
      { $set: { unreadCount: 0 } },
    );

    getIO().to(String(req.user._id)).emit("chat_updated");
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const toggleMessageReaction = async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji || String(emoji).length > 32) {
      return res.status(400).json({ success: false, message: "Choose a valid reaction" });
    }

    const message = await Message.findById(req.params.messageId);
    if (!message || message.isDeleted) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    const isParticipant = await ChatParticipant.exists({
      chatRoomId: message.chatRoomId,
      userId: req.user._id,
    });
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "Chat access denied" });
    }

    const reactionIndex = message.reactions.findIndex(
      (reaction) => String(reaction.userId) === String(req.user._id) && reaction.emoji === emoji,
    );

    if (reactionIndex >= 0) {
      message.reactions.splice(reactionIndex, 1);
    } else {
      message.reactions = message.reactions.filter(
        (reaction) => String(reaction.userId) !== String(req.user._id),
      );
      message.reactions.push({ userId: req.user._id, emoji });
    }

    await message.save();
    getIO().to(String(message.chatRoomId)).emit("message_reactions", {
      messageId: message._id,
      reactions: message.reactions,
    });

    return res.json({ success: true, reactions: message.reactions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOrOpenRoom,
  sendMessage,
  getMessages,
  getMyChats,
  deleteMessage,
  clearChatForMe,
  toggleMessageReaction,
};
