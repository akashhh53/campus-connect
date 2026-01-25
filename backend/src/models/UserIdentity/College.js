import mongoose from "mongoose";

const collegeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      required: true,
      unique: true, // e.g. NITP, IITB
      uppercase: true,
    },

    location: {
      city: String,
      state: String,
      country: { type: String, default: "India" },
    },

    logoUrl: String,

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("College", collegeSchema);
