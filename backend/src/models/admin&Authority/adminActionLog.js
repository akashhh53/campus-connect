import mongoose from "mongoose";

const adminActionLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    actionType: {
      type: String,
      enum: [
        "userManagement",
        "contentModeration",
        "eventApproval",
        "libraryUpdate",
        "pollManagement",
        "sustainabilityUpdate",
      ],
      required: true,
    },

    targetModule: {
      type: String,
      enum: [
        "User",
        "Confession",
        "Marketplace",
        "Library",
        "Event",
        "Poll",
        "Sustainability",
      ],
      required: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId, // could be userId, confessionId, etc.
    },

    details: String,

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index
adminActionLogSchema.index({ adminId: 1, actionType: 1, targetModule: 1 });

export default mongoose.model("AdminActionLog", adminActionLogSchema);
