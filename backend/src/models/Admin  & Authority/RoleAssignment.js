import mongoose from "mongoose";

const roleAssignmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    role: {
      type: String,
      enum: ["student", "teacher", "alumni", "admin", "globalAdmin"],
      required: true,
    },

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
    },

    modulesAllowed: [
      {
        type: String,
        enum: [
          "Dashboard",
          "Feed",
          "Marketplace",
          "Confession",
          "Library",
          "AcademicHub",
          "Events",
          "Chat",
          "Polls",
          "Sustainability",
          "Admin",
        ],
      },
    ],

    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Unique per user-college combination
roleAssignmentSchema.index({ userId: 1, collegeId: 1 }, { unique: true });

export default mongoose.model("RoleAssignment", roleAssignmentSchema);
