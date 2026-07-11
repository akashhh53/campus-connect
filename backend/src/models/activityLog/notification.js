const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      // null = broadcast to role/college
    },

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      default: null, // null for global
    },

    role: {
      type: String,
      enum: ["student", "teacher", "alumni", "admin", "globalAdmin", "all"],
      default: "all",
    },

    module: {
      type: String,
      default: null,
      // Optional module reference: "feed", "marketplace", "academicHub"
    },

    visibility: {
      type: String,
      enum: ["campus", "global"],
      default: "campus",
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    // Broadcast notifications retain an individual read state per recipient.
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // NEW FIELDS
    type: {
      type: String,
      enum: [
        "follow",
        "comment",
        "reply",
        "post_like",
        "comment_like",
        "mention",
        "system",
        "announcement",
        "message",
        "event",
        "marketplace",
        "admin",
      ],
      required: true,
    },

    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    targetModel: {
      type: String,
      enum: ["Post", "Comment", "User", "Message", null],
      default: null,
    },

    link: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

// Indexes for fast fetching
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({
  collegeId: 1,
  visibility: 1,
  role: 1,
  createdAt: -1,
});

module.exports = mongoose.model("Notification", notificationSchema);
