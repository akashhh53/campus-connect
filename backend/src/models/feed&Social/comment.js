const mongoose = require("mongoose");

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
      enum: [
        "student",
        "teacher",
        "alumni",
        "admin",
        "globalAdmin",
      ],
      default: [
        "student",
        "teacher",
        "alumni",
      ],
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    // root comment grouping
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },

    // user being replied to
    replyToUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/*
Indexes
*/

commentSchema.index({
  postId: 1,
  createdAt: -1,
});

commentSchema.index({
  author: 1,
  isDeleted: 1,
});

// optimized reply fetch
commentSchema.index({
  parentCommentId: 1,
  createdAt: 1,
});

module.exports =
  mongoose.model(
    "Comment",
    commentSchema
  );