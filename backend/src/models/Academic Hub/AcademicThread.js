import mongoose from "mongoose";

const academicThreadSchema = new mongoose.Schema(
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

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AcademicTag",
      },
    ],

    roleAllowed: {
      type: [String],
      enum: ["student", "teacher", "alumni", "admin", "globalAdmin"],
      default: ["student", "teacher", "alumni"],
    },

    visibility: {
      type: String,
      enum: ["campus", "global"],
      default: "campus",
    },

    isClosed: {
      type: Boolean,
      default: false, // thread closed by teacher/admin
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes for performance
academicThreadSchema.index({ collegeId: 1, visibility: 1, createdAt: -1 });
academicThreadSchema.index({ author: 1 });
academicThreadSchema.index({ tags: 1 });

export default mongoose.model("AcademicThread", academicThreadSchema);
