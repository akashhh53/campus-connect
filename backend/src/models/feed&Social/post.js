const mongoose = require("mongoose");

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
    },

    title: {
      type: String,
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    attachments: [String],

    module: {
      type: String,
      enum: [
        "feed", "events", "academicHub", "mentorship",
        "announcements", "discussion", "poll", "question",
        "assignment", "exam", "result", "studyMaterial", "timetable",
        "internship", "job", "workshop", "hackathon",
        "club", "sports", "festival", "placement",
        "alert", "feedback", "report"
      ],
      default: "feed"
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

    tags: [String],

    // ✅ YEH FIELD ADD KAR - Comment count ke liye
    commentCount: {
      type: Number,
      default: 0,
    },

    // ✅ YEH FIELD ADD KAR - Reaction count ke liye (optional)
    reactionsCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes for performance
postSchema.index({ collegeId: 1, visibility: 1, createdAt: -1 });
postSchema.index({ collegeId: 1, isDeleted: 1, roleAllowed: 1, createdAt: -1 });
postSchema.index({ author: 1, module: 1 });
postSchema.index({ author: 1, isDeleted: 1, createdAt: -1 });
postSchema.index({ isDeleted: 1 });

module.exports = mongoose.model("Post", postSchema);
