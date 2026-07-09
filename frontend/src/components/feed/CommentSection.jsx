import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import {
  getComments,
  addComment,
  replyToComment,
  likeComment,
  unlikeComment,
  deleteComment,
} from "../../services/commentService";

const CommentSection = ({ postId, onCommentAdded, targetComment }) => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [comments, setComments] = useState([]);
  const targetCommentRef = useRef(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [posting, setPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [likedComments, setLikedComments] = useState({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [totalComments, setTotalComments] = useState(0);
  const [totalLoaded, setTotalLoaded] = useState(0);

  const inputRef = useRef(null);
  const commentsEndRef = useRef(null);
  const observerRef = useRef(null);

  // Fetch Comments with Pagination
  // Fetch Comments with Pagination
  const fetchComments = useCallback(
    async (page = 1, append = false) => {
      try {
        if (page === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const data = await getComments(
  postId,
  page,
  20,
  {
    targetComment,
    prioritizeMine: !targetComment,
  }
);
        console.log("Fetched comments data:", data);

        let fetchedComments = Array.isArray(data.comments) ? data.comments : [];
        const pagination = data.pagination || {};

        // Filter out soft-deleted comments
        fetchedComments = fetchedComments.filter(
          (comment) => !comment.isDeleted,
        );

        // Also filter out soft-deleted replies
        fetchedComments = fetchedComments.map((comment) => {
          if (comment.replies && comment.replies.length > 0) {
            comment.replies = comment.replies.filter(
              (reply) => !reply.isDeleted,
            );
          }
          return comment;
        });

        // 🔥 FIX: Use data.total or pagination.total
        const total = data.total || pagination.total || fetchedComments.length;
        const hasNext = pagination.hasNext || false;

        setComments((prev) =>
          append ? [...prev, ...fetchedComments] : fetchedComments,
        );
        setHasMoreComments(hasNext);
        setTotalComments(total);
        setTotalLoaded((prev) =>
          append ? prev + fetchedComments.length : fetchedComments.length,
        );
        setCurrentPage(page);

        // Track which comments are liked by current user
        const liked = {};
        fetchedComments.forEach((comment) => {
          if (comment.isLikedByUser) {
            liked[comment._id] = true;
          }
          comment.replies?.forEach((reply) => {
            if (reply.isLikedByUser) {
              liked[reply._id] = true;
            }
          });
        });
        setLikedComments((prev) => (append ? { ...prev, ...liked } : liked));
      } catch (error) {
        console.log("Error fetching comments:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [postId, targetComment],
  );

  // Infinite scroll observer - FIXED
  const lastCommentElementRef = useCallback(
    (node) => {
      if (loading || loadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMoreComments) {
            console.log("Loading more comments... Page:", currentPage + 1);
            fetchComments(currentPage + 1, true);
          }
        },
        { threshold: 0.1, rootMargin: "100px" },
      );

      if (node) observerRef.current.observe(node);
    },
    [loading, loadingMore, hasMoreComments, currentPage, fetchComments],
  );

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      fetchComments(1, false);
    }, 0);

    return () => window.clearTimeout(initialLoad);
  }, [fetchComments]);

  useEffect(() => {
  if (!targetComment) return;

  setTimeout(() => {
    targetCommentRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 600);

}, [comments, targetComment]);
  // Auto focus input when replying
  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

  // Add Comment
  const handleAddComment = async () => {
    if (!content.trim()) return;

    try {
      setPosting(true);

      if (replyingTo?.id) {
        await replyToComment(
          replyingTo.id,
          content,
          replyingTo.replyToUser,
        );
      } else {
        await addComment(postId, content);
      }

      setContent("");
      setReplyingTo(null);

      // Reset to first page to see new comment
      await fetchComments(1, false);

      if (onCommentAdded) {
        onCommentAdded(1);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setPosting(false);
    }
  };

  // Handle reply
  const handleReply = (target, rootId = null) => {
    setReplyingTo({
      id: rootId || target._id,
      replyToUser: target.author?._id,
      name: target.author?.name,
    });
    setContent("");
    inputRef.current?.focus();
  };

  // Handle like/unlike comment
  const handleLikeComment = async (commentId) => {
    try {
      const isCurrentlyLiked = likedComments[commentId];

      // Immediate UI update - Optimistic
      setLikedComments((prev) => ({
        ...prev,
        [commentId]: !prev[commentId],
      }));

      // Update comments array with new counts immediately
      setComments((prevComments) => {
        return prevComments.map((comment) => {
          // Update main comment
          if (comment._id === commentId) {
            return {
              ...comment,
              reactionsCount: isCurrentlyLiked
                ? Math.max(0, (comment.reactionsCount || 0) - 1)
                : (comment.reactionsCount || 0) + 1,
              isLikedByUser: !isCurrentlyLiked,
            };
          }

          // Update reply inside comment
          if (comment.replies) {
            const updatedReplies = comment.replies.map((reply) => {
              if (reply._id === commentId) {
                return {
                  ...reply,
                  reactionsCount: isCurrentlyLiked
                    ? Math.max(0, (reply.reactionsCount || 0) - 1)
                    : (reply.reactionsCount || 0) + 1,
                  isLikedByUser: !isCurrentlyLiked,
                };
              }
              return reply;
            });

            return {
              ...comment,
              replies: updatedReplies,
            };
          }

          return comment;
        });
      });

      // API call in background
      if (isCurrentlyLiked) {
        await unlikeComment(commentId);
      } else {
        await likeComment(commentId);
      }
    } catch (error) {
      console.log(error);
      // Revert on error
      setLikedComments((prev) => ({
        ...prev,
        [commentId]: !prev[commentId],
      }));
      await fetchComments(currentPage, false);
    }
  };

  // Handle delete comment
  const handleDelete = async (commentId) => {
    try {
      let deletedCount = 1;

      for (const comment of comments) {
        if (comment._id === commentId) {
          deletedCount = 1;
          if (comment.replies && comment.replies.length > 0) {
            deletedCount += comment.replies.length;
          }
          break;
        }
        if (
          comment.replies &&
          comment.replies.find((r) => r._id === commentId)
        ) {
          deletedCount = 1;
          break;
        }
      }

      await deleteComment(commentId);
      await fetchComments(1, false); // Reset to first page after delete

      if (onCommentAdded) {
        onCommentAdded(-deletedCount);
      }
    } catch (error) {
      console.log(error);
      await fetchComments(currentPage, false);
    }
  };

  // Toggle replies visibility
  const toggleReplies = (commentId) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return "Just now";
    const commentDate = new Date(date);
    const now = new Date();
    const diffMs = now - commentDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return commentDate.toLocaleDateString();
  };

  return (
    <div className="comment-section">
      {/* Comment Input */}
      <div className="comment-input-wrapper">
        {replyingTo && (
          <div className="replying-badge">
            <span>Replying to @{replyingTo.name}</span>
            <button
              onClick={() => {
                setReplyingTo(null);
                setContent("");
              }}
              className="cancel-reply"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        )}

        <div className="input-container">
          <div className="input-avatar">
            <div className="avatar-placeholder-sm">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
          </div>

          <div className="input-field-wrapper">
            <textarea
              ref={inputRef}
              placeholder={
                replyingTo
                  ? `Write your reply to @${replyingTo.name}...`
                  : "Write a comment..."
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="comment-input"
              rows={content.length > 100 ? 3 : 1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
            />

            <button
              onClick={handleAddComment}
              disabled={posting || !content.trim()}
              className={`post-comment-btn ${posting ? "posting" : ""}`}
            >
              {posting ? (
                <div className="btn-spinner"></div>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                  Post
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Comments Count - FIXED to show total */}
      {!loading && totalComments > 0 && (
        <div className="comments-header">
          <div className="comments-count">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            <span>
              {totalComments} {totalComments === 1 ? "Comment" : "Comments"}
            </span>
            {totalLoaded < totalComments && (
              <span className="loaded-info">
                (Showing {totalLoaded} of {totalComments})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="comments-list">
        {loading && comments.length === 0 ? (
          <div className="loading-comments">
            <div className="comment-skeleton">
              <div className="skeleton-avatar"></div>
              <div className="skeleton-content">
                <div className="skeleton-line"></div>
                <div className="skeleton-line short"></div>
              </div>
            </div>
            <div className="comment-skeleton">
              <div className="skeleton-avatar"></div>
              <div className="skeleton-content">
                <div className="skeleton-line"></div>
                <div className="skeleton-line short"></div>
              </div>
            </div>
            <div className="comment-skeleton">
              <div className="skeleton-avatar"></div>
              <div className="skeleton-content">
                <div className="skeleton-line"></div>
                <div className="skeleton-line short"></div>
              </div>
            </div>
          </div>
        ) : comments.length === 0 ? (
          <div className="no-comments">
            <div className="no-comments-icon">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            </div>
            <h4>No comments yet</h4>
            <p>Be the first to share your thoughts!</p>
          </div>
        ) : (
          <>
            {comments.map((comment, index) => {
              const isLastComment = index === comments.length - 1;
              return (
                <div
                  key={comment._id}
                  ref={
                    comment._id === targetComment
                      ? targetCommentRef
                      : isLastComment
                        ? lastCommentElementRef
                        : null
                  }
                  className={`comment-item ${comment.isTemp ? "temp-comment" : ""}`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div
                    className="comment-avatar"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (comment.author?._id) {
                        navigate(`/dashboard/user/${comment.author._id}`);
                      }
                    }}
                  >
                    {comment.author?.profilePicture ? (
                      <img
                        src={comment.author.profilePicture}
                        alt={comment.author?.name || "User"}
                        draggable="false"
                      />
                    ) : (
                      <div className="avatar-placeholder-sm">
                        {(comment.author?.name || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="comment-content">
                    <div className="comment-header">
                      <div className="comment-author">
                        <span
                          className="author-name"
                          onClick={() =>
                            comment.author?._id &&
                            navigate(`/dashboard/user/${comment.author._id}`)
                          }
                        >
                          {comment.author?.name || "Anonymous User"}
                        </span>
                        {comment.author?.role && (
                          <span className="author-badge">
                            {comment.author.role.name === "Student"
                              ? "Student"
                              : "Teacher"}
                          </span>
                        )}
                        <span className="comment-time">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                    </div>

                    <p className="comment-text">{comment.content}</p>

                    <div className="comment-footer">
                      <div className="comment-likes">
                        {comment.reactionsCount > 0 && (
                          <span>
                            {comment.reactionsCount}{" "}
                            {comment.reactionsCount === 1 ? "like" : "likes"}
                          </span>
                        )}
                      </div>

                      <div className="comment-actions">
                        <button
                          onClick={() => handleReply(comment)}
                          className="reply-btn"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          Reply
                        </button>

                        <button
                          className={`like-btn ${likedComments[comment._id] ? "liked" : ""}`}
                          onClick={() => handleLikeComment(comment._id)}
                        >
                          {likedComments[comment._id] ? "Liked" : "Like"}
                        </button>

                        {comment.author?._id === user?._id && (
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(comment._id)}
                            title="Delete comment"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                            Delete
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Reply indicator */}
                    {comment.replies?.length > 0 && (
                      <div className="reply-indicator">
                        <button
                          className="view-replies-btn"
                          onClick={() => toggleReplies(comment._id)}
                        >
                          {expandedReplies[comment._id]
                            ? "Hide Replies"
                            : `View ${comment.replies.length} Replies`}
                        </button>

                        {expandedReplies[comment._id] && (
                          <div className="replies-list">
                            {comment.replies.map((reply) => (
                              <div key={reply._id} className="reply-item">
                                <div
                                  className="comment-avatar"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (reply.author?._id) {
                                      navigate(
                                        `/dashboard/user/${reply.author._id}`,
                                      );
                                    }
                                  }}
                                >
                                  {reply.author?.profilePicture ? (
                                    <img
                                      src={reply.author.profilePicture}
                                      alt={reply.author?.name}
                                    />
                                  ) : (
                                    <div className="avatar-placeholder-sm">
                                      {(reply.author?.name || "U")
                                        .charAt(0)
                                        .toUpperCase()}
                                    </div>
                                  )}
                                </div>

                                <div className="comment-content">
                                  <div className="comment-header">
                                    <div className="comment-author">
                                      <span
                                        className="author-name"
                                        onClick={() =>
                                          reply.author?._id &&
                                          navigate(
                                            `/dashboard/user/${reply.author._id}`,
                                          )
                                        }
                                      >
                                        {reply.author?.name}
                                      </span>
                                      <span className="comment-time">
                                        {formatDate(reply.createdAt)}
                                      </span>
                                    </div>
                                  </div>

                                  <p className="comment-text">
                                    {reply.replyToUser && (
                                      <span className="reply-tag">
                                        @{reply.replyToUser.name}
                                      </span>
                                    )}
                                    {reply.content}
                                  </p>

                                  <div className="comment-footer">
                                    <div className="comment-likes">
                                      {reply.reactionsCount > 0 && (
                                        <span>
                                          {reply.reactionsCount}{" "}
                                          {reply.reactionsCount === 1
                                            ? "like"
                                            : "likes"}
                                        </span>
                                      )}
                                    </div>

                                    <div className="comment-actions">
                                      <button
                                        className="reply-btn"
                                        onClick={() =>
                                          handleReply(reply, comment._id)
                                        }
                                      >
                                        <svg
                                          width="14"
                                          height="14"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                        >
                                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                          <polyline points="7 10 12 15 17 10"></polyline>
                                          <line
                                            x1="12"
                                            y1="15"
                                            x2="12"
                                            y2="3"
                                          ></line>
                                        </svg>
                                        Reply
                                      </button>

                                      <button
                                        className={`like-btn ${likedComments[reply._id] ? "liked" : ""}`}
                                        onClick={() =>
                                          handleLikeComment(reply._id)
                                        }
                                      >
                                        {likedComments[reply._id]
                                          ? "Liked"
                                          : "Like"}
                                      </button>

                                      {reply.author?._id === user?._id && (
                                        <button
                                          className="delete-btn"
                                          onClick={() =>
                                            handleDelete(reply._id)
                                          }
                                          title="Delete reply"
                                        >
                                          <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                          >
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            <line
                                              x1="10"
                                              y1="11"
                                              x2="10"
                                              y2="17"
                                            ></line>
                                            <line
                                              x1="14"
                                              y1="11"
                                              x2="14"
                                              y2="17"
                                            ></line>
                                          </svg>
                                          Delete
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading more indicator */}
            {loadingMore && (
              <div className="loading-more-comments">
                <div className="loading-spinner-small"></div>
                <p>Loading more comments...</p>
              </div>
            )}

            {/* End of comments */}
            {!hasMoreComments && comments.length > 0 && (
              <div className="end-of-comments">
                <div className="end-line"></div>
                <p>You have seen all {totalComments} comments</p>
                <div className="end-line"></div>
              </div>
            )}
          </>
        )}
        <div ref={commentsEndRef} />
      </div>

      <style jsx>{`
        .comment-section {
          width: 100%;
          margin-top: 12px;
        }

        /* Comment Input */
        .comment-input-wrapper {
          background: var(--cc-surface-soft);
          border: 1px solid var(--cc-border);
          border-radius: var(--cc-radius);
          padding: 12px;
          margin-bottom: 16px;
          transition: all 0.2s ease;
        }

        .comment-input-wrapper:focus-within {
          background: var(--cc-surface);
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
        }

        .replying-badge {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--cc-primary-soft);
          padding: 8px 12px;
          border-radius: var(--cc-radius);
          margin-bottom: 12px;
          font-size: 12px;
          color: var(--cc-primary);
        }

        .replying-badge span {
          font-weight: 500;
        }

        .cancel-reply {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .cancel-reply:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .input-container {
          display: flex;
          gap: 12px;
        }

        .input-avatar {
          flex-shrink: 0;
        }

        .avatar-placeholder-sm {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--cc-primary-soft), var(--cc-accent-soft));
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--cc-primary);
          font-weight: 600;
          font-size: 14px;
        }

        .input-field-wrapper {
          flex: 1;
          position: relative;
        }

          .comment-input {
            width: 100%;
            padding: 10px 80px 10px 12px;
          border: 1px solid var(--cc-border);
          border-radius: var(--cc-radius);
          font-size: 14px;
          font-family: inherit;
          resize: none;
          transition: all 0.2s ease;
          background: var(--cc-surface);
        }

        .comment-input:focus {
          outline: none;
          border-color: var(--cc-primary);
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
        }

        .post-comment-btn {
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: linear-gradient(135deg, var(--cc-primary), var(--cc-accent));
          border: none;
          border-radius: var(--cc-radius);
          font-size: 13px;
          font-weight: 600;
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .post-comment-btn:hover:not(:disabled) {
          transform: translateY(-50%) scale(1.02);
          box-shadow: 0 2px 8px rgba(15, 118, 110, 0.24);
        }

        .post-comment-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Comments Header */
        .comments-header {
          margin-bottom: 16px;
        }

        .comments-count {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .comments-count svg {
          color: var(--cc-primary);
        }

        .loaded-info {
          font-size: 12px;
          font-weight: normal;
          color: #6b7280;
        }

        /* Comments List */
        .comments-list {
          max-height: min(520px, 68vh);
          overflow-y: auto;
          padding-right: 8px;
        }

        .comments-list::-webkit-scrollbar {
          width: 4px;
        }

        .comments-list::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 10px;
        }

        .comments-list::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }

        /* Comment Item */
        .comment-item {
          display: flex;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid var(--cc-border);
          animation: fadeIn 0.3s ease forwards;
          opacity: 0;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .comment-item.temp-comment {
          opacity: 0.7;
          background: var(--cc-warning-soft);
          border-radius: var(--cc-radius);
          padding: 12px;
          margin-bottom: 8px;
        }

        .comment-avatar {
          flex-shrink: 0;
          cursor: pointer;
        }

          .comment-avatar img {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
        }

        .comment-content {
          flex: 1;
        }

        .comment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .comment-author {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .comment-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 8px;
        }

        .comment-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .author-name {
          font-weight: 600;
          font-size: 14px;
          color: #111827;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .author-name:hover {
          color: var(--cc-primary);
        }

          .author-badge {
          padding: 2px 7px;
          border-radius: 999px;
          background: var(--cc-surface-soft);
          color: var(--cc-muted-strong);
          font-size: 11px;
          font-weight: 750;
        }

        .comment-time {
          font-size: 11px;
          color: #9ca3af;
        }

        .reply-btn,
        .like-btn,
        .delete-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          font-size: 12px;
          font-weight: 650;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: var(--cc-radius);
          transition: all 0.2s ease;
        }

        .reply-btn {
          color: #6b7280;
        }

        .reply-btn:hover {
          background: var(--cc-surface-soft);
          color: var(--cc-primary-dark);
        }

        .like-btn {
          color: #6b7280;
        }

        .like-btn:hover {
          background: var(--cc-surface-soft);
          color: #ef4444;
        }

        .like-btn.liked {
          color: #ef4444;
        }

        .delete-btn {
          color: #ef4444;
        }

        .delete-btn:hover {
          background: #fee2e2;
        }

        .comment-text {
          font-size: 14px;
          color: #374151;
          line-height: 1.5;
          margin: 0;
          word-break: break-word;
        }

        .comment-likes {
          font-size: 12px;
          color: #6b7280;
        }

        .reply-tag {
          color: var(--cc-primary-dark);
          font-weight: 600;
          margin-right: 6px;
        }

        .reply-indicator {
          margin-top: 8px;
        }

        .view-replies-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          font-size: 12px;
          font-weight: 500;
          color: var(--cc-primary);
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .view-replies-btn:hover {
          background: var(--cc-primary-soft);
        }

        .replies-list {
          margin-top: 12px;
          padding-left: 16px;
          border-left: 2px solid var(--cc-border);
        }

        .reply-item {
          display: flex;
          gap: 10px;
          padding: 10px 0;
          border-top: 1px solid var(--cc-border);
        }

        .reply-item:first-child {
          border-top: none;
        }

        /* Loading States */
        .loading-comments {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .comment-skeleton {
          display: flex;
          gap: 12px;
          padding: 12px 0;
        }

        .skeleton-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(
            90deg,
            #f3f4f6 25%,
            #e5e7eb 50%,
            #f3f4f6 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        .skeleton-content {
          flex: 1;
        }

        .skeleton-line {
          height: 12px;
          background: linear-gradient(
            90deg,
            #f3f4f6 25%,
            #e5e7eb 50%,
            #f3f4f6 75%
          );
          background-size: 200% 100%;
          border-radius: 6px;
          margin-bottom: 8px;
          animation: shimmer 1.5s infinite;
        }

        .skeleton-line.short {
          width: 60%;
        }

        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        .loading-more-comments {
          text-align: center;
          padding: 20px;
        }

        .loading-spinner-small {
          width: 24px;
          height: 24px;
          border: 2px solid #f3f4f6;
          border-top-color: var(--cc-primary);
          border-radius: 50%;
          margin: 0 auto 8px;
          animation: spin 0.6s linear infinite;
        }

        .loading-more-comments p {
          font-size: 12px;
          color: #6b7280;
          margin: 0;
        }

        .end-of-comments {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 18px 0 4px;
        }

        .end-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, #cbd5e1, transparent);
        }

        .end-of-comments p {
          font-size: 12px;
          color: #6b7280;
          margin: 0;
          white-space: nowrap;
        }

        /* No Comments State */
        .no-comments {
          text-align: center;
          padding: 32px 18px;
          background: var(--cc-surface-soft);
          border: 1px dashed var(--cc-border-strong);
          border-radius: var(--cc-radius);
        }

        .no-comments-icon {
          width: 60px;
          height: 60px;
          margin: 0 auto 16px;
          background: var(--cc-surface);
          border-radius: var(--cc-radius);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .no-comments-icon svg {
          color: #9ca3af;
        }

        .no-comments h4 {
          margin: 0 0 4px;
          color: #374151;
          font-size: 16px;
        }

        .no-comments p {
          margin: 0;
          color: #6b7280;
          font-size: 13px;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .comment-input-wrapper {
            padding: 12px;
          }

          .input-container {
            gap: 8px;
          }

          .comment-input {
            padding: 8px 70px 8px 10px;
            font-size: 13px;
          }

          .post-comment-btn {
            padding: 4px 10px;
            font-size: 12px;
          }

          .comment-footer {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .comment-actions {
            width: 100%;
            justify-content: flex-start;
          }
        }

        /* Touch Device Optimization */
        @media (hover: none) and (pointer: coarse) {
          .reply-btn:active,
          .like-btn:active,
          .delete-btn:active {
            background: #f3f4f6;
          }

          .author-name:active {
            color: var(--cc-primary);
          }
        }

        /* Reduced Motion Preference */
        @media (prefers-reduced-motion: reduce) {
          .comment-item,
          .btn-spinner,
          .loading-spinner-small {
            animation: none;
          }

          .comment-skeleton .skeleton-line,
          .comment-skeleton .skeleton-avatar {
            animation: none;
            background: #e5e7eb;
          }
        }
      `}</style>
    </div>
  );
};

export default CommentSection;
