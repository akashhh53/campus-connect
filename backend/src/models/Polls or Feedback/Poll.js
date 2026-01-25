import mongoose from "mongoose";

const pollSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: String,

    options: [
      {
        optionText: String,
        votes: {
          type: Number,
          default: 0,
        },
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    visibility: {
      type: String,
      enum: ["campus", "global"],
      default: "campus",
    },

    roleAllowed: {
      type: [String],
      enum: ["student", "teacher", "alumni", "admin"],
      default: ["student", "teacher", "alumni"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes
pollSchema.index({ collegeId: 1, visibility: 1, isActive: 1 });

export default mongoose.model("Poll", pollSchema);
