import mongoose from "mongoose";

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
  },
  { timestamps: true }
);

// Indexes for fast fetching
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ collegeId: 1, visibility: 1, role: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
