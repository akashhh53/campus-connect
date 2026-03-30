const mongoose = require("mongoose");

const adminInviteSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },

    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true, // admin only
    },

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: { expires: "0s" },
    },

    used: {
      type: Boolean,
      default: false,
    },

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // global admin
      required: true,
    },
  },
  { timestamps: true }
);


module.exports = mongoose.model("AdminInvite", adminInviteSchema);