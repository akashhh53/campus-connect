const mongoose = require("mongoose");

const globalAnalyticsSchema = new mongoose.Schema(
  {
    metric: {
      type: String,
      enum: [
        "userCount",
        "eventCount",
        "libraryUsage",
        "pollParticipation",
        "sustainabilityImpact",
        "marketplaceTransactions",
      ],
      required: true,
    },

    value: {
      type: Number,
      default: 0,
    },

    visibility: {
      type: String,
      enum: ["global"],
      default: "global",
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index
globalAnalyticsSchema.index({ metric: 1, visibility: 1 });

module.exports = mongoose.model("GlobalAnalytics", globalAnalyticsSchema);
