import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },

    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null, // either post or comment
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["like", "dislike", "love", "insightful", "helpful"],
      default: "like",
    },
  },
  { timestamps: true }
);

// Unique reaction per user per target
reactionSchema.index({ postId: 1, commentId: 1, userId: 1 }, { unique: true });

export default mongoose.model("Reaction", reactionSchema);
