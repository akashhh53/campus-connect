import mongoose from "mongoose";

const sustainabilityMetricSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

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

    value: {
      type: Number,
      default: 0,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index
sustainabilityMetricSchema.index({ userId: 1, collegeId: 1, metricType: 1 });

export default mongoose.model("SustainabilityMetric", sustainabilityMetricSchema);
