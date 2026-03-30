import mongoose from "mongoose";

const sustainabilityLogSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    metricType: {
      type: String,
      enum: ["energySaved", "wasteRecycled", "reuseActions"],
      required: true,
    },

    totalValue: {
      type: Number,
      default: 0,
    },

    visibility: {
      type: String,
      enum: ["campus", "global"],
      default: "campus",
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index
sustainabilityLogSchema.index({ collegeId: 1, metricType: 1, visibility: 1 });

export default mongoose.model("SustainabilityLog", sustainabilityLogSchema);
