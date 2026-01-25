import mongoose from "mongoose";

const chatConsentSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },

    requestedAt: {
      type: Date,
      default: Date.now,
    },

    respondedAt: Date,
  },
  { timestamps: true }
);

// Unique request per pair
chatConsentSchema.index({ requester: 1, recipient: 1 }, { unique: true });

export default mongoose.model("ChatConsent", chatConsentSchema);
