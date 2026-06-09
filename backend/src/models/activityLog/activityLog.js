import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    role: {
      type: String,
      enum: ["student", "teacher", "alumni", "admin", "globalAdmin"],
      required: true,
    },

    actionType: {
      type: String,
      required: true,
      // Examples: "POST_CREATED", "MARKETPLACE_BORROW", "EVENT_REGISTERED"
    },

    module: {
      type: String,
      required: true,
      // Examples: "feed", "marketplace", "academicHub", "library"
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      // Optional reference to the object affected (postId, itemId, eventId)
    },

    visibility: {
      type: String,
      enum: ["campus", "global"],
      default: "campus",
    },

    meta: {
      type: Object,
      default: {}, // Store any extra info: { points: 10, commentCount: 3 }
    },
  },
  { timestamps: true }
);

// Indexes for performance
activityLogSchema.index({ userId: 1, module: 1, createdAt: -1 });
activityLogSchema.index({ collegeId: 1, visibility: 1, createdAt: -1 });

export default mongoose.model("ActivityLog", activityLogSchema);
