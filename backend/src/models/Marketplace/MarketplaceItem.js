import mongoose from "mongoose";

const marketplaceItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: String,

    category: {
      type: String,
      default: "general", // books, electronics, stationery, etc.
    },

    images: [String],

    price: {
      type: Number,
      default: 0, // 0 = free / donation
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    status: {
      type: String,
      enum: ["available", "requested", "borrowed", "donated", "removed"],
      default: "available",
    },

    visibility: {
      type: String,
      enum: ["campus", "global"],
      default: "campus",
    },

    roleAllowed: {
      type: [String],
      enum: ["student", "alumni"],
      default: ["student", "alumni"],
    },
  },
  { timestamps: true }
);

// Indexes
marketplaceItemSchema.index({ collegeId: 1, status: 1, createdAt: -1 });
marketplaceItemSchema.index({ owner: 1 });

export default mongoose.model("MarketplaceItem", marketplaceItemSchema);
