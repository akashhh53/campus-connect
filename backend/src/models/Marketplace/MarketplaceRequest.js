import mongoose from "mongoose";

const marketplaceRequestSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketplaceItem",
      required: true,
    },

    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["borrow", "purchase", "donation"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
    },

    requestedAt: {
      type: Date,
      default: Date.now,
    },

    approvedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

// Indexes
marketplaceRequestSchema.index({ itemId: 1, requester: 1, status: 1 });

export default mongoose.model("MarketplaceRequest", marketplaceRequestSchema);
