import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    targetType: {
      type: String,
      enum: ["post", "comment", "confession", "marketplaceItem"],
      required: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      // references Post, Comment, etc based on targetType
    },

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    reason: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "reviewed", "actioned", "rejected"],
      default: "pending",
    },

    actionTakenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // admin who resolved
    },
  },
  { timestamps: true }
);

// Indexes
reportSchema.index({ collegeId: 1, status: 1, createdAt: -1 });

export default mongoose.model("Report", reportSchema);
