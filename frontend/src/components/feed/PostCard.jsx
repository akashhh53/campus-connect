import { useState, useCallback, memo, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  FiBookOpen,
  FiBookmark,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiGrid,
  FiHeart,
  FiMessageCircle,
  FiMoreVertical,
  FiTrash2,
} from "react-icons/fi";
import { reactToPost, removeReaction } from "../../services/reactionService";
import CommentSection from "./CommentSection";
import { savePost, unsavePost, deletePost } from "../../services/feedService";

const PostCard = memo(
  ({
    post,
    onUnsave,
    forceShowComments = false,
    targetComment,
  }) => {
    const navigate = useNavigate();
    const [liked, setLiked] = useState(!!post.userReaction);
    const [showComments, setShowComments] = useState(forceShowComments);
    const [likesCount, setLikesCount] = useState(post.reactionsCount || 0);
    const [commentsCount, setCommentsCount] = useState(post.commentCount || 0);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showFullText, setShowFullText] = useState(false);
    const [saved, setSaved] = useState(post.isSaved || false);
    const [saving, setSaving] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [deleting, setDeleting] = useState(false);
    
    const pendingLikeRef = useRef(null);
    const imageRef = useRef(null);
    const menuRef = useRef(null);

    const localUser = JSON.parse(localStorage.getItem("userInfo") || "null");
    const isOwner = localUser?.user?._id === post.author?._id;
    
    const MAX_TEXT_LENGTH = 120;

    // Close menu when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
          setShowMenu(false);
        }
      };

      if (showMenu) {
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
      }
    }, [showMenu]);

    // Cleanup pending like on unmount
    useEffect(() => {
      return () => {
        if (pendingLikeRef.current) {
          clearTimeout(pendingLikeRef.current);
        }
      };
    }, []);

    const handleCommentUpdate = useCallback((changeCount) => {
      setCommentsCount((prev) => Math.max(0, prev + changeCount));
    }, []);

    const handleLike = useCallback(async () => {
      const previousLiked = liked;
      const previousCount = likesCount;
      const newLikedState = !liked;
      const likeDelta = newLikedState ? 1 : -1;

      setLiked(newLikedState);
      setLikesCount((prev) => Math.max(0, prev + likeDelta));

      // Visual feedback
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

    const handleSave = useCallback(async () => {
      if (saving) return;
      try {
        setSaving(true);
        if (saved) {
          await unsavePost(post._id);
          setSaved(false);
          onUnsave?.(post._id);
        } else {
          await savePost(post._id);
          setSaved(true);
        }
      } catch (error) {
        console.error("Save operation failed:", error);
      } finally {
        setSaving(false);
      }
    }, [saved, saving, post._id, onUnsave]);

    const handleDelete = useCallback(async () => {
      if (deleting) return;
      
      const confirmed = window.confirm("Are you sure you want to delete this post? This action cannot be undone.");
      if (!confirmed) return;

      try {
        setDeleting(true);
        await deletePost(post._id);
        window.location.reload();
      } catch (error) {
        console.error("Delete failed:", error);
        alert("Failed to delete post. Please try again.");
      } finally {
        setDeleting(false);
        setShowMenu(false);
      }
    }, [deleting, post._id]);

    const nextImage = useCallback((e) => {
      e.stopPropagation();
      if (post.attachments?.length) {
        setCurrentImageIndex((prev) => (prev + 1) % post.attachments.length);
      }
    }, [post.attachments?.length]);

    const prevImage = useCallback((e) => {
      e.stopPropagation();
      if (post.attachments?.length) {
        setCurrentImageIndex((prev) => (prev - 1 + post.attachments.length) % post.attachments.length);
      }
    }, [post.attachments?.length]);

    const handleUserNavigate = useCallback((userId, e) => {
      e?.stopPropagation();
      if (userId) {
        navigate(`/dashboard/user/${userId}`);
      }
    }, [navigate]);

    const formattedDate = useCallback((date) => {
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
    }, []);

    const formatCount = useCallback((count) => {
      if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
      if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
      return count.toString();
    }, []);

    const getModuleColor = useCallback((module) => {
      switch (module) {
        case "events":
          return {
            bg: "var(--cc-warning-soft)",
            color: "var(--cc-warning)",
            icon: FiCalendar,
          };
        case "academicHub":
          return {
            bg: "var(--cc-accent-soft)",
            color: "var(--cc-accent)",
            icon: FiBookOpen,
          };
        default:
          return {
            bg: "var(--cc-accent-soft)",
            color: "var(--cc-accent)",
            icon: FiGrid,
          };
      }
    }, []);

    const shouldTruncate = post.content?.length > MAX_TEXT_LENGTH;
    const displayText = showFullText || !shouldTruncate
      ? post.content
      : `${post.content?.substring(0, MAX_TEXT_LENGTH)}...`;
    const hasMultipleImages = post.attachments?.length > 1;
    const currentImage = post.attachments?.[currentImageIndex];
    const moduleStyle = getModuleColor(post.module);
    const ModuleIcon = moduleStyle.icon;

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
                  loading="lazy"
                />
              ) : (
                <div className="author-avatar-fallback">
                  {(post.author?.name || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="avatar-status" />
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
                  style={{
                    background: moduleStyle.bg,
                    color: moduleStyle.color,
                  }}
                >
                  <ModuleIcon className="module-icon" />
                  {post.module === "feed"
                    ? "Feed"
                    : post.module === "events"
                    ? "Events"
                    : "Academic Hub"}
                </span>
              </div>
            </div>
          </div>

          <div className="menu-container" ref={menuRef}>
            <button
              className="menu-btn"
              aria-label="More options"
              onClick={() => setShowMenu((prev) => !prev)}
            >
              <FiMoreVertical />
            </button>

            {showMenu && isOwner && (
              <div className="menu-dropdown">
                <button
                  className="menu-item delete-item"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <FiClock />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <FiTrash2 />
                      Delete Post
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
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
                    <FiChevronLeft />
                  </button>

                  <button
                    onClick={nextImage}
                    className="nav-btn next-btn"
                    aria-label="Next"
                  >
                    <FiChevronRight />
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
                        aria-label={`Go to image ${idx + 1}`}
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
              <span className="heart-icon" aria-label="Likes">
                <FiHeart />
              </span>
            </div>
            <span className="likes-count">{formatCount(likesCount)}</span>
            <span className="likes-text">{likesCount === 1 ? "like" : "likes"}</span>
          </div>
          <button
            className="comments-stats"
            onClick={() => setShowComments(!showComments)}
            aria-label={`${commentsCount} comments`}
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
            aria-label={liked ? "Unlike" : "Like"}
          >
            <span className="action-icon">
              <FiHeart />
            </span>
            <span className="action-text">{liked ? "Liked" : "Like"}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className={`action-btn comment-action ${showComments ? "active" : ""}`}
            aria-label="Comments"
          >
            <span className="action-icon">
              <FiMessageCircle />
            </span>
            <span className="action-text">Comment</span>
          </button>

          <button
            onClick={handleSave}
            className={`action-btn ${saved ? "active" : ""}`}
            aria-label={saved ? "Unsave" : "Save"}
            disabled={saving}
          >
            <span className="action-icon">
              {saving ? <FiClock /> : <FiBookmark />}
            </span>
            <span className="action-text">{saved ? "Saved" : "Save"}</span>
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="comments-wrapper">
            <CommentSection
              postId={post._id}
              onCommentAdded={handleCommentUpdate}
              targetComment={targetComment}
            />
          </div>
        )}

        <style jsx>{`
          .post-card {
            --post-card-radius: 22px;
            background: var(--cc-surface-raised);
            border: 1px solid var(--cc-border);
            border-radius: var(--post-card-radius);
            margin-bottom: 0;
            box-shadow: var(--cc-shadow-soft);
            backdrop-filter: blur(12px);
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
          }

          .post-card:hover {
            border-color: var(--cc-border-strong);
            box-shadow: var(--cc-shadow);
            transform: translateY(-1px);
          }

          /* Header */
          .post-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 22px 24px 15px;
          }

          .author-section {
            display: flex;
            gap: 14px;
            flex: 1;
            min-width: 0;
          }

          .author-avatar-wrapper {
            position: relative;
            cursor: pointer;
            flex-shrink: 0;
          }

          .author-avatar {
            width: 46px;
            height: 46px;
            border: 1px solid var(--cc-border);
            border-radius: 50%;
            object-fit: cover;
            transition: transform 0.2s ease;
          }

          .author-avatar-wrapper:hover .author-avatar {
            transform: scale(1.05);
          }

          .author-avatar-fallback {
            width: 46px;
            height: 46px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--cc-primary), var(--cc-accent));
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 17px;
            font-weight: 750;
            transition: transform 0.2s ease;
          }

          .author-avatar-wrapper:hover .author-avatar-fallback {
            transform: scale(1.05);
          }

          .avatar-status {
            display: none;
          }

          .author-details {
            flex: 1;
            min-width: 0;
          }

          .name-row {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 6px;
          }

          .author-name {
            font-weight: 850;
            font-size: 15px;
            color: var(--cc-text);
            cursor: pointer;
            transition: color 0.2s;
            line-height: 1.25;
          }

          .author-name:hover {
            color: var(--cc-primary);
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
            padding: 2px 8px;
            border: 1px solid var(--cc-border);
            border-radius: 999px;
            background: var(--cc-surface-soft);
            font-size: 11.5px;
            font-weight: 700;
            color: var(--cc-muted);
          }

          .meta-row {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .module-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 5px 10px;
            border: 1px solid var(--cc-border);
            border-radius: 999px;
            background: var(--cc-surface-soft);
            font-size: 11.5px;
            font-weight: 750;
          }

          .module-icon {
            width: 12px;
            height: 12px;
          }

          /* Menu Styles */
          .menu-container {
            position: relative;
          }

          .menu-btn {
            width: 38px;
            height: 38px;
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 8px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            color: var(--cc-muted);
          }

          .menu-btn svg {
            width: 20px;
            height: 20px;
          }

          .menu-btn:hover {
            background: var(--cc-surface-soft);
            color: var(--cc-text);
          }

          .menu-dropdown {
            position: absolute;
            top: 110%;
            right: 0;
            background: var(--cc-surface-raised);
            border: 1px solid var(--cc-border);
            border-radius: var(--cc-radius);
            box-shadow: var(--cc-shadow);
            overflow: hidden;
            z-index: 1000;
            min-width: 160px;
            animation: fadeIn 0.2s ease;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .menu-item {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            padding: 12px 16px;
            border: none;
            background: transparent;
            cursor: pointer;
            transition: background 0.2s;
            font-size: 14px;
            font-weight: 750;
            color: var(--cc-text);
          }

          .menu-item svg {
            width: 18px;
            height: 18px;
          }

          .menu-item:hover {
            background: var(--cc-surface-soft);
          }

          .delete-item {
            color: var(--cc-danger);
          }

          .delete-item:hover {
            background: var(--cc-danger-soft);
          }

          .menu-item:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          /* Content */
          .post-content-wrapper {
            padding: 0 24px 4px;
          }

          .post-title {
            font-size: 20px;
            font-weight: 850;
            color: var(--cc-text);
            margin: 0 0 10px 0;
            line-height: 1.32;
          }

          .post-body {
            margin-bottom: 16px;
          }

          .post-text {
            font-size: 15px;
            line-height: 1.72;
            color: var(--cc-text);
            margin: 0;
            white-space: pre-wrap;
            word-break: break-word;
          }

          .read-more {
            display: inline-flex;
            align-items: center;
            margin-top: 9px;
            background: var(--cc-primary-soft);
            border: 1px solid color-mix(in srgb, var(--cc-primary) 22%, transparent);
            border-radius: 999px;
            color: var(--cc-primary);
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
            padding: 6px 11px;
            transition: background 0.2s, color 0.2s, transform 0.2s;
          }

          .read-more:hover {
            color: var(--cc-primary-dark);
            transform: translateY(-1px);
          }

          /* Media */
          .media-container {
            margin: 8px 24px 16px;
            position: relative;
          }

          .media-wrapper {
            position: relative;
            overflow: hidden;
            border: 1px solid var(--cc-border);
            border-radius: 18px;
            background: var(--cc-surface-soft);
            min-height: 260px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .media-image {
            width: 100%;
            max-height: 480px;
            object-fit: contain;
            background: var(--cc-surface-soft);
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
            margin: 0 24px 12px;
            padding: 10px 12px;
            border-top: 1px solid var(--cc-border);
            border-bottom: 1px solid var(--cc-border);
            border-left: 1px solid var(--cc-border);
            border-right: 1px solid var(--cc-border);
            border-radius: 16px;
            background: var(--cc-surface-soft);
          }

          .likes-info {
            display: flex;
            align-items: center;
            gap: 7px;
          }

          .likes-icon-group {
            display: flex;
            align-items: center;
          }

          .heart-icon {
            width: 18px;
            height: 18px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: var(--cc-danger);
          }

          .heart-icon svg {
            width: 16px;
            height: 16px;
            fill: var(--cc-danger-soft);
          }

          .likes-count {
            font-weight: 800;
            font-size: 14px;
            color: var(--cc-text);
          }

          .likes-text {
            font-size: 13px;
            color: var(--cc-muted);
          }

          .comments-stats {
            background: none;
            border: none;
            display: flex;
            gap: 5px;
            font-size: 13px;
            font-weight: 750;
            color: var(--cc-muted);
            cursor: pointer;
            transition: color 0.2s;
          }

          .comments-stats:hover {
            color: var(--cc-primary);
          }

          /* Action Bar */
          .action-bar {
            display: flex;
            padding: 0 24px 20px;
            gap: 8px;
            background: transparent;
          }

          .action-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            min-height: 42px;
            padding: 9px 10px;
            background: var(--cc-surface-soft);
            border: 1px solid var(--cc-border);
            border-radius: 14px;
            font-size: 14px;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s;
            color: var(--cc-muted-strong);
            position: relative;
          }

          .action-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
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

          .like-action:hover:not(:disabled) {
            background: var(--cc-danger-soft);
            color: var(--cc-danger);
            border-color: color-mix(in srgb, var(--cc-danger) 24%, var(--cc-border));
          }

          .like-action:hover:not(:disabled) .action-icon {
            transform: scale(1.1);
          }

          .like-action.active {
            color: var(--cc-danger);
          }

          .like-action.active .action-icon svg {
            fill: var(--cc-danger);
            stroke: var(--cc-danger);
          }

          .like-action:active:not(:disabled) .action-icon {
            transform: scale(0.95);
          }

          .comment-action:hover:not(:disabled) {
            background: var(--cc-primary-soft);
            color: var(--cc-primary-dark);
            border-color: color-mix(in srgb, var(--cc-primary) 24%, var(--cc-border));
          }

          .comment-action.active {
            background: var(--cc-primary-soft);
            color: var(--cc-primary-dark);
            border-color: color-mix(in srgb, var(--cc-primary) 24%, var(--cc-border));
          }

          .action-btn.active:not(.like-action):not(.comment-action) {
            background: var(--cc-accent-soft);
            color: var(--cc-accent);
            border-color: color-mix(in srgb, var(--cc-accent) 24%, var(--cc-border));
          }

          .action-btn:active:not(:disabled) {
            transform: scale(0.97);
          }

          /* Comments */
          .comments-wrapper {
            padding: 0 24px 22px;
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
              padding: 16px 16px 12px;
            }

            .author-avatar,
            .author-avatar-fallback {
              width: 42px;
              height: 42px;
              font-size: 16px;
            }

            .post-content-wrapper {
              padding: 0 16px 2px;
            }

            .post-title {
              font-size: 17px;
            }

            .post-text {
              font-size: 14px;
              line-height: 1.65;
            }

            .media-container {
              margin: 8px 16px 14px;
            }

            .engagement-stats {
              margin: 0 16px 10px;
              padding: 9px 10px;
            }

            .action-bar {
              padding: 0 16px 16px;
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
            .action-btn:active:not(:disabled) {
              transform: scale(0.96);
            }
          }

          /* Reduced Motion */
          @media (prefers-reduced-motion: reduce) {
            .post-card,
            .action-btn,
            .nav-btn,
            .comments-wrapper,
            .action-icon,
            .menu-dropdown {
              transition: none;
              animation: none;
            }
          }
        `}</style>
      </div>
    );
  }
);

PostCard.displayName = "PostCard";

export default PostCard;
