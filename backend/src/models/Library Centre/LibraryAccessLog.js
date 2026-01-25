import mongoose from "mongoose";

const libraryAccessLogSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LibraryItem",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action: {
      type: String,
      enum: ["view", "download"],
      required: true,
    },

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes
libraryAccessLogSchema.index({ itemId: 1, userId: 1, action: 1, createdAt: -1 });

export default mongoose.model("LibraryAccessLog", libraryAccessLogSchema);
