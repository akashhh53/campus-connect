const express = require("express");

const router = express.Router();

const userMiddleware = require("../middleware/userMiddleware");
const { upload } = require("../config/cloudinary");

const {
  createOrOpenRoom,

  sendMessage,

  getMessages,

  getMyChats,
  deleteMessage,
  clearChatForMe,
  toggleMessageReaction,
} = require("../controllers/chatController");

router.post(
  "/room",

  userMiddleware,

  createOrOpenRoom,
);

router.post(
  "/send",

  userMiddleware,

  upload.array("attachments", 4),

  sendMessage,
);
router.get(
  "/messages/:roomId",

  userMiddleware,

  getMessages,
);

router.get("/my-chats", userMiddleware, getMyChats);

router.delete("/messages/:messageId", userMiddleware, deleteMessage);
router.post("/messages/:messageId/reactions", userMiddleware, toggleMessageReaction);
router.delete("/rooms/:roomId/messages", userMiddleware, clearChatForMe);
module.exports = router;
