import mongoose from "mongoose";

const confessionSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      select: false, // hide author for everyone except moderation
    },

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    visibility: {
      type: String,
      enum: ["campus"], // strictly campus-only
      default: "campus",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    isPinned: {
      type: Boolean,
      default: false, // Admin can pin important confessions
    },

    reportsCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes
confessionSchema.index({ collegeId: 1, createdAt: -1 });
confessionSchema.index({ isDeleted: 1, reportsCount: -1 });

export default mongoose.model("Confession", confessionSchema);
