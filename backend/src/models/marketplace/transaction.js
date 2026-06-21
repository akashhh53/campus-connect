const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketplaceItem",
      required: true,
    },

    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["borrow", "return", "donation", "purchase"],
      required: true,
    },

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    transactionDate: {
      type: Date,
      default: Date.now,
    },

    notes: String,
  },
  { timestamps: true }
);

// Indexes
transactionSchema.index({ itemId: 1, collegeId: 1, transactionDate: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
