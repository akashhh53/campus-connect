import mongoose from "mongoose";

const eventRegistrationSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

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

    status: {
      type: String,
      enum: ["registered", "attended", "cancelled"],
      default: "registered",
    },

    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes
eventRegistrationSchema.index({ eventId: 1, userId: 1, status: 1 });

export default mongoose.model("EventRegistration", eventRegistrationSchema);
