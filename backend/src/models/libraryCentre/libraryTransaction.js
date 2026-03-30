import mongoose from "mongoose";

const libraryTransactionSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LibraryItem",
      required: true,
    },

    borrower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    borrowedAt: {
      type: Date,
      default: Date.now,
    },

    returnedAt: Date,

    status: {
      type: String,
      enum: ["borrowed", "returned", "overdue"],
      default: "borrowed",
    },

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes
libraryTransactionSchema.index({ itemId: 1, borrower: 1, status: 1 });

export default mongoose.model("LibraryTransaction", libraryTransactionSchema);
