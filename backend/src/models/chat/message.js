const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    chatRoomId: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "ChatRoom",

      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "User",

      required: true,
    },

    content: {
      type: String,

      required: true,
    },

    attachments: [String],
    

    replyTo: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "Message",

      default: null,
    },

    status: {
      type: String,

      enum: ["sent", "delivered", "seen"],

      default: "sent",
    },

    seenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,

        ref: "User",
      },
    ],

    isDeleted: {
      type: Boolean,

      default: false,
    },

    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,

        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  },
);

messageSchema.index({
  chatRoomId: 1,
  createdAt: -1,
});

module.exports = mongoose.model("Message", messageSchema);
