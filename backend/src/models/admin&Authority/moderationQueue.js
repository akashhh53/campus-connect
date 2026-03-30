import mongoose from "mongoose";

const moderationQueueSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      enum: [
        "Confession",
        "Marketplace",
        "Library",
        "Event",
        "Poll",
        "Chat",
      ],
      required: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true, // e.g., confessionId, itemId
    },

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reason: String,

    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved"],
      default: "pending",
    },

    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // adminId
    },

    handledAt: Date,
  },
  { timestamps: true }
);

// Indexes
moderationQueueSchema.index({ module: 1, status: 1, targetId: 1 });

export default mongoose.model("ModerationQueue", moderationQueueSchema);
