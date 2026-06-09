const Notification = require("../models/activityLog/notification");

const createNotification = async ({
  title,
  message,
  userId,
  actorId,
  type,
  targetId = null,
  targetModel = null,
  link = null,
  collegeId = null,
  role = "all",
  module = "feed",
  visibility = "campus",
}) => {
  try {
    if (!userId) return;

    await Notification.create({
      title,

      message,

      userId,

      actorId,

      type,

      targetId,

      targetModel,

      link,

      collegeId,

      role,

      module,

      visibility,
    });
  } catch (error) {
    console.log("Notification Error:", error.message);
  }
};

module.exports = {
  createNotification,
};
