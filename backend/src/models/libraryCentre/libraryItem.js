import mongoose from "mongoose";

const libraryItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: String,

    authorName: String,

    type: {
      type: String,
      enum: ["book", "pdf", "video", "other"],
      default: "book",
    },

    fileUrl: String, // for digital content

    tags: [String],

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    roleAllowed: {
      type: [String],
      enum: ["student", "teacher", "alumni", "admin"],
      default: ["student", "teacher", "alumni"],
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    quantity: {
      type: Number,
      default: 1, // physical copies
    },

    borrowedCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes
libraryItemSchema.index({ collegeId: 1, isDeleted: 1, title: 1 });

export default mongoose.model("LibraryItem", libraryItemSchema);
