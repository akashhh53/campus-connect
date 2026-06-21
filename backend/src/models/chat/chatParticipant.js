const mongoose = require("mongoose");

const chatParticipantSchema = new mongoose.Schema(
  {
    chatRoomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    role: {
      type: String,
      enum: ["member", "admin"],
      default: "member",
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },

    isMuted: {
type: Boolean,

default: false,
},

unreadCount: {
type: Number,

default: 0,
},
  },
  { timestamps: true }
);

// Unique user per room
chatParticipantSchema.index({ chatRoomId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("ChatParticipant", chatParticipantSchema);
