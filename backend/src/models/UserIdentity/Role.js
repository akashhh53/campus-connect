import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ["student", "teacher", "alumni", "admin", "globalAdmin"],
      required: true,
      unique: true,
    },

    permissions: {
      type: [String],
      default: [],
      // example:
      // ["POST_CREATE", "POST_READ", "MARKETPLACE_ACCESS"]
    },

    allowedModules: {
      dashboard: Boolean,
      feed: Boolean,
      marketplace: Boolean,
      confessions: Boolean,
      library: Boolean,
      academicHub: Boolean,
      events: Boolean,
      messaging: Boolean,
      lostFound: Boolean,
      polls: Boolean,
      sustainability: Boolean,
      adminPanel: Boolean,
      globalAccess: Boolean,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Role", roleSchema);
