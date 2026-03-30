const mongoose = require("mongoose");



const userProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    avatarUrl: String,
    bio: String,

    department: String,
    course: String,

    graduationYear: Number,

    skills: [String],

    mentorshipAvailable: {
      type: Boolean,
      default: false,
    },

    socialLinks: {
      linkedin: String,
      github: String,
      website: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserProfile", userProfileSchema);
