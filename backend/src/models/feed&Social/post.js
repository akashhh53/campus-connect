import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
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
      // Who can view this post
    },

    title: {
      type: String,
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    attachments: [String], // images, docs, etc.

    module: {
      type: String,
      enum: ["feed", "academicHub", "mentorship"],
      default: "feed",
    },

    visibility: {
      type: String,
      enum: ["campus", "global"],
      default: "campus",
    },

    isPinned: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    tags: [String], // subjects, courses, topics
  },
  { timestamps: true }
);

// Indexes for performance
postSchema.index({ collegeId: 1, visibility: 1, createdAt: -1 });
postSchema.index({ author: 1, module: 1 });
postSchema.index({ isDeleted: 1 });

export default mongoose.model("Post", postSchema);
