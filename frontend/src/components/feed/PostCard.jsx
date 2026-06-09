import { useState, useCallback, memo, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { reactToPost, removeReaction } from "../../services/reactionService";
import CommentSection from "./CommentSection";
import { savePost, unsavePost } from "../../services/feedService";

const PostCard = memo(({ post, onImageClick, onUnsave }) => {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(!!post.userReaction);
  const [showComments, setShowComments] = useState(false);
  const [likesCount, setLikesCount] = useState(post.reactionsCount || 0);
  const [commentsCount, setCommentsCount] = useState(post.commentCount || 0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullText, setShowFullText] = useState(false);
  const [saved, setSaved] = useState(post.isSaved || false);
  const [saving, setSaving] = useState(false);
  const pendingLikeRef = useRef(null);
  const imageRef = useRef(null);

  const MAX_TEXT_LENGTH = 120;

  // 🔥 IMPROVED: Handle comment updates (add or delete)
  const handleCommentUpdate = useCallback((changeCount) => {
    setCommentsCount((prev) => {
      const newCount = prev + changeCount;
      console.log(`Comment count: ${prev} -> ${newCount} (change: ${changeCount})`);
      return Math.max(0, newCount);
    });
  }, []);

  const handleLike = useCallback(async () => {
    const previousLiked = liked;
    const previousCount = likesCount;
    const newLikedState = !liked;
    const likeDelta = newLikedState ? 1 : -1;

    setLiked(newLikedState);
    setLikesCount((prev) => Math.max(0, prev + likeDelta));

    const heartIcon = document.querySelector(`.like-action .action-icon`);
    if (heartIcon) {
      heartIcon.style.transform = "scale(1.3)";
      setTimeout(() => {
        if (heartIcon) heartIcon.style.transform = "";
      }, 100);
    }

    if (pendingLikeRef.current) {
      clearTimeout(pendingLikeRef.current);
    }

    pendingLikeRef.current = setTimeout(async () => {
      try {
        if (newLikedState) {
          await reactToPost(post._id, "like");
        } else {
          await removeReaction(post._id);
        }
      } catch (error) {
        console.error("Like sync failed:", error);
        if (liked !== previousLiked) {
          setLiked(previousLiked);
          setLikesCount(previousCount);
        }
      }
    }, 300);
  }, [liked, likesCount, post._id]);

  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
      if (saved) {
        await unsavePost(post._id);
        setSaved(false);
        if (onUnsave) {
          onUnsave(post._id);
        }
      } else {
        await savePost(post._id);
        setSaved(true);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pendingLikeRef.current) {
        clearTimeout(pendingLikeRef.current);
      }
    };
  }, []);

  const nextImage = (e) => {
    e.stopPropagation();
    if (post.attachments?.length) {
      setCurrentImageIndex((prev) => (prev + 1) % post.attachments.length);
    }
  };

  const prevImage = (e) => {
    e.stopPropagation();
    if (post.attachments?.length) {
      setCurrentImageIndex(
        (prev) =>
          (prev - 1 + post.attachments.length) % post.attachments.length,
      );
    }
  };

  const formattedDate = (date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffMs = now - postDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return postDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const getModuleColor = (module) => {
    switch (module) {
      case "events":
        return { bg: "#fef3c7", color: "#d97706", icon: "🎉" };
      case "academicHub":
        return { bg: "#e0e7ff", color: "#4f46e5", icon: "📚" };
      default:
        return { bg: "#dbeafe", color: "#2563eb", icon: "📱" };
    }
  };

  const shouldTruncate = post.content?.length > MAX_TEXT_LENGTH;
  const displayText =
    showFullText || !shouldTruncate
      ? post.content
      : `${post.content?.substring(0, MAX_TEXT_LENGTH)}...`;
  const hasMultipleImages = post.attachments?.length > 1;
  const currentImage = post.attachments?.[currentImageIndex];
  const moduleStyle = getModuleColor(post.module);

  // 🔥 User navigation handler
  const handleUserNavigate = (userId, e) => {
    e?.stopPropagation();
    if (userId) {
      navigate(`/dashboard/user/${userId}`);
    }
  };

  return (
    <div className="post-card">
      {/* Header Section */}
      <div className="post-header">
        <div className="author-section">
          <div
            className="author-avatar-wrapper"
            onClick={(e) => handleUserNavigate(post.author?._id, e)}
          >
            {post.author?.profilePicture ? (
              <img
                src={post.author.profilePicture}
                alt={post.author?.name || "User"}
                className="author-avatar"
                draggable="false"
              />
            ) : (
              <div className="author-avatar-fallback">
                {(post.author?.name || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="avatar-status"></div>
          </div>

          <div className="author-details">
            <div className="name-row">
              <span
                className="author-name"
                onClick={(e) => handleUserNavigate(post.author?._id, e)}
              >
                {post.author?.name || "Anonymous User"}
              </span>
              {post.author?.role?.name === "Teacher" && (
                <span className="verified-icon" title="Verified Educator">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                </span>
              )}
              <span className="post-time">{formattedDate(post.createdAt)}</span>
            </div>
            <div className="meta-row">
              <span
                className="module-badge"
                style={{ background: moduleStyle.bg, color: moduleStyle.color }}
              >
                <span className="module-icon">{moduleStyle.icon}</span>
                {post.module === "feed"
                  ? "Feed"
                  : post.module === "events"
                    ? "Events"
                    : "Academic Hub"}
              </span>
            </div>
          </div>
        </div>

        <button className="menu-btn" aria-label="More options">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="6" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="18" r="2" />
          </svg>
        </button>
      </div>

      {/* Content Section */}
      <div className="post-content-wrapper">
        {post.title && <h3 className="post-title">{post.title}</h3>}

        {post.content && (
          <div className="post-body">
            <p className="post-text">{displayText}</p>
            {shouldTruncate && (
              <button
                onClick={() => setShowFullText(!showFullText)}
                className="read-more"
              >
                {showFullText ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Media Section */}
      {post.attachments?.length > 0 && (
        <div className="media-container">
          <div className="media-wrapper">
            <img
              ref={imageRef}
              src={currentImage}
              alt={`Media ${currentImageIndex + 1}`}
              className="media-image"
              draggable="false"
              loading="lazy"
            />

            {hasMultipleImages && (
              <>
                <button
                  onClick={prevImage}
                  className="nav-btn prev-btn"
                  aria-label="Previous"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>

                <button
                  onClick={nextImage}
                  className="nav-btn next-btn"
                  aria-label="Next"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>

                <div className="media-counter">
                  <span>{currentImageIndex + 1}</span>
                  <span>/</span>
                  <span>{post.attachments.length}</span>
                </div>

                <div className="image-dots">
                  {post.attachments.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(idx);
                      }}
                      className={`image-dot ${idx === currentImageIndex ? "active" : ""}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Engagement Stats */}
      <div className="engagement-stats">
        <div className="likes-info">
          <div className="likes-icon-group">
            <span className="heart-icon">❤️</span>
          </div>
          <span className="likes-count">{formatCount(likesCount)}</span>
          <span className="likes-text">
            {likesCount === 1 ? "like" : "likes"}
          </span>
        </div>
        <button
          className="comments-stats"
          onClick={() => setShowComments(!showComments)}
        >
          <span>{formatCount(commentsCount)}</span>
          <span>{commentsCount === 1 ? "comment" : "comments"}</span>
        </button>
      </div>

      {/* Action Bar */}
      <div className="action-bar">
        <button
          onClick={handleLike}
          className={`action-btn like-action ${liked ? "active" : ""}`}
        >
          <span className="action-icon">
            {liked ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            )}
          </span>
          <span className="action-text">{liked ? "Liked" : "Like"}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className={`action-btn comment-action ${showComments ? "active" : ""}`}
        >
          <span className="action-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          <span className="action-text">Comment</span>
        </button>

        <button
          onClick={handleSave}
          className={`action-btn ${saved ? "active" : ""}`}
        >
          <span className="action-icon">{saved ? "🔖" : "📑"}</span>
          <span className="action-text">{saved ? "Saved" : "Save"}</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="comments-wrapper">
          <CommentSection
            postId={post._id}
            onCommentAdded={handleCommentUpdate}
          />
        </div>
      )}

      <style jsx>{`
        .post-card {
          background: #ffffff;
          border-radius: 24px;
          margin-bottom: 20px;
          box-shadow:
            0 1px 3px rgba(0, 0, 0, 0.05),
            0 1px 2px rgba(0, 0, 0, 0.1);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }

        .post-card:hover {
          box-shadow:
            0 12px 28px rgba(0, 0, 0, 0.12),
            0 2px 4px rgba(0, 0, 0, 0.05);
          transform: translateY(-2px);
        }

        /* Header */
        .post-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 16px 20px 12px;
        }

        .author-section {
          display: flex;
          gap: 12px;
          flex: 1;
        }

        .author-avatar-wrapper {
          position: relative;
          cursor: pointer;
          flex-shrink: 0;
        }

        .author-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: cover;
          transition: transform 0.2s ease;
        }

        .author-avatar-wrapper:hover .author-avatar {
          transform: scale(1.05);
        }

        .author-avatar-fallback {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 600;
          transition: transform 0.2s ease;
        }

        .author-avatar-wrapper:hover .author-avatar-fallback {
          transform: scale(1.05);
        }

        .avatar-status {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 12px;
          height: 12px;
          background: #22c55e;
          border: 2px solid white;
          border-radius: 50%;
        }

        .author-details {
          flex: 1;
        }

        .name-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 4px;
        }

        .author-name {
          font-weight: 700;
          font-size: 15px;
          color: #1f2937;
          cursor: pointer;
          transition: color 0.2s;
        }

        .author-name:hover {
          color: #667eea;
          text-decoration: underline;
        }

        .verified-icon {
          display: inline-flex;
          align-items: center;
          color: #3b82f6;
          width: 16px;
          height: 16px;
        }

        .verified-icon svg {
          width: 100%;
          height: 100%;
        }

        .post-time {
          font-size: 13px;
          color: #6b7280;
        }

        .meta-row {
          display: flex;
          align-items: center;
        }

        .module-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border-radius: 30px;
          font-size: 11px;
          font-weight: 600;
        }

        .module-icon {
          font-size: 11px;
        }

        .menu-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          color: #6b7280;
        }

        .menu-btn svg {
          width: 20px;
          height: 20px;
        }

        .menu-btn:hover {
          background: #f3f4f6;
        }

        /* Content */
        .post-content-wrapper {
          padding: 0 20px;
        }

        .post-title {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 10px 0;
          line-height: 1.4;
        }

        .post-body {
          margin-bottom: 16px;
        }

        .post-text {
          font-size: 15px;
          line-height: 1.6;
          color: #374151;
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .read-more {
          background: none;
          border: none;
          color: #667eea;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          padding: 6px 0 0;
          transition: color 0.2s;
        }

        .read-more:hover {
          color: #4f46e5;
        }

        /* Media */
        .media-container {
          margin: 0 0 12px;
          position: relative;
        }

        .media-wrapper {
          position: relative;
          background: #f9fafb;
          min-height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .media-image {
          width: 100%;
          max-height: 550px;
          object-fit: contain;
          background: #f9fafb;
          pointer-events: none;
          user-select: none;
        }

        .nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 44px;
          height: 44px;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(12px);
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          z-index: 10;
        }

        .nav-btn svg {
          width: 24px;
          height: 24px;
          color: white;
        }

        .nav-btn:hover {
          background: rgba(0, 0, 0, 0.7);
          transform: translateY(-50%) scale(1.1);
        }

        .prev-btn {
          left: 16px;
        }

        .next-btn {
          right: 16px;
        }

        .media-counter {
          position: absolute;
          bottom: 16px;
          right: 16px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          padding: 5px 12px;
          border-radius: 20px;
          color: white;
          font-size: 13px;
          font-weight: 500;
          font-family: monospace;
          z-index: 10;
        }

        .image-dots {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 10px;
          z-index: 10;
        }

        .image-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          padding: 0;
        }

        .image-dot.active {
          width: 24px;
          border-radius: 4px;
          background: white;
        }

        .image-dot:hover {
          background: white;
        }

        /* Engagement Stats */
        .engagement-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 20px;
          border-top: 1px solid #eff3f4;
          border-bottom: 1px solid #eff3f4;
        }

        .likes-info {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .likes-icon-group {
          display: flex;
          align-items: center;
        }

        .heart-icon {
          font-size: 18px;
        }

        .likes-count {
          font-weight: 600;
          font-size: 14px;
          color: #1f2937;
        }

        .likes-text {
          font-size: 14px;
          color: #6b7280;
        }

        .comments-stats {
          background: none;
          border: none;
          display: flex;
          gap: 4px;
          font-size: 14px;
          color: #6b7280;
          cursor: pointer;
          transition: color 0.2s;
        }

        .comments-stats:hover {
          color: #667eea;
        }

        /* Action Bar */
        .action-bar {
          display: flex;
          padding: 6px 16px;
          gap: 8px;
        }

        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 10px;
          background: transparent;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          color: #4b5563;
          position: relative;
        }

        .action-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1);
          pointer-events: none;
        }

        .action-icon svg {
          width: 100%;
          height: 100%;
          transition: all 0.1s ease;
          pointer-events: none;
        }

        .like-action {
          transition: all 0.1s ease;
        }

        .like-action:hover {
          background: #fef2f6;
          color: #e0245e;
        }

        .like-action:hover .action-icon {
          transform: scale(1.1);
        }

        .like-action.active {
          color: #e0245e;
        }

        .like-action.active .action-icon svg {
          fill: #e0245e;
          stroke: #e0245e;
        }

        .like-action:active .action-icon {
          transform: scale(0.95);
        }

        .comment-action:hover {
          background: #eef2ff;
          color: #4f46e5;
        }

        .comment-action.active {
          background: #eef2ff;
          color: #4f46e5;
        }

        .action-btn:active {
          transform: scale(0.97);
        }

        /* Comments */
        .comments-wrapper {
          padding: 0 20px 20px;
          animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .post-header {
            padding: 14px 16px 10px;
          }

          .author-avatar,
          .author-avatar-fallback {
            width: 40px;
            height: 40px;
            font-size: 16px;
          }

          .post-content-wrapper {
            padding: 0 16px;
          }

          .post-title {
            font-size: 16px;
          }

          .post-text {
            font-size: 14px;
          }

          .engagement-stats {
            padding: 8px 16px;
          }

          .action-bar {
            padding: 4px 12px;
          }

          .action-btn {
            padding: 8px;
            font-size: 14px;
          }

          .nav-btn {
            width: 36px;
            height: 36px;
          }

          .nav-btn svg {
            width: 20px;
            height: 20px;
          }

          .comments-wrapper {
            padding: 0 16px 16px;
          }
        }

        @media (max-width: 480px) {
          .action-text {
            font-size: 13px;
          }

          .action-icon {
            width: 18px;
            height: 18px;
          }

          .media-counter {
            font-size: 11px;
            padding: 4px 10px;
          }
        }

        /* Touch Devices */
        @media (hover: none) and (pointer: coarse) {
          .action-btn:active {
            transform: scale(0.96);
          }
        }

        /* Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .post-card,
          .action-btn,
          .nav-btn,
          .comments-wrapper,
          .action-icon {
            transition: none;
            animation: none;
          }
        }
      `}</style>
    </div>
  );
});

PostCard.displayName = "PostCard";

export default PostCard;