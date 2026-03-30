import mongoose from "mongoose";

const clubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: String,

    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    roleAllowed: {
      type: [String],
      enum: ["student", "teacher", "alumni", "admin"],
      default: ["student", "teacher"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    tags: [String], // e.g., "coding", "sports"
  },
  { timestamps: true }
);

// Indexes
clubSchema.index({ collegeId: 1, isActive: 1 });
clubSchema.index({ creator: 1 });

export default mongoose.model("Club", clubSchema);
