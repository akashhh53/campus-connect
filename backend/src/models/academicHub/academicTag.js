import mongoose from "mongoose";

const academicTagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    description: String,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // Admin or teacher
    },

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },
  },
  { timestamps: true }
);

// Index
academicTagSchema.index({ collegeId: 1, name: 1 });

export default mongoose.model("AcademicTag", academicTagSchema);
