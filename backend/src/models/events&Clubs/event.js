import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: String,

    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    roleAllowed: {
      type: [String],
      enum: ["student", "teacher", "alumni", "admin", "globalAdmin"],
      default: ["student", "teacher"],
    },

    visibility: {
      type: String,
      enum: ["campus", "global"],
      default: "campus",
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: Date,

    isApproved: {
      type: Boolean,
      default: false, // Teachers/Admin approve
    },

    attendeesCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes
eventSchema.index({ collegeId: 1, visibility: 1, startDate: -1 });
eventSchema.index({ organizer: 1, isApproved: 1 });

export default mongoose.model("Event", eventSchema);
