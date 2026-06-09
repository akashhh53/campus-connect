const User = require("../models/userIdentity/user");
const Post = require("../models/feed&Social/post"); // lowercase p
const Comment = require("../models/feed&Social/comment"); // lowercase c
const Reaction = require("../models/feed&Social/reaction"); // lowercase r
const Notification = require("../models/activityLog/notification");
const Follow = require("../models/feed&Social/follow");
const Block = require("../models/feed&Social/block");
const { createNotification } = require("../utils/notificationHelper");
const SavedPost = require("../models/feed&Social/savedPost");

//update profile

const updateUserProfile = async (req, res) => {
  try {
    const { name, bio } = req.body;

    let updates = {};

    if (name !== undefined) {
      updates.name = name;
    }

    if (bio !== undefined) {
      updates.bio = bio;
    }

    /* profile photo */

    if (req.file) {
      updates.profilePicture = req.file.path;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,

      {
        $set: updates,
      },

      {
        returnDocument: "after",
      },
    )

      .select("+profilePicture")

      .populate("role");

    console.log("UPDATED USER:", updatedUser);

    res.json({
      success: true,

      data: updatedUser,
    });
  } catch (error) {
    console.log("UPDATE PROFILE ERROR:");

    console.log(error);

    res.status(500).json({
      success: false,

      message: "Profile update failed",

      error: error.message,

      stack: error.stack,
    });
  }
};
// ==================== POSTS APIs ====================

// API #1: Create a post
const createPost = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.collegeId) {
      return res.status(400).json({
        success: false,
        message: "You are not associated with any college",
      });
    }

    const {
      title,
      content,
      module,
      visibility,
      roleAllowed,
      tags,
      externalAttachments,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Content is required",
      });
    }

    // Handle attachments
    let attachmentUrls = [];

    // 1. Handle uploaded files (from form-data)
    if (req.files && req.files.length > 0) {
      attachmentUrls = req.files.map((file) => file.path);
    }

    // 2. Handle external URLs (from JSON)
    if (externalAttachments && Array.isArray(externalAttachments)) {
      attachmentUrls.push(...externalAttachments);
    }

    const post = await Post.create({
      author: user._id,
      collegeId: user.collegeId,
      title: title.trim(),
      content: content.trim(),
      attachments: attachmentUrls,
      module: module || "feed",
      visibility: visibility || "campus",
      roleAllowed: roleAllowed || ["student", "teacher", "alumni"],
      tags: tags || [],
      isPinned: false,
      isDeleted: false,
    });

    await post.populate("author", "name email profilePicture");

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      data: post,
    });
  } catch (error) {
    console.error("Create Post Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create post",
      error: error.message,
    });
  }
};

// API #2: Get all posts (feed)
const getPosts = async (req, res) => {
  try {
    const user = req.user;

    if (!user || !user.collegeId) {
      return res.status(400).json({
        success: false,
        message: "User not associated with any college",
      });
    }

    let filter = {
      collegeId: user.collegeId,
      isDeleted: false,
      roleAllowed: { $in: [user.role?.name] },
    };

    if (req.query.module) filter.module = req.query.module;
    if (req.query.visibility) filter.visibility = req.query.visibility;
    if (req.query.authorId) filter.author = req.query.authorId;

    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { content: { $regex: req.query.search, $options: "i" } },
      ];
    }

    if (req.query.tags) {
      const tagsArray = req.query.tags.split(",");
      filter.tags = { $in: tagsArray };
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let sort = { createdAt: -1 };
    if (req.query.sortBy === "oldest") {
      sort = { createdAt: 1 };
    } else if (req.query.sortBy === "mostLiked") {
      sort = { reactionsCount: -1 };
    }

    const posts = await Post.find(filter)
      .populate("author", "name email profilePicture role")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const postsWithStats = await Promise.all(
      posts.map(async (post) => {
        const reactions = await Reaction.countDocuments({
          postId: post._id,
          commentId: null,
        });

        // ✅ USE CACHED commentCount from Post schema instead of counting again
        // const comments = await Comment.countDocuments({
        //   postId: post._id,
        //   isDeleted: false,
        // });

        const userReaction = await Reaction.findOne({
          postId: post._id,
          userId: user._id,
          commentId: null,
        });
        const saved = await SavedPost.exists({
          user: user._id,

          post: post._id,
        });

        return {
          ...post.toObject(),
          reactionsCount: reactions,
          commentsCount: post.commentCount || 0, // ✅ Use cached field
          userReaction: userReaction?.type || null,
          isSaved: !!saved,
        };
      }),
    );

    const total = await Post.countDocuments(filter);

    res.json({
      success: true,
      count: postsWithStats.length,
      posts: postsWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get Posts Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch posts",
      error: error.message,
    });
  }
};

// API #3: Get single post by ID
const getPostById = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const post = await Post.findById(id).populate(
      "author",
      "name email profilePicture role",
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    if (post.collegeId.toString() !== user.collegeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied - Post from another college",
      });
    }

    if (!post.roleAllowed.includes(user.role?.name)) {
      return res.status(403).json({
        success: false,
        message: "Your role cannot view this post",
      });
    }

    const reactions = await Reaction.countDocuments({
      postId: post._id,
      commentId: null,
    });
    const comments = await Comment.countDocuments({
      postId: post._id,
      isDeleted: false,
    });
    const userReaction = await Reaction.findOne({
      postId: post._id,
      userId: user._id,
      commentId: null,
    });
    const saved = await SavedPost.exists({
      user: user._id,

      post: post._id,
    });

    res.json({
      success: true,
      post: {
        ...post.toObject(),
        reactionsCount: reactions,
        commentsCount: comments,
        userReaction: userReaction?.type || null,
        isSaved: !!saved,
      },
    });
  } catch (error) {
    console.error("Get Post By ID Error:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch post",
      error: error.message,
    });
  }
};

// API #4: Update a post
const updatePost = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const {
      title,
      content,
      attachments,
      module,
      visibility,
      roleAllowed,
      tags,
    } = req.body;

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    if (post.author.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own posts",
      });
    }

    if (post.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Cannot update a deleted post",
      });
    }

    let attachmentUrls = post.attachments || [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await uploadToCloudinary(file.buffer, "feed-posts");
          attachmentUrls.push(result.secure_url);
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
        }
      }
    }

    if (attachments && Array.isArray(attachments)) {
      attachmentUrls = attachments;
    }

    if (title) post.title = title.trim();
    if (content) post.content = content.trim();
    if (module) post.module = module;
    if (visibility) post.visibility = visibility;
    if (roleAllowed) post.roleAllowed = roleAllowed;
    if (tags) post.tags = tags;
    post.attachments = attachmentUrls;

    await post.save();
    await post.populate("author", "name email profilePicture");

    res.json({
      success: true,
      message: "Post updated successfully",
      data: post,
    });
  } catch (error) {
    console.error("Update Post Error:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update post",
      error: error.message,
    });
  }
};

// API #5: Delete a post (soft delete)
const deletePost = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const isOwner = post.author.toString() === user._id.toString();
    const isAdmin =
      user.role?.name === "admin" || user.role?.name === "globalAdmin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own posts",
      });
    }

    if (post.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Post is already deleted",
      });
    }

    post.isDeleted = true;
    await post.save();

    await Comment.updateMany({ postId: id }, { isDeleted: true });

    res.json({
      success: true,
      message: "Post deleted successfully",
      data: {
        _id: post._id,
        title: post.title,
        deletedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Delete Post Error:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete post",
      error: error.message,
    });
  }
};

// API #6: Pin/Unpin a post (Admin only)
const pinPost = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { isPinned } = req.body;

    const isAdmin =
      user.role?.name === "admin" || user.role?.name === "globalAdmin";

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only admins can pin or unpin posts",
      });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    if (post.collegeId.toString() !== user.collegeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only pin posts from your own college",
      });
    }

    if (isPinned !== undefined) {
      post.isPinned = isPinned;
    } else {
      post.isPinned = !post.isPinned;
    }

    await post.save();

    res.json({
      success: true,
      message: post.isPinned
        ? "Post pinned successfully"
        : "Post unpinned successfully",
      data: {
        _id: post._id,
        title: post.title,
        isPinned: post.isPinned,
      },
    });
  } catch (error) {
    console.error("Pin Post Error:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to pin/unpin post",
      error: error.message,
    });
  }
};

// API #7: Get my own posts
const getMyPosts = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Filters

    let filter = {
      author: user._id,
      isDeleted: false,
    };

    if (req.query.module) {
      filter.module = req.query.module;
    }

    if (req.query.visibility) {
      filter.visibility = req.query.visibility;
    }

    if (req.query.search) {
      filter.$or = [
        {
          title: {
            $regex: req.query.search,

            $options: "i",
          },
        },

        {
          content: {
            $regex: req.query.search,

            $options: "i",
          },
        },
      ];
    }

    // Pagination

    const page = parseInt(req.query.page) || 1;

    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    // Sorting

    let sort = {
      createdAt: -1,
    };

    if (req.query.sortBy === "oldest") {
      sort = {
        createdAt: 1,
      };
    }

    // Fetch Posts

    const posts = await Post.find(filter)
      .populate("author", "name email profilePicture")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Add counts + current user reaction

    const postsWithStats = await Promise.all(
      posts.map(async (post) => {
        const reactions = await Reaction.countDocuments({
          postId: post._id,
          commentId: null,
        });

        const comments = await Comment.countDocuments({
          postId: post._id,

          isDeleted: false,
        });

        const userReaction = await Reaction.findOne({
          postId: post._id,

          userId: user._id,

          type: "like",
        });
        const saved = await SavedPost.exists({
          user: user._id,

          post: post._id,
        });

        return {
          ...post.toObject(),

          reactionsCount: reactions,

          commentsCount: comments,

          userReaction: !!userReaction,
          isSaved: !!saved,
        };
      }),
    );

    const total = await Post.countDocuments(filter);

    res.json({
      success: true,

      count: postsWithStats.length,

      posts: postsWithStats,

      pagination: {
        page,

        limit,

        total,

        pages: Math.ceil(total / limit),

        hasNext: page < Math.ceil(total / limit),

        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get My Posts Error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch your posts",

      error: error.message,
    });
  }
};

// ==================== COMMENTS APIs ====================

// API #13: Add comment to a post
// API #13: Add comment to a post
const addComment = async (req, res) => {
  try {
    const user = req.user;
    const { postId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment content is required",
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    if (post.collegeId.toString() !== user.collegeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Cannot comment on posts from another college",
      });
    }

    const comment = await Comment.create({
      postId: postId,
      author: user._id,
      collegeId: user.collegeId,
      content: content.trim(),
      parentCommentId: null,
      isDeleted: false,
    });

    await comment.populate("author", "name email profilePicture");

    // ✅ ADD THIS - Increment comment count
    await Post.findByIdAndUpdate(postId, {
      $inc: { commentCount: 1 },
    });

    // Create notification
    if (post.author && post.author.toString() !== user._id.toString()) {
      await createNotification({
        title: "New Comment",
        message: `${user.name} commented on your post`,
        userId: post.author,
        actorId: user._id,
        type: "comment",
        targetId: post._id,
        targetModel: "Post",
        link: "/dashboard/feed",
        collegeId: user.collegeId,
        module: "feed",
        visibility: "campus",
      });
    }

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: comment,
    });
  } catch (error) {
    console.error("Add Comment Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add comment",
      error: error.message,
    });
  }
};

// API #14: Get comments for a post
const getComments = async (req, res) => {
  try {
    const user = req.user;
    const { postId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    if (post.collegeId.toString() !== user.collegeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // ROOT COMMENTS
    const comments = await Comment.find({
      postId,
      isDeleted: false,
      parentCommentId: null,
    })
      .populate("author", "name profilePicture role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const reactionsCount = await Reaction.countDocuments({
          commentId: comment._id,
          type: "like",
        });

        const isLikedByUser = !!(await Reaction.findOne({
          commentId: comment._id,
          userId: user._id,
          type: "like",
        }));

        // REPLIES
        const repliesRaw = await Comment.find({
          parentCommentId: comment._id,
          isDeleted: false,
        })
          .populate("author", "name profilePicture role")
          .populate("replyToUser", "name")
          .sort({ createdAt: 1 });

        const replies = await Promise.all(
          repliesRaw.map(async (reply) => {
            const likes = await Reaction.countDocuments({
              commentId: reply._id,
              type: "like",
            });

            const liked = !!(await Reaction.findOne({
              commentId: reply._id,
              userId: user._id,
              type: "like",
            }));

            return {
              ...reply.toObject(),
              reactionsCount: likes,
              isLikedByUser: liked,
            };
          }),
        );

        return {
          ...comment.toObject(),
          replies,
          reactionsCount,
          isLikedByUser,
        };
      }),
    );

    // 🔥 FIX 1: Count root comments
    const rootCommentsCount = await Comment.countDocuments({
      postId,
      isDeleted: false,
      parentCommentId: null,
    });

    // 🔥 FIX 2: Count all replies
    const repliesCount = await Comment.countDocuments({
      postId,
      isDeleted: false,
      parentCommentId: { $ne: null }, // Not null means replies
    });

    // 🔥 FIX 3: Total = root comments + replies
    const totalCommentsWithReplies = rootCommentsCount + repliesCount;

    // Pagination for root comments only (since we paginate root comments)
    const hasNext = skip + limit < rootCommentsCount;
    const totalPages = Math.ceil(rootCommentsCount / limit);

    return res.status(200).json({
      success: true,
      comments: commentsWithReplies,
      count: commentsWithReplies.length,
      total: totalCommentsWithReplies, // 🔥 FIXED: Now includes replies
      rootCommentsCount: rootCommentsCount,
      repliesCount: repliesCount,
      pagination: {
        currentPage: page,
        limit: limit,
        total: totalCommentsWithReplies, // 🔥 FIXED: Total with replies
        rootCommentsTotal: rootCommentsCount,
        totalPages: totalPages,
        hasNext: hasNext,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get Comments Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// API #15: Reply to a comment (nested reply)
const replyToComment = async (req, res) => {
  try {
    const user = req.user;
    const { commentId } = req.params;
    const { content, replyToUser } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply content required",
      });
    }

    const parentComment = await Comment.findById(commentId);

    if (!parentComment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (parentComment.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Comment deleted",
      });
    }

    const post = await Post.findById(parentComment.postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    if (post.collegeId.toString() !== user.collegeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const rootComment = parentComment.parentCommentId || parentComment._id;

    const reply = await Comment.create({
      postId: parentComment.postId,
      author: user._id,
      collegeId: user.collegeId,
      content: content.trim(),
      parentCommentId: rootComment,
      replyToUser: replyToUser || parentComment.author,
      isDeleted: false,
    });

    await reply.populate([
      {
        path: "author",
        select: "name email profilePicture",
      },
      {
        path: "replyToUser",
        select: "name",
      },
    ]);

    // ✅ ADD THIS - Increment comment count for the post
    await Post.findByIdAndUpdate(parentComment.postId, {
      $inc: { commentCount: 1 },
    });

    if (
      parentComment.author &&
      parentComment.author.toString() !== user._id.toString()
    ) {
      await createNotification({
        title: "New Reply",
        message: `${user.name} replied to your comment`,
        userId: parentComment.author,
        actorId: user._id,
        type: "reply",
        targetId: reply._id,
        targetModel: "Comment",
        link: "/dashboard/feed",
        collegeId: user.collegeId,
        module: "feed",
        visibility: "campus",
      });
    }

    res.status(201).json({
      success: true,
      message: "Reply added",
      data: reply,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Failed to reply",
    });
  }
};

// API #16: Update a comment
const updateComment = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment content is required",
      });
    }

    // Find the comment
    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check ownership - only author can update
    if (comment.author.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own comments",
      });
    }

    // Check if comment is deleted
    if (comment.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Cannot update a deleted comment",
      });
    }

    // Update comment
    comment.content = content.trim();
    await comment.save();

    await comment.populate("author", "name email profilePicture");

    res.json({
      success: true,
      message: "Comment updated successfully",
      data: comment,
    });
  } catch (error) {
    console.error("Update Comment Error:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update comment",
      error: error.message,
    });
  }
};

// API #17: Delete a comment (soft delete)
const deleteComment = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    // Find the comment
    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check ownership or admin
    const isOwner = comment.author.toString() === user._id.toString();
    const isAdmin =
      user.role?.name === "admin" || user.role?.name === "globalAdmin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own comments",
      });
    }

    // Check if already deleted
    if (comment.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Comment is already deleted",
      });
    }

    let deletedCount = 1;

    // delete current comment first
    comment.isDeleted = true;

    await comment.save();

    // if root comment → delete replies too
    if (!comment.parentCommentId) {
      deletedCount += await Comment.countDocuments({
        parentCommentId: comment._id,
        isDeleted: false,
      });

      await Comment.updateMany(
        {
          parentCommentId: comment._id,
        },
        {
          isDeleted: true,
        },
      );
    }

    await Post.findByIdAndUpdate(comment.postId, {
      $inc: {
        commentCount: -deletedCount,
      },
    });

    res.json({
      success: true,
      message: "Comment deleted successfully",
      data: {
        _id: comment._id,
        deletedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Delete Comment Error:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete comment",
      error: error.message,
    });
  }
};
// API #18: Like a comment
const likeComment = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (comment.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Cannot like a deleted comment",
      });
    }

    if (comment.collegeId.toString() !== user.collegeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Cannot like comments from another college",
      });
    }

    // Check if already liked with type "like"
    const existingReaction = await Reaction.findOne({
      postId: comment.postId,
      commentId: comment._id,
      userId: user._id,
      type: "like",
    });

    if (existingReaction) {
      return res.status(200).json({
        success: true,
        message: "Comment already liked",
        data: existingReaction,
      });
    }

    // Create new like reaction
    const reaction = await Reaction.create({
      postId: comment.postId,
      commentId: comment._id,
      userId: user._id,
      type: "like",
    });
    // Create notification
    if (comment.author && comment.author.toString() !== user._id.toString()) {
      await createNotification({
        title: "Comment Liked",

        message: `${user.name} liked your comment`,

        userId: comment.author,

        actorId: user._id,

        type: "comment_like",

        targetId: comment._id,

        targetModel: "Comment",

        link: "/dashboard/feed",

        collegeId: user.collegeId,

        module: "feed",

        visibility: "campus",
      });
    }
    res.status(201).json({
      success: true,
      message: "Comment liked successfully",
      data: reaction,
    });
  } catch (error) {
    console.error("Like Comment Error:", error);

    // Only catch duplicate key error for commentId
    if (error.code === 11000 && error.keyPattern?.commentId) {
      return res.status(200).json({
        success: true,
        message: "Comment already liked",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to like comment",
      error: error.message,
    });
  }
};
// API #19: Unlike a comment (remove like)
const unlikeComment = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    // Find the comment first
    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check if comment is deleted
    if (comment.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Cannot unlike a deleted comment",
      });
    }

    // Check college access
    if (comment.collegeId.toString() !== user.collegeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Cannot unlike comments from another college",
      });
    }

    // Find the reaction with type "like"
    const reaction = await Reaction.findOne({
      postId: comment.postId,
      commentId: comment._id,
      userId: user._id,
      type: "like",
    });

    if (!reaction) {
      return res.status(404).json({
        success: false,
        message: "Like not found on this comment",
      });
    }

    // Delete the reaction
    await reaction.deleteOne();

    res.json({
      success: true,
      message: "Comment unliked successfully",
      data: {
        commentId: id,
        unlikedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Unlike Comment Error:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to unlike comment",
      error: error.message,
    });
  }
};

// ==================== REACTION APIs ====================

// API #21: Add reaction to a post (like, love, insightful, helpful)
const addPostReaction = async (req, res) => {
  try {
    const user = req.user;
    const { postId } = req.params;
    const { type } = req.body;

    // Validate reaction type
    const validTypes = ["like", "love", "insightful", "helpful"];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid reaction type. Allowed: like, love, insightful, helpful",
      });
    }

    // Find the post
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check college access
    if (post.collegeId.toString() !== user.collegeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Cannot react to posts from another college",
      });
    }

    // Check if user already reacted
    const existingReaction = await Reaction.findOne({
      postId: postId,
      userId: user._id,
      commentId: null,
    });

    if (existingReaction) {
      // Update existing reaction
      existingReaction.type = type;
      await existingReaction.save();

      return res.json({
        success: true,
        message: `Reaction updated to ${type}`,
        data: existingReaction,
      });
    }

    // Create new reaction
    const reaction = await Reaction.create({
      postId: postId,
      commentId: null,
      userId: user._id,
      type: type,
    });

    // Create notification
    if (post.author && post.author.toString() !== user._id.toString()) {
      await createNotification({
        title: "Post Reaction",
        message: `${user.name} reacted ${type} to your post`,
        userId: post.author,
        actorId: user._id,
        type: "post_like",
        targetId: post._id,
        targetModel: "Post",
        link: "/dashboard/feed",
        collegeId: user.collegeId,
        module: "feed",
        visibility: "campus",
      });
    }

    res.status(201).json({
      success: true,
      message: `Post ${type}d successfully`,
      data: reaction,
    });
  } catch (error) {
    console.error("Add Post Reaction Error:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to add reaction",
      error: error.message,
    });
  }
};

// API #22: Remove reaction from a post
const removePostReaction = async (req, res) => {
  try {
    const user = req.user;
    const { postId } = req.params;

    // Find the reaction
    const reaction = await Reaction.findOne({
      postId: postId,
      userId: user._id,
      commentId: null,
    });

    if (!reaction) {
      return res.status(404).json({
        success: false,
        message: "No reaction found on this post",
      });
    }

    // Delete the reaction
    await reaction.deleteOne();

    res.json({
      success: true,
      message: "Reaction removed successfully",
      data: {
        postId: postId,
        removedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Remove Post Reaction Error:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to remove reaction",
      error: error.message,
    });
  }
};

// API #23: Get all reactions for a post
const getPostReactions = async (req, res) => {
  try {
    const user = req.user;
    const { postId } = req.params;

    // Find the post
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check college access
    if (post.collegeId.toString() !== user.collegeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Get all reactions for this post
    const reactions = await Reaction.find({
      postId: postId,
      commentId: null,
    }).populate("userId", "name email profilePicture");

    // Group reactions by type
    const summary = {
      like: reactions.filter((r) => r.type === "like").length,
      love: reactions.filter((r) => r.type === "love").length,
      insightful: reactions.filter((r) => r.type === "insightful").length,
      helpful: reactions.filter((r) => r.type === "helpful").length,
      total: reactions.length,
    };

    // Get users who reacted (for display)
    const usersByType = {
      like: reactions.filter((r) => r.type === "like").map((r) => r.userId),
      love: reactions.filter((r) => r.type === "love").map((r) => r.userId),
      insightful: reactions
        .filter((r) => r.type === "insightful")
        .map((r) => r.userId),
      helpful: reactions
        .filter((r) => r.type === "helpful")
        .map((r) => r.userId),
    };

    // Check current user's reaction
    const userReaction = await Reaction.findOne({
      postId: postId,
      userId: user._id,
      commentId: null,
    });

    res.json({
      success: true,
      summary: summary,
      userReaction: userReaction?.type || null,
      usersByType: usersByType,
      reactions: reactions,
    });
  } catch (error) {
    console.error("Get Post Reactions Error:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch reactions",
      error: error.message,
    });
  }
};

// API #24: Get all reactions for a comment
const getCommentReactions = async (req, res) => {
  try {
    const user = req.user;
    const { commentId } = req.params;

    // Find the comment
    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check college access
    if (comment.collegeId.toString() !== user.collegeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Get all reactions for this comment
    const reactions = await Reaction.find({
      commentId: commentId,
    }).populate("userId", "name email profilePicture");

    // Get reaction count
    const likeCount = reactions.filter((r) => r.type === "like").length;

    // Check if current user liked this comment
    const userReaction = await Reaction.findOne({
      commentId: commentId,
      userId: user._id,
    });

    res.json({
      success: true,
      count: reactions.length,
      likeCount: likeCount,
      userLiked: !!userReaction,
      reactions: reactions,
    });
  } catch (error) {
    console.error("Get Comment Reactions Error:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch comment reactions",
      error: error.message,
    });
  }
};

// ================   NOTIFICATIONS ===============================

// API #29: Get all notifications for logged-in user
const getNotifications = async (req, res) => {
  try {
    const user = req.user;

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build query - get notifications for this user
    const query = {
      $or: [
        { userId: user._id }, // Direct notifications to user
        {
          userId: null, // Broadcast notifications
          collegeId: { $in: [null, user.collegeId] },
          role: { $in: [user.role?.name, "all"] },
        },
      ],
    };

    // Get notifications
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      ...query,
      isRead: false,
    });

    const total = await Notification.countDocuments(query);

    res.json({
      success: true,
      unreadCount: unreadCount,
      count: notifications.length,
      notifications: notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
};

// ===================follow===================
// API #37: Follow a user
const followUser = async (req, res) => {
  try {
    const user = req.user;
    const { userId } = req.params;

    // Cannot follow yourself
    if (user._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself",
      });
    }

    // Check if user exists
    const userToFollow = await User.findById(userId);
    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if same college
    if (userToFollow.collegeId.toString() !== user.collegeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only follow users from your college",
      });
    }

    // Check if already following
    const existingFollow = await Follow.findOne({
      follower: user._id,
      following: userId,
    });

    if (existingFollow) {
      return res.status(400).json({
        success: false,
        message: "You are already following this user",
      });
    }

    // Create follow
    const follow = await Follow.create({
      follower: user._id,
      following: userId,
      collegeId: user.collegeId,
    });

    // Create notification for the user being followed
    await createNotification({
      title: "New Follower",
      message: `${user.name} started following you`,
      userId: userToFollow._id,
      actorId: user._id,
      type: "follow",
      targetId: user._id,
      targetModel: "User",
      link: `/dashboard/user/${user._id}`,
      collegeId: user.collegeId,
      module: "feed",
      visibility: "campus",
    });

    res.status(201).json({
      success: true,
      message: `You are now following ${userToFollow.name}`,
      data: follow,
    });
  } catch (error) {
    console.error("Follow User Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You are already following this user",
      });
    }

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to follow user",
      error: error.message,
    });
  }
};
// API #38: Unfollow a user
const unfollowUser = async (req, res) => {
  try {
    const user = req.user;
    const { userId } = req.params;

    // Find the follow relationship
    const follow = await Follow.findOne({
      follower: user._id,
      following: userId,
    });

    if (!follow) {
      return res.status(404).json({
        success: false,
        message: "You are not following this user",
      });
    }

    // Delete the follow
    await follow.deleteOne();

    res.json({
      success: true,
      message: "Unfollowed successfully",
      data: {
        userId: userId,
        unfollowedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Unfollow User Error:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to unfollow user",
      error: error.message,
    });
  }
};

// API #39: Get followers of a user
const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user;

    // Check if user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get followers
    const followers = await Follow.find({ following: userId })
      .populate("follower", "name email profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Check which followers the current user follows back
    const followersWithStatus = await Promise.all(
      followers.map(async (follow) => {
        const followsBack = await Follow.findOne({
          follower: currentUser._id,
          following: follow.follower._id,
        });

        return {
          ...follow.toObject(),
          followsBack: !!followsBack,
        };
      }),
    );

    const total = await Follow.countDocuments({ following: userId });

    res.json({
      success: true,
      count: followersWithStatus.length,
      followers: followersWithStatus,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get Followers Error:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch followers",
      error: error.message,
    });
  }
};

// API #40: Get users that a user is following
const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user;

    // Check if user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get following list
    const following = await Follow.find({ follower: userId })
      .populate("following", "name email profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Check which users follow back the current user
    const followingWithStatus = await Promise.all(
      following.map(async (follow) => {
        const followsBack = await Follow.findOne({
          follower: currentUser._id,
          following: follow.following._id,
        });

        return {
          ...follow.toObject(),
          followsBack: !!followsBack,
        };
      }),
    );

    const total = await Follow.countDocuments({ follower: userId });

    res.json({
      success: true,
      count: followingWithStatus.length,
      following: followingWithStatus,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get Following Error:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch following list",
      error: error.message,
    });
  }
};

// API #41: Get mutual friends (users you follow who follow you back)
const getMutualFriends = async (req, res) => {
  try {
    const currentUser = req.user;
    const { userId } = req.params;

    // If userId is provided, get mutual friends between current user and that user
    // Otherwise, get current user's mutual friends (people who follow each other)
    const targetUserId = userId || currentUser._id;

    // Get users that current user follows
    const myFollowing = await Follow.find({
      follower: currentUser._id,
    }).distinct("following");

    // Get users that follow current user
    const myFollowers = await Follow.find({
      following: currentUser._id,
    }).distinct("follower");

    // If viewing another user's mutual friends
    let theirFollowing = [];
    let theirFollowers = [];

    if (userId && userId.toString() !== currentUser._id.toString()) {
      theirFollowing = await Follow.find({ follower: targetUserId }).distinct(
        "following",
      );
      theirFollowers = await Follow.find({ following: targetUserId }).distinct(
        "follower",
      );
    }

    // Find mutual friends
    let mutualIds;
    if (userId && userId.toString() !== currentUser._id.toString()) {
      // Mutual friends between current user and target user
      // Users that both follow each other OR both are followed by both
      const myFollowBoth = myFollowing.filter((id) =>
        theirFollowers.includes(id),
      );
      const theirFollowBoth = theirFollowing.filter((id) =>
        myFollowers.includes(id),
      );
      mutualIds = [...new Set([...myFollowBoth, ...theirFollowBoth])];
    } else {
      // Current user's mutual friends (people who follow each other)
      mutualIds = myFollowing.filter((id) => myFollowers.includes(id));
    }

    // Get user details
    const mutualFriends = await User.find({ _id: { $in: mutualIds } })
      .select("name email profilePicture")
      .limit(20);

    res.json({
      success: true,
      count: mutualFriends.length,
      mutualFriends,
    });
  } catch (error) {
    console.error("Get Mutual Friends Error:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch mutual friends",
      error: error.message,
    });
  }
};

// API #42: Suggest users to follow
const getUserSuggestions = async (req, res) => {
  try {
    const user = req.user;

    // Get users already followed by current user
    const following = await Follow.find({ follower: user._id }).distinct(
      "following",
    );

    // Add current user to exclude list
    const excludeUsers = [...following, user._id];

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Find users from same college, not already followed, not self
    const suggestions = await User.find({
      _id: { $nin: excludeUsers },
      collegeId: user.collegeId,
      isBlocked: false,
    })
      .select("name email profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({
      _id: { $nin: excludeUsers },
      collegeId: user.collegeId,
      isBlocked: false,
    });

    res.json({
      success: true,
      count: suggestions.length,
      suggestions: suggestions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get User Suggestions Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch suggestions",
      error: error.message,
    });
  }
};

//=================== Block ====================

// API #43: Block a user
const blockUser = async (req, res) => {
  try {
    const user = req.user;
    const { userId } = req.params;

    // Cannot block yourself
    if (user._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot block yourself",
      });
    }

    // Check if user exists
    const userToBlock = await User.findById(userId);
    if (!userToBlock) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already blocked
    const existingBlock = await Block.findOne({
      blocker: user._id,
      blocked: userId,
    });

    if (existingBlock) {
      return res.status(400).json({
        success: false,
        message: "You have already blocked this user",
      });
    }

    // Create block
    const block = await Block.create({
      blocker: user._id,
      blocked: userId,
      collegeId: user.collegeId,
    });

    // If following this user, unfollow them
    await Follow.deleteOne({
      follower: user._id,
      following: userId,
    });

    // If they are following you, remove that too
    await Follow.deleteOne({
      follower: userId,
      following: user._id,
    });

    res.status(201).json({
      success: true,
      message: `You have blocked ${userToBlock.name}`,
      data: block,
    });
  } catch (error) {
    console.error("Block User Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You have already blocked this user",
      });
    }

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to block user",
      error: error.message,
    });
  }
};

// API #44: Unblock a user
const unblockUser = async (req, res) => {
  try {
    const user = req.user;
    const { userId } = req.params;

    // Find the block relationship
    const block = await Block.findOne({
      blocker: user._id,
      blocked: userId,
    });

    if (!block) {
      return res.status(404).json({
        success: false,
        message: "You have not blocked this user",
      });
    }

    // Get user name for response
    const blockedUser = await User.findById(userId);
    const userName = blockedUser ? blockedUser.name : "User";

    // Delete the block
    await block.deleteOne();

    res.json({
      success: true,
      message: `You have unblocked ${userName}`,
      data: {
        userId: userId,
        unblockedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Unblock User Error:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to unblock user",
      error: error.message,
    });
  }
};

//=================== search ====================

// API #45: Global search (posts, users, comments)
const globalSearch = async (req, res) => {
  try {
    const user = req.user;
    const { q, type, page = 1, limit = 10 } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const searchQuery = q.trim();
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let results = {
      posts: [],
      users: [],
      comments: [],
    };

    // Search Posts
    if (!type || type === "posts") {
      const postFilter = {
        collegeId: user.collegeId,
        isDeleted: false,
        roleAllowed: { $in: [user.role?.name] },
        $or: [
          { title: { $regex: searchQuery, $options: "i" } },
          { content: { $regex: searchQuery, $options: "i" } },
          { tags: { $in: [new RegExp(searchQuery, "i")] } },
        ],
      };

      const posts = await Post.find(postFilter)
        .populate("author", "name email profilePicture")
        .sort({ createdAt: -1 })
        .limit(limitNum);

      results.posts = posts;
    }

    // Search Users
    if (!type || type === "users") {
      const userFilter = {
        collegeId: user.collegeId,
        isBlocked: false,
        _id: { $ne: user._id },
        $or: [
          { name: { $regex: searchQuery, $options: "i" } },
          { email: { $regex: searchQuery, $options: "i" } },
        ],
      };

      const users = await User.find(userFilter)
        .select("name email profilePicture")
        .limit(limitNum);

      results.users = users;
    }

    // Search Comments
    if (!type || type === "comments") {
      const commentFilter = {
        collegeId: user.collegeId,
        isDeleted: false,
        content: { $regex: searchQuery, $options: "i" },
      };

      const comments = await Comment.find(commentFilter)
        .populate("author", "name email profilePicture")
        .populate("postId", "title")
        .sort({ createdAt: -1 })
        .limit(limitNum);

      results.comments = comments;
    }

    res.json({
      success: true,
      query: searchQuery,
      results: results,
      pagination: {
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("Global Search Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to perform search",
      error: error.message,
    });
  }
};

// API #46: Search posts only
const searchPosts = async (req, res) => {
  try {
    const user = req.user;
    const { q, page = 1, limit = 10 } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const searchQuery = q.trim();
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build search filter for posts only
    const filter = {
      collegeId: user.collegeId,
      isDeleted: false,
      roleAllowed: { $in: [user.role?.name] },
      $or: [
        { title: { $regex: searchQuery, $options: "i" } },
        { content: { $regex: searchQuery, $options: "i" } },
        { tags: { $in: [new RegExp(searchQuery, "i")] } },
      ],
    };

    // Get posts
    const posts = await Post.find(filter)
      .populate("author", "name email profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Post.countDocuments(filter);

    res.json({
      success: true,
      query: searchQuery,
      count: posts.length,
      posts: posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total,
        pages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Search Posts Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search posts",
      error: error.message,
    });
  }
};

// API #47: Search users only
const searchUsers = async (req, res) => {
  try {
    const user = req.user;
    const { q, page = 1, limit = 10 } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const searchQuery = q.trim();
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build search filter for users only
    const filter = {
      collegeId: user.collegeId,
      isBlocked: false,
      _id: { $ne: user._id }, // Exclude self
      $or: [
        { name: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
      ],
    };

    // Get users
    const users = await User.find(filter)
      .select("name email profilePicture")
      .sort({ name: 1 })
      .skip(skip)
      .limit(limitNum);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      query: searchQuery,
      count: users.length,
      users: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total,
        pages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Search Users Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search users",
      error: error.message,
    });
  }
};

// API #48: get user details by id
const getUserDetails = async (req, res) => {
  try {
    const currentUser = req.user;

    const { userId } = req.params;

    const user = await User.findById(userId)

      .select("name email profilePicture bio role createdAt")

      .populate("role", "name");

    if (!user) {
      return res.status(404).json({
        success: false,

        message: "User not found",
      });
    }

    const [followers, following, posts, followStatus] = await Promise.all([
      Follow.countDocuments({
        following: userId,
      }),

      Follow.countDocuments({
        follower: userId,
      }),

      Post.countDocuments({
        author: userId,

        isDeleted: false,
      }),

      Follow.findOne({
        follower: currentUser._id,

        following: userId,
      }),
    ]);

    res.json({
      success: true,

      user,

      stats: {
        followers,

        following,

        posts,
      },

      isFollowing: !!followStatus,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,

      message: "Failed to load profile",
    });
  }
};

//=====saved posts

// API #49: save post
const savePost = async (req, res) => {
  try {
    const user = req.user;

    const { id } = req.params;

    const post = await Post.findById(id);

    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    if (post.collegeId.toString() !== user.collegeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const existing = await SavedPost.findOne({
      user: user._id,

      post: id,
    });

    if (existing) {
      return res.status(200).json({
        success: true,

        message: "Post already saved",
      });
    }

    const saved = await SavedPost.create({
      user: user._id,

      post: id,

      collegeId: user.collegeId,
    });

    res.status(201).json({
      success: true,

      message: "Post saved",

      data: saved,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,

      message: "Failed to save post",
    });
  }
};

//api #50: unsave posts
const unsavePost = async (req, res) => {
  try {
    const user = req.user;

    const { id } = req.params;

    const saved = await SavedPost.findOne({
      user: user._id,

      post: id,
    });

    if (!saved) {
      return res.status(404).json({
        success: false,

        message: "Saved post not found",
      });
    }

    await saved.deleteOne();

    res.json({
      success: true,

      message: "Post removed from saved",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,

      message: "Failed to unsave post",
    });
  }
};

//api #51: get saved count
const getSavedPostsCount = async (req, res) => {
  try {
    const user = req.user;

    const count = await SavedPost.countDocuments({
      user: user._id,
    });

    res.json({
      success: true,

      count,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch saved count",
    });
  }
};

//api #52: get saved posts
const getSavedPosts = async (req, res) => {
  try {
    const user = req.user;
    
    // Get page and limit from query params (default: page 1, limit 10)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // First, get total count of saved posts
    const totalSaved = await SavedPost.countDocuments({
      user: user._id,
    });

    // Get paginated saved posts
    const saved = await SavedPost.find({
      user: user._id,
    })
      .sort({ createdAt: -1 }) // Latest first
      .skip(skip)
      .limit(limit)
      .populate({
        path: "post",
        populate: {
          path: "author",
          select: "name email profilePicture role",
        },
      })
      .lean();

    // Extract posts from saved references
    const posts = saved
      .map((x) => x.post)
      .filter(Boolean);

    // Calculate pagination info
    const hasNext = skip + limit < totalSaved;
    const hasPrev = page > 1;
    const totalPages = Math.ceil(totalSaved / limit);

    return res.json({
      success: true,
      posts,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalSaved,
        itemsPerPage: limit,
        hasNext,
        hasPrev,
      },
      count: posts.length,
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch saved posts",
      error: error.message,
    });
  }
};
// ==================== EXPORTS ====================

module.exports = {
  //update profile
  updateUserProfile,
  // Posts
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  pinPost,
  getMyPosts,
  // Comments
  addComment,
  getComments,
  replyToComment,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
  //reaction
  addPostReaction,
  removePostReaction,
  getPostReactions,
  getCommentReactions,

  // Notifications
  getNotifications,

  //follow
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getMutualFriends,
  getUserSuggestions,

  // Block
  blockUser,
  unblockUser,

  // Search
  globalSearch,
  searchPosts,
  searchUsers,
  getUserDetails,

  // saved posts
  savePost,
  unsavePost,
  getSavedPostsCount,
  getSavedPosts,
};
