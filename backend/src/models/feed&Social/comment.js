import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
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

    roleAllowed: {
      type: [String],
      enum: ["student", "teacher", "alumni", "admin", "globalAdmin"],
      default: ["student", "teacher", "alumni"],
    },

    content: {
      type: String,
      required: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
commentSchema.index({ postId: 1, createdAt: -1 });
commentSchema.index({ author: 1, isDeleted: 1 });

export default mongoose.model("Comment", commentSchema);
