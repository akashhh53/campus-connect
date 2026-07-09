const express = require("express");

const router = express.Router();

const userMiddleware = require("../middleware/userMiddleware");

const {
  createOrOpenRoom,

  sendMessage,

  getMessages,

  getMyChats,
} = require("../controllers/chatController");

router.post(
  "/room",

  userMiddleware,

  createOrOpenRoom,
);

router.post(
  "/send",

  userMiddleware,

  sendMessage,
);
router.get(
  "/messages/:roomId",

  userMiddleware,

  getMessages,
);

router.get("/my-chats", userMiddleware, getMyChats);
module.exports = router;
