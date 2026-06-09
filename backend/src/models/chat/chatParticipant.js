import mongoose from "mongoose";

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
  },
  { timestamps: true }
);

// Unique user per room
chatParticipantSchema.index({ chatRoomId: 1, userId: 1 }, { unique: true });

export default mongoose.model("ChatParticipant", chatParticipantSchema);
