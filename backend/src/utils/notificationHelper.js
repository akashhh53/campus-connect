const Notification = require("../models/activityLog/notification");

const Comment = require("../models/feed&Social/comment");

const { getIO } = require("../../socket");

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

    const notification = await Notification.create({
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

    getIO().to(userId.toString()).emit("new_notification", notification);
  } catch (error) {
    console.log("Notification Error:", error.message);
  }
};

const deleteNotification = async ({ userId, actorId, type, targetId }) => {
  try {
    const deleted = await Notification.findOneAndDelete({
      userId,
      actorId,
      type,
      targetId,
    });

    if (deleted) {
      getIO().to(userId.toString()).emit("notification_removed", deleted._id);
    }
  } catch (error) {
    console.log("Delete Notification Error:", error.message);
  }
};

const deleteNotificationsByPost = async (postId) => {
  try {
    const comments =
      await Comment.find({
        postId,
      }).select("_id");

    const commentIds =
      comments.map(
        (c) => c._id
      );

    const query = {
      $or: [
        {
          targetId:
            postId,
        },

        {
          targetId: {
            $in:
              commentIds,
            },
        },
      ],
    };

    const deleted =
      await Notification.find(
        query
      );

    console.log(
      "DELETE POST ID:",
      postId
    );

    console.log(
      "FOUND:",
      deleted.length
    );

    console.log(
      deleted.map(
        (n) => ({
          type:
            n.type,

          targetId:
            n.targetId,

          targetModel:
            n.targetModel,
        })
      )
    );

    await Notification.deleteMany(
      query
    );

    for (
      const n
      of deleted
    ) {
      getIO()
        .to(
          n.userId.toString()
        )
        .emit(
          "notification_removed",
          n._id
        );
    }
  } catch (error) {
    console.log(
      "Delete Notification Error:",
      error.message
    );
  }
};

module.exports = {
  createNotification,
  deleteNotification,
  deleteNotificationsByPost,
};
