const mongoose = require("mongoose");

const postViewSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    viewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

postViewSchema.index({ post: 1, viewedBy: 1 }, { unique: true });
postViewSchema.index({ post: 1, createdAt: -1 });

module.exports = mongoose.model("PostView", postViewSchema);