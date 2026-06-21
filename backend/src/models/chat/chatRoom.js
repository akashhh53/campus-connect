const mongoose = require("mongoose");

const chatRoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true, // optional for 1:1 chats
    },

    type: {
      type: String,
      enum: ["oneToOne", "group", "globalMentorship"],
      default: "group",
    },

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    visibility: {
      type: String,
      enum: ["campus", "global"],
      default: "campus",
    },

    roleAllowed: {
      type: [String],
      enum: ["student", "teacher", "alumni", "admin"],
      default: ["student", "teacher", "alumni"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

lastMessage: {
type:
mongoose.Schema.Types.ObjectId,

ref:
"Message",

default:
null,
},

lastMessageAt: {
type:
Date,

default:
null,
},

unreadCount: {
type:
Map,

of:
Number,

default:
{},
},
  },
  { timestamps: true }
);

// Indexes
chatRoomSchema.index({ collegeId: 1, visibility: 1, lastMessageAt: -1 });

module.exports = mongoose.model("ChatRoom", chatRoomSchema);
