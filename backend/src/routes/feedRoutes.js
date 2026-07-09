const express = require("express");
const router = express.Router();
const userMiddleware = require("../middleware/userMiddleware");
const { requireModule } = require("../middleware/moduleAccess");
const {
  bumpCacheNamespaces,
  cacheResponse,
} = require("../middleware/cacheMiddleware");
const { upload } = require("../config/cloudinary");
const {
  updateUserProfile,
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  pinPost,
  getMyPosts,
  addComment,
  getComments,
  replyToComment,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
  addPostReaction,
  removePostReaction,
  getPostReactions,
  getCommentReactions,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getMutualFriends,
  getUserSuggestions,
  blockUser,
  unblockUser,
  globalSearch,
  searchPosts,
  searchUsers,
  getUserDetails,
  savePost,
  unsavePost,
  getSavedPostsCount,
  getSavedPosts,
} = require("../controllers/feedController");

const bumpFeedCache = bumpCacheNamespaces(["feed"]);
const bumpFeedAndProfileCache = bumpCacheNamespaces(["feed", "user-profile"]);

//some apis are to be added later after deployment of project to make it better than now
// All routes require authentication and feed module access
router.use(userMiddleware);
router.put(
  "/profile-update",

  upload.single("profilePicture"),

  bumpFeedAndProfileCache,

  updateUserProfile,
);
router.use(requireModule("feed"));

// API #1: Create a post
router.post("/posts", upload.array("attachments", 5), bumpFeedCache, createPost);

router.get("/posts", cacheResponse("feed", 20), getPosts); // API #2: Get all posts
router.get("/posts/saved/count", cacheResponse("feed", 20), getSavedPostsCount);
router.get("/posts/saved", cacheResponse("feed", 20), getSavedPosts);

router.get("/posts/:id", cacheResponse("feed", 20), getPostById); // API #3

router.put("/posts/:id", upload.array("attachments", 5), bumpFeedCache, updatePost); // API #4

router.delete("/posts/:id", bumpFeedCache, deletePost); // API #5

router.put("/posts/:id/pin", bumpFeedCache, pinPost); // API #6

router.get("/my-posts", cacheResponse("feed", 20), getMyPosts);

//for now skipped save , unsave , get all save , share,trending 8,9,10,11,12 api number skipped

router.post("/posts/:postId/comments", bumpFeedCache, addComment);

router.get("/posts/:postId/comments", cacheResponse("feed", 15), getComments); // API #14
router.post("/comments/:commentId/reply", bumpFeedCache, replyToComment); // API #15

router.put("/comments/:id", bumpFeedCache, updateComment); // API #16

router.delete("/comments/:id", bumpFeedCache, deleteComment); // API #17

router.post("/comments/:id/like", bumpFeedCache, likeComment); // API #18

router.delete("/comments/:id/like", bumpFeedCache, unlikeComment); // API #19

//pin comment api 20 avoided , for later

router.post("/posts/:postId/reactions", bumpFeedCache, addPostReaction); // API #21
router.delete("/posts/:postId/reactions", bumpFeedCache, removePostReaction); // API #22
router.get("/posts/:postId/reactions", cacheResponse("feed", 20), getPostReactions); // API #23

router.get("/comments/:commentId/reactions", cacheResponse("feed", 20), getCommentReactions); // API #24
//report post skipped api #25 and many more till 28 skipped

router.get("/notifications", getNotifications); // API #29

router.put("/notifications/:id/read", markNotificationRead);

router.put("/notifications/read-all", markAllNotificationsRead);

//skipped  these apis for now
// 30	Get Unread Count	GET	/user/notifications/unread-count
// 31	Mark as Read	PUT	/user/notifications/:id/read
// 32	Mark All Read	PUT	/user/notifications/read-all
// 33	Delete Notification	DELETE	/user/notifications/:id
// 34	Clear All	DELETE	/user/notifications/clear
// 35	Get Settings	GET	/user/notifications/settings
// 36	Update Settings	PUT	/user/notifications/settings

router.post("/follow/:userId", bumpFeedAndProfileCache, followUser); // API #37

router.delete("/follow/:userId", bumpFeedAndProfileCache, unfollowUser); // API #38
router.get("/users/:userId/followers", cacheResponse("user-profile", 30), getFollowers); // API #39

router.get("/users/:userId/following", cacheResponse("user-profile", 30), getFollowing); // API #40
router.get("/users/:userId", cacheResponse("user-profile", 45), getUserDetails); // API #48

router.get("/mutual", cacheResponse("user-profile", 30), getMutualFriends); // For current user's mutual friends
router.get("/mutual/:userId", cacheResponse("user-profile", 30), getMutualFriends); // For another user's mutual friends
router.get("/suggestions", cacheResponse("user-profile", 30), getUserSuggestions); // API #42

router.post("/block/:userId", bumpFeedAndProfileCache, blockUser); // API #43

router.delete("/block/:userId", bumpFeedAndProfileCache, unblockUser); // API #44

router.get("/search", cacheResponse("feed", 20), globalSearch); // API #45

router.get("/search/posts", cacheResponse("feed", 30), searchPosts); // API #46

router.get("/search/users", cacheResponse("user-profile", 45), searchUsers); // API #47

router.post("/posts/:id/save", bumpFeedCache, savePost);

router.delete("/posts/:id/save", bumpFeedCache, unsavePost);


module.exports = router;
