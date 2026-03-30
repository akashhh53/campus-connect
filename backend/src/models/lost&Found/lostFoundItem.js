import mongoose from "mongoose";

const lostFoundItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: String,

    type: {
      type: String,
      enum: ["lost", "found"],
      required: true,
    },

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    location: String, // where it was lost/found

    status: {
      type: String,
      enum: ["pending", "claimed", "resolved"],
      default: "pending",
    },

    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes
lostFoundItemSchema.index({ collegeId: 1, status: 1, type: 1 });

export default mongoose.model("LostFoundItem", lostFoundItemSchema);
