const express = require("express");
const router = express.Router();
const userMiddleware = require("../middleware/userMiddleware");
const { requireModule } = require("../middleware/moduleAccess");
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

//some apis are to be added later after deployment of project to make it better than now
// All routes require authentication and feed module access
router.use(userMiddleware);
router.put(
  "/profile-update",

  upload.single("profilePicture"),

  updateUserProfile,
);
router.use(requireModule("feed"));

// API #1: Create a post
router.post("/posts", upload.array("attachments", 5), createPost);

router.get("/posts", getPosts); // API #2: Get all posts
router.get("/posts/saved/count", getSavedPostsCount);
router.get("/posts/saved", getSavedPosts);

router.get("/posts/:id", getPostById); // API #3

router.put("/posts/:id", upload.array("attachments", 5), updatePost); // API #4

router.delete("/posts/:id", deletePost); // API #5

router.put("/posts/:id/pin", pinPost); // API #6

router.get("/my-posts", getMyPosts);

//for now skipped save , unsave , get all save , share,trending 8,9,10,11,12 api number skipped

router.post("/posts/:postId/comments", addComment);

router.get("/posts/:postId/comments", getComments); // API #14
router.post("/comments/:commentId/reply", replyToComment); // API #15

router.put("/comments/:id", updateComment); // API #16

router.delete("/comments/:id", deleteComment); // API #17

router.post("/comments/:id/like", likeComment); // API #18

router.delete("/comments/:id/like", unlikeComment); // API #19

//pin comment api 20 avoided , for later

router.post("/posts/:postId/reactions", addPostReaction); // API #21
router.delete("/posts/:postId/reactions", removePostReaction); // API #22
router.get("/posts/:postId/reactions", getPostReactions); // API #23

router.get("/comments/:commentId/reactions", getCommentReactions); // API #24
//report post skipped api #25 and many more till 28 skipped

router.get("/notifications", getNotifications); // API #29

//skipped  these apis for now
// 30	Get Unread Count	GET	/user/notifications/unread-count
// 31	Mark as Read	PUT	/user/notifications/:id/read
// 32	Mark All Read	PUT	/user/notifications/read-all
// 33	Delete Notification	DELETE	/user/notifications/:id
// 34	Clear All	DELETE	/user/notifications/clear
// 35	Get Settings	GET	/user/notifications/settings
// 36	Update Settings	PUT	/user/notifications/settings

router.post("/follow/:userId", followUser); // API #37

router.delete("/follow/:userId", unfollowUser); // API #38
router.get("/users/:userId/followers", getFollowers); // API #39

router.get("/users/:userId/following", getFollowing); // API #40
router.get("/users/:userId", getUserDetails); // API #48

router.get("/mutual", getMutualFriends); // For current user's mutual friends
router.get("/mutual/:userId", getMutualFriends); // For another user's mutual friends
router.get("/suggestions", getUserSuggestions); // API #42

router.post("/block/:userId", blockUser); // API #43

router.delete("/block/:userId", unblockUser); // API #44

router.get("/search", globalSearch); // API #45

router.get("/search/posts", searchPosts); // API #46

router.get("/search/users", searchUsers); // API #47

router.post("/posts/:id/save", savePost);

router.delete("/posts/:id/save", unsavePost);


module.exports = router;
