import mongoose from "mongoose";

const pollResponseSchema = new mongoose.Schema(
  {
    pollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Poll",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    selectedOptionIndex: {
      type: Number,
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

// Ensure one response per user per poll
pollResponseSchema.index({ pollId: 1, userId: 1 }, { unique: true });

export default mongoose.model("PollResponse", pollResponseSchema);
