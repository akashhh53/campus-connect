import mongoose from "mongoose";

const academicReplySchema = new mongoose.Schema(
  {
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicThread",
      required: true,
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    roleAllowed: {
      type: [String],
      enum: ["student", "teacher", "alumni", "admin", "globalAdmin"],
      default: ["student", "teacher", "alumni"],
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    parentReplyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicReply",
      default: null, // for nested replies
    },
  },
  { timestamps: true }
);

// Indexes
academicReplySchema.index({ threadId: 1, createdAt: -1 });
academicReplySchema.index({ author: 1, isDeleted: 1 });

export default mongoose.model("AcademicReply", academicReplySchema);
