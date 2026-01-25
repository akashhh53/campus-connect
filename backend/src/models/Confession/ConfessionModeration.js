import mongoose from "mongoose";

const confessionModerationSchema = new mongoose.Schema(
  {
    confessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Confession",
      required: true,
    },

    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action: {
      type: String,
      enum: ["reviewed", "deleted", "pinned", "warned"],
      required: true,
    },

    reason: String, // optional reason for moderation

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes
confessionModerationSchema.index({ confessionId: 1, adminId: 1, action: 1 });

export default mongoose.model(
  "ConfessionModeration",
  confessionModerationSchema
);
