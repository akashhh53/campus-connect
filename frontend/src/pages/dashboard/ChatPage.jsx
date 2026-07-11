import { useState, useEffect, useRef, useCallback } from "react";
import { joinRoom } from "../../socket/socket";
import {
  openChat,
  sendMessage,
  getMessages,
  getMyChats,
  getCachedMessages,
  getCachedMyChats,
  clearChatCache,
  clearChatForMe,
  deleteMessage,
  reactToMessage,
} from "../../services/chatService";
import { searchUsers as searchUsersService } from "../../services/searchService";
import socket from "../../socket/socket";
import { useNavigate } from "react-router";
import {
  FiArrowLeft,
  FiDownload,
  FiMic,
  FiMicOff,
  FiMoreVertical,
  FiShare2,
  FiImage,
  FiPaperclip,
  FiPhone,
  FiPhoneOff,
  FiTrash2,
  FiVideo,
  FiVideoOff,
  FiX,
} from "react-icons/fi";

// Helper function to get initials from name
const getInitials = (name) => {
  if (!name) return "?";
  const names = name.split(" ");
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

// Helper function to get a consistent color from a string
const getColorFromName = (name) => {
  const colors = ["#6f4e37", "#805b43", "#9a6b4d", "#785039", "#a97855"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const MAX_CHAT_ATTACHMENTS = 4;
const MAX_CHAT_ATTACHMENT_SIZE = 30 * 1024 * 1024;
const MAX_FORWARD_TARGETS = 5;

const isSupportedChatAttachment = (file) =>
  file &&
  (file.type.startsWith("image/") || file.type.startsWith("video/")) &&
  file.size <= MAX_CHAT_ATTACHMENT_SIZE;

const getAttachmentUrl = (attachment) =>
  typeof attachment === "string"
    ? attachment
    : attachment?.url || attachment?.previewUrl || "";

const getAttachmentName = (attachment) =>
  typeof attachment === "string"
    ? attachment.split("/").pop()?.split("?")[0] || "Attachment"
    : attachment?.name || "Attachment";

const isVideoAttachment = (attachment) => {
  const url = getAttachmentUrl(attachment);
  const type = typeof attachment === "string" ? "" : attachment?.type || "";

  return type.startsWith("video/") || /\.(mp4|webm|mov)(?:\?|$)/i.test(url);
};

const formatFileSize = (size = 0) => {
  if (!size) return "";

  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
};

const createAttachmentDraft = (file) => ({
  id: `${file.name}-${file.lastModified}-${file.size}-${Math.random().toString(36).slice(2)}`,
  file,
  name: file.name,
  size: file.size,
  type: file.type,
  previewUrl: URL.createObjectURL(file),
});

const revokeAttachmentPreviews = (items = []) => {
  items.forEach((item) => {
    const url = getAttachmentUrl(item);

    if (url?.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  });
};

const getSenderId = (msg) => msg?.sender?._id || msg?.sender;

const isMatchingPendingMessage = (pending, incoming) =>
  pending?.isPending &&
  String(pending.chatRoomId) === String(incoming?.chatRoomId) &&
  String(getSenderId(pending)) === String(getSenderId(incoming)) &&
  (pending.content || "") === (incoming?.content || "");

const mergeIncomingMessage = (current, incoming, tempId) => {
  if (!incoming?._id) return current;

  const alreadyHasIncoming = current.some((item) => item._id === incoming._id);
  let inserted = alreadyHasIncoming;

  const next = current.reduce((items, item) => {
    if (item._id === incoming._id) {
      items.push(incoming);
      return items;
    }

    const shouldReplace =
      (tempId && item._id === tempId) || isMatchingPendingMessage(item, incoming);

    if (shouldReplace) {
      revokeAttachmentPreviews(item.attachmentPreviews);

      if (!inserted) {
        items.push(incoming);
        inserted = true;
      }

      return items;
    }

    items.push(item);
    return items;
  }, []);

  if (!inserted) {
    next.push(incoming);
  }

  return next;
};

const getVisibleMessages = (items = []) =>
  items.filter((item) => !item?.isDeleted);

const getMessageMediaItems = (msg) => {
  const mediaItems = msg?.attachmentPreviews?.length
    ? msg.attachmentPreviews
    : (msg?.attachments || []).map((attachment, index) => ({
        id: `${getAttachmentUrl(attachment)}-${index}`,
        name: getAttachmentName(attachment),
        url: getAttachmentUrl(attachment),
        type: isVideoAttachment(attachment) ? "video" : "image",
      }));

  return mediaItems.filter((attachment) => Boolean(getAttachmentUrl(attachment)));
};

const getReplyPreviewLabel = (msg) => {
  const text = msg?.content?.trim();

  if (text) return text;

  const mediaItems = getMessageMediaItems(msg);

  if (!mediaItems.length) return "Message";

  return isVideoAttachment(mediaItems[0]) ? "Video" : "Photo";
};

const ReplyPreview = ({ msg, prefix }) => {
  const mediaItems = getMessageMediaItems(msg);
  const media = mediaItems[0];
  const mediaUrl = media ? getAttachmentUrl(media) : "";
  const isVideo = media ? isVideoAttachment(media) : false;

  return (
    <div className="chat-reply-summary">
      <span className="chat-reply-copy">
        {prefix && <small>{prefix}</small>}
        <strong>{getReplyPreviewLabel(msg)}</strong>
      </span>
      {mediaUrl && (
        <span className="chat-reply-thumb" aria-hidden="true">
          {isVideo ? (
            <video muted playsInline preload="metadata" src={mediaUrl} />
          ) : (
            <img alt="" src={mediaUrl} />
          )}
          {isVideo && <span>▶</span>}
        </span>
      )}
    </div>
  );
};

const MessageMedia = ({ msg }) => {
  const visibleMediaItems = getMessageMediaItems(msg);

  if (!visibleMediaItems.length) return null;

  const isUploading = msg.isPending && !msg.sendError;
  const progress = typeof msg.uploadProgress === "number" ? msg.uploadProgress : null;
  const layoutClass = visibleMediaItems.length === 1 ? "is-single" : "is-grid";

  return (
    <div className={`chat-message-media ${layoutClass} ${isUploading ? "is-uploading" : ""}`}>
      {visibleMediaItems.map((attachment, index) => {
        const url = getAttachmentUrl(attachment);
        const name = getAttachmentName(attachment);
        const isVideo = isVideoAttachment(attachment);

        return (
          <div
            className={`chat-media-tile ${isVideo ? "is-video" : "is-image"}`}
            key={attachment.id || `${url}-${index}`}
          >
            {isVideo ? (
              <video controls controlsList="nodownload" preload="metadata" src={url} />
            ) : (
              <img alt={name} loading="lazy" src={url} />
            )}

            <span className="chat-media-kind">
              {isVideo ? "Video" : "Image"}
            </span>
            <a
              aria-label={`Download ${name}`}
              className="chat-media-download"
              download={name}
              href={url}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              rel="noopener noreferrer"
              target="_blank"
              title="Download"
            >
              <FiDownload size={15} />
            </a>

            {isUploading && (
              <div className="chat-media-upload-overlay">
                <div className="chat-media-progress-ring">
                  {progress == null ? "..." : `${progress}%`}
                </div>
                <span>Sending</span>
                <div className="chat-media-progress-track">
                  <span style={{ width: `${progress ?? 12}%` }} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Avatar component
const Avatar = ({ user, size = 48, onClick, isOnline = false }) => {
  const name = user?.name || "User";
  const initials = getInitials(name);
  const backgroundColor = getColorFromName(name);

  const avatar = user?.profilePicture ? (
    <img
      src={user.profilePicture}
      alt={name}
      onClick={onClick}
      style={{
        width: size + "px",
        height: size + "px",
        borderRadius: "50%",
        cursor: onClick ? "pointer" : "default",
        objectFit: "cover",
      }}
    />
  ) : (
    <div
      onClick={onClick}
      style={{
        width: size + "px",
        height: size + "px",
        borderRadius: "50%",
        backgroundColor: backgroundColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 600,
        fontSize: size * 0.4 + "px",
        cursor: onClick ? "pointer" : "default",
        flexShrink: 0,
        textTransform: "uppercase",
        userSelect: "none",
      }}
    >
      {initials}
    </div>
  );

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {avatar}
      <span
        aria-label={isOnline ? "Online" : "Offline"}
        className={`chat-presence-dot ${isOnline ? "is-online" : ""}`}
      />
    </div>
  );
};

// Message Actions Menu Component - Vertical dots, hover visible, menu opens below
const MessageActionsMenu = ({
  msg,
  isMe,
  forcedOpen = false,
  onReply,
  onDelete,
  onForward,
  onReact,
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const menuRef = useRef(null);
  const menuOpen = forcedOpen || isOpen;

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setConfirmingDelete(false);
    if (onClose) onClose();
  }, [onClose]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        closeMenu();
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen, closeMenu]);

  const handleToggle = (e) => {
    e.stopPropagation();
    const nextOpen = !menuOpen;
    setConfirmingDelete(false);
    setIsOpen(nextOpen);

    if (!nextOpen) {
      closeMenu();
    }
  };

  const handleAction = (callback, e) => {
    e.stopPropagation();
    callback();
    closeMenu();
  };

  const stopMenuEvent = (event) => {
    event.stopPropagation();
  };

  const handleDeleteRequest = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setConfirmingDelete(true);
  };

  const handleDeleteConfirm = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onDelete(msg._id);
    closeMenu();
  };
  const canForward =
    !msg.isPending &&
    !msg.sendError &&
    Boolean((msg.content || "").trim() || msg.attachments?.length);

  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
      }}
      ref={menuRef}
    >
      <button
        onClick={handleToggle}
        className={`message-action-trigger ${menuOpen ? "is-open" : ""}`}
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "4px",
          background: menuOpen ? "rgba(0,0,0,0.08)" : "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--cc-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s ease, color 0.2s ease, opacity 0.2s ease",
          padding: 0,
          opacity: menuOpen ? 1 : 0,
        }}
        onMouseEnter={(e) => {
          if (!menuOpen) {
            e.currentTarget.style.background = "var(--cc-surface-soft)";
            e.currentTarget.style.color = "var(--cc-text)";
            e.currentTarget.style.opacity = "1";
          }
        }}
        onMouseLeave={(e) => {
          if (!menuOpen) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--cc-muted)";
            e.currentTarget.style.opacity = "0";
          }
        }}
        aria-label="Message actions"
      >
        <FiMoreVertical size={18} />
      </button>

      {menuOpen && (
        <div
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onMouseDown={stopMenuEvent}
          onPointerDown={stopMenuEvent}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            [isMe ? "right" : "left"]: "0",
            background: "var(--cc-surface-raised)",
            border: "1px solid var(--cc-border)",
            borderRadius: "12px",
            boxShadow: "var(--cc-shadow)",
            padding: "6px",
            minWidth: "180px",
            zIndex: 100,
            animation: "cc-popover-in 160ms ease",
          }}
        >
          <button
            onClick={(e) => handleAction(() => onReply(msg), e)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: "8px 12px",
              border: "none",
              background: "transparent",
              borderRadius: "8px",
              cursor: "pointer",
              color: "var(--cc-text)",
              fontSize: "13px",
              fontWeight: 500,
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--cc-surface-soft)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <span style={{ fontSize: "16px" }}>↩</span>
            Reply
          </button>

          {canForward && (
            <button
              onClick={(e) => handleAction(() => onForward(msg), e)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "8px 12px",
                border: "none",
                background: "transparent",
                borderRadius: "8px",
                cursor: "pointer",
                color: "var(--cc-text)",
                fontSize: "13px",
                fontWeight: 500,
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--cc-surface-soft)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              type="button"
            >
              <FiShare2 size={16} />
              Forward
            </button>
          )}

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "4px",
            padding: "6px 8px",
            borderTop: "1px solid var(--cc-border)",
            marginTop: "4px",
            paddingTop: "8px",
          }}>
            {["👍", "❤️", "😂", "🎉", "🔥", "👏"].map((emoji) => (
              <button
                key={emoji}
                onClick={(e) => handleAction(() => onReact(msg._id, emoji), e)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderRadius: "6px",
                  padding: "4px",
                  fontSize: "20px",
                  cursor: "pointer",
                  transition: "background 0.15s ease, transform 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--cc-surface-soft)";
                  e.currentTarget.style.transform = "scale(1.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                {emoji}
              </button>
            ))}
          </div>

          {isMe && (
            <div className="message-delete-area">
              {confirmingDelete ? (
                <div className="message-delete-confirm" role="group" aria-label="Confirm delete message">
                  <span>Delete message?</span>
                  <div>
                    <button
                      className="message-delete-cancel"
                      onClick={(event) => {
                        event.stopPropagation();
                        setConfirmingDelete(false);
                      }}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="message-delete-confirm-button"
                      onClick={handleDeleteConfirm}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="message-delete-action"
                  onClick={handleDeleteRequest}
                  type="button"
                >
                  <FiTrash2 size={16} />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const RTC_CONFIGURATION = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    ...(import.meta.env.VITE_TURN_URL
      ? [
          {
            urls: import.meta.env.VITE_TURN_URL,
            username: import.meta.env.VITE_TURN_USERNAME,
            credential: import.meta.env.VITE_TURN_CREDENTIAL,
          },
        ]
      : []),
  ],
};

const normalizeCallHistory = (items = []) => {
  const seen = new Set();

  return items
    .filter((item) => {
      if (!item?.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, 30);
};

const ChatPage = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOld, setLoadingOld] = useState(false);
  const [message, setMessage] = useState("");
  const [chats, setChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [typing, setTyping] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [showUnread, setShowUnread] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set());
  const [attachments, setAttachments] = useState([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [showChatActions, setShowChatActions] = useState(false);
  const [activeMobileActionMessageId, setActiveMobileActionMessageId] = useState(null);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [forwardSearch, setForwardSearch] = useState("");
  const [forwardSearchUsers, setForwardSearchUsers] = useState([]);
  const [forwardTargets, setForwardTargets] = useState([]);
  const [forwardingMessage, setForwardingMessage] = useState(false);
  const [activeTab, setActiveTab] = useState("chats");
  const [call, setCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callHistory, setCallHistory] = useState(() => {
    const userId = JSON.parse(localStorage.getItem("userInfo") || "null")?.user?._id;
    if (!userId) return [];
    return normalizeCallHistory(
      JSON.parse(localStorage.getItem(`cc:call-history:${userId}`) || "[]"),
    );
  });
  const messagesEndRef = useRef(null);
  const messageRefs = useRef({});
  const messagesContainerRef = useRef(null);
  const [search, setSearch] = useState("");
  const [searchUsers, setSearchUsers] = useState([]);
  const navigate = useNavigate();

  const currentUser = JSON.parse(localStorage.getItem("userInfo"))?.user;

  const pageRef = useRef(1);
  const firstLoad = useRef(true);
  const hasNewMessageRef = useRef(false);
  const unreadAnchorRef = useRef(null);
  const openChatRequestRef = useRef(0);
  const attachmentInputRef = useRef(null);
  const attachmentsRef = useRef([]);
  const messagesRef = useRef([]);
  const longPressTimerRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => () => {
    window.clearTimeout(longPressTimerRef.current);
    revokeAttachmentPreviews(attachmentsRef.current);
    messagesRef.current.forEach((item) => {
      revokeAttachmentPreviews(item.attachmentPreviews);
    });
  }, []);

  const clearAttachmentDrafts = useCallback(() => {
    setAttachments((current) => {
      revokeAttachmentPreviews(current);
      return [];
    });
    setAttachmentError("");
  }, []);

  const clearLongPressTimer = useCallback(() => {
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  }, []);

  const openMobileActions = useCallback((messageId) => {
    clearLongPressTimer();
    setActiveMobileActionMessageId(messageId);
  }, [clearLongPressTimer]);

  const addAttachmentFiles = useCallback((fileList, { replace = false } = {}) => {
    const incomingFiles = Array.from(fileList || []);

    if (!incomingFiles.length) return false;

    const validFiles = incomingFiles.filter(isSupportedChatAttachment);
    const currentCount = replace ? 0 : attachmentsRef.current.length;
    const availableSlots = Math.max(0, MAX_CHAT_ATTACHMENTS - currentCount);
    const selectedFiles = validFiles.slice(0, availableSlots);
    const selectedDrafts = selectedFiles.map(createAttachmentDraft);

    setAttachments((current) => {
      if (replace) {
        revokeAttachmentPreviews(current);
        return selectedDrafts;
      }

      return [...current, ...selectedDrafts];
    });

    if (incomingFiles.length !== selectedFiles.length) {
      setAttachmentError(
        `Only ${MAX_CHAT_ATTACHMENTS} images, GIFs, stickers, or videos up to 30 MB each can be sent.`,
      );
    } else {
      setAttachmentError("");
    }

    return selectedFiles.length > 0;
  }, []);

  const refreshChats = useCallback(async ({ silent = false } = {}) => {
    const cached = !silent ? getCachedMyChats() : null;

    try {
      if (cached) {
        setChats(cached.chats || []);
        setLoadingChats(false);
      } else if (!silent) {
        setLoadingChats(true);
      }

      const data = await getMyChats({
        force: silent || Boolean(cached),
      });
      setChats(data.chats || []);
    } catch (err) {
      console.log(err);
    } finally {
      if (!silent) {
        setLoadingChats(false);
      }
    }
  }, []);

  const notifyChatCounters = useCallback(() => {
    window.dispatchEvent(new Event("cc:chat-updated"));
  }, []);

  const scrollMessagesToBottom = useCallback(() => {
    const container = messagesContainerRef.current;

    if (container) {
      container.scrollTop = container.scrollHeight;
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: "auto",
      block: "end",
    });
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      refreshChats();
    }, 0);

    const refreshChatList = () => refreshChats({ silent: true });
    socket.on("chat_updated", refreshChatList);

    return () => {
      window.clearTimeout(initialLoad);
      socket.off("chat_updated", refreshChatList);
    };
  }, [refreshChats]);

  useEffect(() => {
    const updatePresence = ({ userId, isOnline }) => {
      setOnlineUserIds((current) => {
        const next = new Set(current);
        if (isOnline) next.add(String(userId));
        else next.delete(String(userId));
        return next;
      });
      setChats((current) =>
        current.map((chat) =>
          String(chat.user?._id) === String(userId)
            ? { ...chat, isOnline }
            : chat,
        ),
      );
    };

    socket.on("presence_update", updatePresence);
    const setPresenceSnapshot = (userIds) => {
      setOnlineUserIds(new Set((userIds || []).map(String)));
    };
    socket.on("presence_snapshot", setPresenceSnapshot);
    socket.emit("request_presence");
    return () => {
      socket.off("presence_update", updatePresence);
      socket.off("presence_snapshot", setPresenceSnapshot);
    };
  }, []);

  useEffect(() => {
    const updateStatus = ({ messageId, status }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? {
                ...m,
                status,
              }
            : m,
        ),
      );
    };

    socket.on("message_status", updateStatus);

    return () => {
      socket.off("message_status", updateStatus);
    };
  }, []);

  useEffect(() => {
    const applyDeletedMessage = ({ messageId, roomId }) => {
      if (String(roomId) !== String(room?._id)) return;
      setMessages((current) =>
        current.filter((item) => String(item._id) !== String(messageId)),
      );
    };
    const applyReactions = ({ messageId, reactions }) => {
      setMessages((current) =>
        current.map((item) => (item._id === messageId ? { ...item, reactions } : item)),
      );
    };

    socket.on("message_deleted", applyDeletedMessage);
    socket.on("message_reactions", applyReactions);
    return () => {
      socket.off("message_deleted", applyDeletedMessage);
      socket.off("message_reactions", applyReactions);
    };
  }, [room?._id]);

  useEffect(() => {
    const receive = (msg) => {
      if (msg?.isDeleted) return;

      clearChatCache(msg.chatRoomId);

      setTimeout(() => {
        refreshChats({ silent: true });
        notifyChatCounters();
      }, 150);

      if (String(msg.chatRoomId) === String(room?._id)) {
        const container = messagesContainerRef.current;

        if (container) {
          const nearBottom =
            container.scrollHeight -
              container.scrollTop -
              container.clientHeight <
            180;

          if (!nearBottom) {
            hasNewMessageRef.current = true;
            setShowUnread(true);
          }
        }

        setMessages((prev) => mergeIncomingMessage(prev, msg));

        const senderId = msg.sender?._id || msg.sender;
        if (String(senderId) !== String(currentUser?._id)) {
          socket.emit("message_delivered", {
            messageId: msg._id,
            roomId: room._id,
          });

          if (currentUser?._id) {
            socket.emit("message_seen", {
              roomId: room._id,
              userId: currentUser._id,
            });
            notifyChatCounters();
          }
        }
      }
    };

    socket.on("new_message", receive);

    return () => {
      socket.off("new_message", receive);
    };
  }, [room?._id, currentUser?._id, notifyChatCounters, refreshChats]);

  useEffect(() => {
    const handleTyping = ({ roomId, name }) => {
      if (String(roomId) !== String(room?._id)) {
        return;
      }
      setTyping(name);
    };

    const handleStopTyping = () => {
      setTyping(false);
    };

    socket.on("user_typing", handleTyping);
    socket.on("user_stop_typing", handleStopTyping);

    return () => {
      socket.off("user_typing", handleTyping);
      socket.off("user_stop_typing", handleStopTyping);
    };
  }, [room?._id]);

  useEffect(() => {
    if (!messages.length) {
      return;
    }

    const container = messagesContainerRef.current;

    if (!container) {
      return;
    }

    const nearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      180;

    if (firstLoad.current || nearBottom) {
      requestAnimationFrame(() => {
        scrollMessagesToBottom();
      });

      firstLoad.current = false;
    }
  }, [messages.length, scrollMessagesToBottom]);

  const handleOpenChat = async (user) => {
    if (!user?._id) {
      return;
    }

    const requestId = openChatRequestRef.current + 1;
    openChatRequestRef.current = requestId;
    const previousRoomId = room?._id;

    setSelectedUser(user);
    setMessages([]);
    setHasMore(true);
    setShowUnread(false);
    setMessage("");
    clearAttachmentDrafts();
    setReplyTo(null);
    setTyping(false);
    setLoadingMessages(true);
    firstLoad.current = true;

    try {
      const res = await openChat(user._id);

      if (openChatRequestRef.current !== requestId) {
        return;
      }

      setRoom(res.room);

      if (previousRoomId && String(previousRoomId) !== String(res.room?._id)) {
        socket.emit("leave_room", previousRoomId);
      }

      joinRoom(res.room._id);

      pageRef.current = 1;

      const cachedHistory = getCachedMessages(res.room._id, 1);

      if (cachedHistory) {
        setMessages(getVisibleMessages(cachedHistory.messages));
        setHasMore(cachedHistory.hasMore);
        setLoadingMessages(false);
        setShowUnread(false);
        requestAnimationFrame(() => {
          requestAnimationFrame(scrollMessagesToBottom);
        });
      }

      const history = await getMessages(res.room._id, 1, {
        force: Boolean(cachedHistory),
      });

      if (openChatRequestRef.current !== requestId) {
        return;
      }

      setMessages(getVisibleMessages(history.messages));
      setHasMore(history.hasMore);

      setShowUnread(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(scrollMessagesToBottom);
      });
      hasNewMessageRef.current = false;

      if (currentUser?._id) {
        socket.emit("message_seen", {
          roomId: res.room._id,
          userId: currentUser._id,
        });
        notifyChatCounters();
        setTimeout(() => {
          refreshChats({ silent: true });
          notifyChatCounters();
        }, 150);
        setShowUnread(false);
      }

      firstLoad.current = false;
    } catch (err) {
      console.log(err);
    } finally {
      if (openChatRequestRef.current === requestId) {
        setLoadingMessages(false);
      }
    }
  };

  const handleBackToChats = () => {
    openChatRequestRef.current += 1;

    if (room?._id) {
      socket.emit("leave_room", room._id);
    }

    setSelectedUser(null);
    setRoom(null);
    setMessages([]);
    setHasMore(true);
    setShowUnread(false);
    setMessage("");
    clearAttachmentDrafts();
    setReplyTo(null);
    setTyping(false);
    firstLoad.current = true;
    hasNewMessageRef.current = false;
    refreshChats({ silent: true });
    notifyChatCounters();
  };

  useEffect(() => {
    const searchPeople = async () => {
      if (!search.trim()) {
        setSearchUsers([]);
        return;
      }

      try {
        const data = await searchUsersService(search, 1, 8);
        setSearchUsers(data.users || []);
      } catch (err) {
        console.log(err);
      }
    };

    const timer = setTimeout(searchPeople, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!forwardMessage) {
      setForwardSearch("");
      setForwardSearchUsers([]);
      return undefined;
    }

    const query = forwardSearch.trim();

    if (!query) {
      setForwardSearchUsers([]);
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await searchUsersService(query, 1, 8);
        setForwardSearchUsers(data.users || []);
      } catch (err) {
        console.log(err);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [forwardMessage, forwardSearch]);

  const scrollToMessage = (messageId) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      messageElement.style.transition = "all 0.3s ease";
      messageElement.style.background = "rgba(0, 149, 246, 0.15)";
      messageElement.style.borderRadius = "8px";
      setTimeout(() => {
        messageElement.style.background = "transparent";
      }, 2000);
    }
  };

  const handleReplyClick = (msg) => {
    if (replyTo?._id === msg._id) {
      setReplyTo(null);
      return;
    }
    setReplyTo(msg);
  };

  const closeForwardPanel = () => {
    setForwardMessage(null);
    setForwardSearch("");
    setForwardSearchUsers([]);
    setForwardTargets([]);
  };

  const handleForwardClick = (msg) => {
    setActiveMobileActionMessageId(null);
    setForwardTargets([]);
    setForwardSearch("");
    setForwardSearchUsers([]);
    setForwardMessage(msg);
  };

  const getForwardTargetKey = (target) =>
    String(target.user?._id || target._id || target.roomId || "");

  const normalizeForwardTarget = (target) => ({
    key: getForwardTargetKey(target),
    roomId: target.roomId || null,
    user: target.user || target,
  });

  const toggleForwardTarget = (target) => {
    const nextTarget = normalizeForwardTarget(target);

    if (!nextTarget.key) return;

    setForwardTargets((current) => {
      const exists = current.some((item) => item.key === nextTarget.key);

      if (exists) {
        return current.filter((item) => item.key !== nextTarget.key);
      }

      if (current.length >= MAX_FORWARD_TARGETS) {
        return current;
      }

      return [...current, nextTarget];
    });
  };

  const handleSend = async () => {
    const text = message.trim();
    const draftAttachments = attachments;
    const hasAttachments = draftAttachments.length > 0;

    if ((!text && !hasAttachments) || !room || loadingMessages || sendingMessage) return;

    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const localPreviews = draftAttachments.map((item) => ({
      id: item.id,
      name: item.name,
      size: item.size,
      type: item.type,
      url: item.previewUrl,
      isLocal: true,
    }));

    const optimisticMessage = {
      _id: tempId,
      chatRoomId: room._id,
      sender: currentUser,
      content: text,
      attachments: [],
      attachmentPreviews: localPreviews,
      replyTo,
      reactions: [],
      createdAt: new Date().toISOString(),
      status: "sending",
      isPending: true,
      uploadProgress: hasAttachments ? 1 : null,
    };

    setSendingMessage(true);
    setAttachmentError("");
    setMessages((prev) => [...prev, optimisticMessage]);
    setMessage("");
    setReplyTo(null);
    setAttachments([]);

    requestAnimationFrame(scrollMessagesToBottom);

    try {
      const response = await sendMessage(
        {
          roomId: room._id,
          content: text,
          replyTo: replyTo?._id,
          attachments: draftAttachments.map((item) => item.file),
        },
        {
          onUploadProgress: (event) => {
            if (!hasAttachments) return;

            const progress = event.total
              ? Math.min(99, Math.max(1, Math.round((event.loaded * 100) / event.total)))
              : null;

            setMessages((prev) =>
              prev.map((item) =>
                item._id === tempId
                  ? {
                      ...item,
                      uploadProgress: progress,
                    }
                  : item,
              ),
            );
          },
        },
      );

      const sentMessage = response?.message || response;

      if (sentMessage?._id) {
        setMessages((prev) => mergeIncomingMessage(prev, sentMessage, tempId));
      }

      socket.emit("stop_typing", room._id);
    } catch (err) {
      console.log(err);
      setMessages((prev) =>
        prev.map((item) =>
          item._id === tempId
            ? {
                ...item,
                isPending: false,
                sendError: true,
                status: "failed",
                uploadProgress: null,
              }
            : item,
        ),
      );
      setAttachmentError("Message upload failed. Please try again.");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAttachmentChange = (event) => {
    addAttachmentFiles(event.target.files, { replace: true });
    event.target.value = "";
  };

  const handleMessagePaste = (event) => {
    if (composerDisabled) return;

    const pastedFiles = Array.from(event.clipboardData?.files || []);
    const pastedItemFiles = Array.from(event.clipboardData?.items || [])
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter(Boolean);
    const files = pastedFiles.length ? pastedFiles : pastedItemFiles;

    if (files.some(isSupportedChatAttachment)) {
      event.preventDefault();
      addAttachmentFiles(files);
    }
  };

  const handleMessageDelete = async (messageId) => {
    try {
      setMessages((current) => current.filter((item) => item._id !== messageId));
      setActiveMobileActionMessageId(null);
      await deleteMessage(messageId);
    } catch (error) {
      console.log(error);
    }
  };

  const handleMessageReaction = async (messageId, emoji) => {
    try {
      await reactToMessage(messageId, emoji);
    } catch (error) {
      console.log(error);
    }
  };

  const handleForwardSend = async () => {
    if (!forwardMessage || forwardingMessage || !forwardTargets.length) return;

    const text = forwardMessage.content || "";
    const forwardedAttachments = (forwardMessage.attachments || []).filter(Boolean);

    if (!text.trim() && !forwardedAttachments.length) return;

    try {
      setForwardingMessage(true);

      for (const target of forwardTargets.slice(0, MAX_FORWARD_TARGETS)) {
        let targetRoomId = target.roomId;

        if (!targetRoomId && target.user?._id) {
          const opened = await openChat(target.user._id);
          targetRoomId = opened.room?._id;
        }

        if (!targetRoomId) continue;

        const response = await sendMessage({
          roomId: targetRoomId,
          content: text,
          attachments: forwardedAttachments,
        });
        const forwarded = response?.message || response;

        if (String(targetRoomId) === String(room?._id) && forwarded?._id) {
          setMessages((prev) => mergeIncomingMessage(prev, forwarded));
        }
      }

      closeForwardPanel();
      await refreshChats({ silent: true });
      notifyChatCounters();
    } catch (error) {
      console.log(error);
    } finally {
      setForwardingMessage(false);
    }
  };

  const handleMessagePointerDown = (event, messageId) => {
    if (event.pointerType !== "touch") return;

    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      openMobileActions(messageId);
    }, 480);
  };

  const handleMessageContextMenu = (event, messageId) => {
    event.preventDefault();
    openMobileActions(messageId);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderStatus = (msg) => {
    const senderId = msg.sender?._id || msg.sender;
    if (String(senderId) !== String(currentUser?._id)) return null;

    if (msg.sendError) {
      return <span className="chat-message-failed">Failed</span>;
    }

    if (msg.isPending) {
      return (
        <span className="chat-message-sending">
          {typeof msg.uploadProgress === "number"
            ? `${msg.uploadProgress}%`
            : "Sending"}
        </span>
      );
    }

    if (msg.status === "seen") {
      return (
        <span
          style={{
            color: "#4fc3f7",
            fontWeight: 700,
          }}
        >
          ✓✓
        </span>
      );
    }

    if (msg.status === "delivered") {
      return <span>✓✓</span>;
    }

    return <span>✓</span>;
  };

  const storeCallHistory = useCallback(
    (entry) => {
      if (!currentUser?._id) return;
      setCallHistory((current) => {
        const next = normalizeCallHistory([
          entry,
          ...current.filter((item) => item.id !== entry.id),
        ]);
        localStorage.setItem(`cc:call-history:${currentUser._id}`, JSON.stringify(next));
        return next;
      });
    },
    [currentUser?._id],
  );

  const attachStreamToVideo = useCallback(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  }, []);

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  const releaseCall = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingOfferRef.current = null;
    pendingCandidatesRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setCall(null);
  }, []);

  const createPeerConnection = useCallback((targetId, callId) => {
    const peer = new RTCPeerConnection(RTC_CONFIGURATION);
    peer.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.emit("webrtc_ice_candidate", { targetId, callId, candidate });
      }
    };
    peer.ontrack = ({ streams }) => {
      const stream = streams[0];
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
      requestAnimationFrame(attachStreamToVideo);
    };
    peer.onconnectionstatechange = () => {
      if (["connected", "completed"].includes(peer.connectionState)) {
        setCall((current) => (current ? { ...current, status: "active" } : current));
      }
    };
    peerRef.current = peer;
    return peer;
  }, [attachStreamToVideo]);

  const getCallMedia = useCallback(async (mode) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mode === "video",
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    requestAnimationFrame(attachStreamToVideo);
    return stream;
  }, [attachStreamToVideo]);

  const startCall = async (mode) => {
    if (!selectedUser?._id || call) return;

    const callId = `${currentUser?._id}-${Date.now()}`;
    try {
      const stream = await getCallMedia(mode);
      const peer = createPeerConnection(selectedUser._id, callId);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      setCall({
        callId,
        peer: selectedUser,
        mode,
        status: "calling",
        direction: "outgoing",
      });
      socket.emit("call_user", { targetId: selectedUser._id, callId, mode });
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("webrtc_offer", {
        targetId: selectedUser._id,
        callId,
        mode,
        sdp: offer,
      });
    } catch (error) {
      console.log(error);
      releaseCall();
      window.alert("Camera or microphone access is needed to start a call.");
    }
  };

  const acceptCall = async () => {
    if (!call || !pendingOfferRef.current) return;

    try {
      const stream = await getCallMedia(call.mode);
      const peer = createPeerConnection(call.peer._id, call.callId);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      await peer.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current.sdp));
      for (const candidate of pendingCandidatesRef.current) {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current = [];
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("webrtc_answer", {
        targetId: call.peer._id,
        callId: call.callId,
        sdp: answer,
      });
      setCall((current) => ({ ...current, status: "active" }));
      storeCallHistory({
        id: call.callId,
        peer: call.peer,
        mode: call.mode,
        direction: "incoming",
        status: "answered",
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.log(error);
      releaseCall();
      window.alert("Camera or microphone access is needed to answer this call.");
    }
  };

  const declineCall = () => {
    if (!call) return;
    socket.emit("call_declined", { targetId: call.peer._id, callId: call.callId });
    storeCallHistory({
      id: call.callId,
      peer: call.peer,
      mode: call.mode,
      direction: "incoming",
      status: "missed",
      createdAt: new Date().toISOString(),
    });
    releaseCall();
  };

  const endCall = () => {
    if (!call) return;
    socket.emit("call_end", { targetId: call.peer._id, callId: call.callId });
    storeCallHistory({
      id: call.callId,
      peer: call.peer,
      mode: call.mode,
      direction: call.direction,
      status: "completed",
      createdAt: new Date().toISOString(),
    });
    releaseCall();
  };

  const toggleMicrophone = () => {
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setCall((current) =>
      current ? { ...current, muted: !current.muted } : current,
    );
  };

  const toggleCamera = () => {
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setCall((current) =>
      current ? { ...current, cameraOff: !current.cameraOff } : current,
    );
  };

  useEffect(() => {
    attachStreamToVideo();
  }, [attachStreamToVideo, localStream, remoteStream, call?.status]);

  useEffect(() => {
    const handleIncomingCall = ({ callId, mode, caller }) => {
      if (call) {
        socket.emit("call_declined", { targetId: caller?._id, callId });
        return;
      }
      setCall({ callId, peer: caller, mode, status: "incoming", direction: "incoming" });
    };
    const handleOffer = ({ fromId, callId, mode, sdp }) => {
      pendingOfferRef.current = { fromId, callId, mode, sdp };
    };
    const handleAnswer = async ({ callId, sdp }) => {
      if (!peerRef.current || call?.callId !== callId) return;
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    };
    const handleCandidate = async ({ callId, candidate }) => {
      if (!candidate) return;
      if (!peerRef.current || call?.callId !== callId) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }
      await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    };
    const handleCallEnd = ({ callId }) => {
      if (call?.callId === callId) releaseCall();
    };
    const handleCallDeclined = ({ callId }) => {
      if (call?.callId !== callId) return;
      window.alert("This call was declined.");
      releaseCall();
    };

    socket.on("incoming_call", handleIncomingCall);
    socket.on("webrtc_offer", handleOffer);
    socket.on("webrtc_answer", handleAnswer);
    socket.on("webrtc_ice_candidate", handleCandidate);
    socket.on("call_end", handleCallEnd);
    socket.on("call_declined", handleCallDeclined);
    return () => {
      socket.off("incoming_call", handleIncomingCall);
      socket.off("webrtc_offer", handleOffer);
      socket.off("webrtc_answer", handleAnswer);
      socket.off("webrtc_ice_candidate", handleCandidate);
      socket.off("call_end", handleCallEnd);
      socket.off("call_declined", handleCallDeclined);
    };
  }, [call, releaseCall]);

  useEffect(() => {
    return () => {
      if (room?._id) {
        socket.emit("leave_room", room._id);
      }
    };
  }, [room?._id]);

  const composerDisabled = loadingMessages || sendingMessage || !room;
  const canSendMessage =
    Boolean(message.trim() || attachments.length > 0) &&
    Boolean(room) &&
    !loadingMessages &&
    !sendingMessage;
  const forwardQuery = forwardSearch.trim().toLowerCase();
  const forwardChatTargets = forwardMessage
    ? chats
        .filter((chat) => chat.user?._id)
        .filter((chat) =>
          forwardQuery
            ? chat.user.name?.toLowerCase().includes(forwardQuery)
            : true,
        )
        .slice(0, 8)
    : [];
  const forwardSearchTargets = forwardMessage
    ? forwardSearchUsers
        .filter((user) => String(user._id) !== String(currentUser?._id))
        .filter(
          (user) =>
            !forwardChatTargets.some(
              (chat) => String(chat.user?._id) === String(user._id),
            ),
        )
    : [];
  const selectedForwardKeys = new Set(forwardTargets.map((target) => target.key));
  const visibleForwardTargetsCount =
    forwardChatTargets.length + forwardSearchTargets.length;
  const forwardPreviewText =
    forwardMessage?.content?.trim() ||
    (forwardMessage?.attachments?.length ? "Photo or video message" : "Message");

  // ===== RENDER =====
  return (
    <div
      className={`chat-page ${selectedUser || call ? "has-active-chat" : "is-chat-list"}`}
      style={{
        display: "flex",
        height: "calc(100vh - 70px)",
        width: "100%",
        background: "var(--cc-bg)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Sidebar */}
      <div
        className="chat-sidebar"
        style={{
          width: "360px",
          minWidth: "360px",
          background: "var(--cc-surface-raised)",
          borderRight: "1px solid var(--cc-border)",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          flexShrink: 0,
        }}
      >
        <div
          className="chat-sidebar-header"
          style={{
            padding: "20px 20px",
            borderBottom: "1px solid var(--cc-border)",
            background: "var(--cc-surface-raised)",
            flexShrink: 0,
          }}
        >
          <nav className="chat-nav-tabs" aria-label="Messages navigation">
            <button
              className={activeTab === "chats" ? "is-active" : ""}
              onClick={() => setActiveTab("chats")}
              type="button"
            >
              Chats
            </button>
            <button
              className={activeTab === "calls" ? "is-active" : ""}
              onClick={() => setActiveTab("calls")}
              type="button"
            >
              Calls
            </button>
          </nav>
          {activeTab === "chats" && (
            <div style={{ marginTop: "14px" }}>
              <input
                className="chat-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chats"
                style={{
                  width: "100%",
                  height: "42px",
                  padding: "0 13px",
                  border: "1px solid var(--cc-border)",
                  borderRadius: "var(--cc-radius)",
                  background: "var(--cc-surface)",
                  color: "var(--cc-text)",
                  boxShadow: "0 4px 14px rgba(21, 35, 45, 0.045)",
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--cc-primary)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(15, 118, 110, 0.13)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--cc-border)";
                  e.target.style.boxShadow = "0 4px 14px rgba(21, 35, 45, 0.045)";
                }}
              />
            </div>
          )}
        </div>

        <div
          className="chat-list"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 0",
          }}
        >
          {activeTab === "calls" ? (
            callHistory.length > 0 ? (
              callHistory.map((entry) => (
                <div className="chat-list-item call-history-item" key={entry.id} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px",
                }}>
                  <Avatar user={entry.peer} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="chat-user-name" style={{ fontWeight: 600 }}>{entry.peer?.name || "Campus member"}</div>
                    <div className="chat-last-message" style={{ fontSize: "13px", color: "var(--cc-muted)" }}>
                      {entry.status === "missed" ? "Missed" : entry.direction === "incoming" ? "Incoming" : "Outgoing"} {entry.mode === "video" ? "video" : "voice"} call
                    </div>
                    <div className="chat-list-time">
                      {formatTime(entry.createdAt)}
                    </div>
                  </div>
                  <span className={`call-history-status is-${entry.status}`} style={{
                    display: "inline-grid",
                    width: "32px",
                    height: "32px",
                    placeItems: "center",
                    borderRadius: "50%",
                    background: entry.status === "missed" ? "var(--cc-danger-soft)" : "var(--cc-primary-soft)",
                    color: entry.status === "missed" ? "var(--cc-danger)" : "var(--cc-primary)",
                  }}>
                    {entry.mode === "video" ? <FiVideo /> : <FiPhone />}
                  </span>
                </div>
              ))
            ) : (
              <div className="chat-empty-small call-empty" style={{
                display: "grid",
                justifyItems: "center",
                gap: "7px",
                padding: "32px 18px",
                textAlign: "center",
                color: "var(--cc-muted)",
              }}>
                <FiPhone style={{ fontSize: "30px", color: "var(--cc-primary)" }} />
                <strong style={{ color: "var(--cc-text)" }}>No calls yet</strong>
                <span>Open a chat to start a voice or video call.</span>
              </div>
            )
          ) : search.trim() ? (
            searchUsers.length > 0 ? (
              searchUsers.map((user) => (
                <div
                  className="chat-list-item"
                  key={user._id}
                  onClick={() => {
                    handleOpenChat(user);
                    setSearch("");
                    setSearchUsers([]);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px",
                    cursor: "pointer",
                    borderBottom: "1px solid var(--cc-border)",
                  }}
                >
                  <Avatar user={user} size={48} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{user.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--cc-muted)" }}>
                      Tap to chat
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div
                className="chat-empty-small"
                style={{
                  padding: "20px",
                  color: "var(--cc-muted)",
                  textAlign: "center",
                }}
              >
                No users found
              </div>
            )
          ) : loadingChats ? (
            <div className="chat-skeleton-list" aria-label="Loading chats" style={{ padding: "4px 0" }}>
              {[1, 2, 3, 4, 5].map((item) => (
                <div className="chat-skeleton-row" key={item} style={{
                  display: "grid",
                  gridTemplateColumns: "48px minmax(0, 1fr)",
                  gap: "12px",
                  alignItems: "center",
                  padding: "12px",
                  borderRadius: "var(--cc-radius)",
                }}>
                  <span className="chat-skeleton-avatar" style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "linear-gradient(90deg, var(--cc-surface-soft) 0%, var(--cc-surface) 50%, var(--cc-surface-soft) 100%)",
                    backgroundSize: "220% 100%",
                    animation: "cc-shimmer 1.2s infinite",
                  }} />
                  <span className="chat-skeleton-lines" style={{ display: "grid", gap: "9px" }}>
                    <span className="chat-skeleton-line is-title" style={{
                      width: "52%",
                      height: "13px",
                      borderRadius: "999px",
                      background: "linear-gradient(90deg, var(--cc-surface-soft) 0%, var(--cc-surface) 50%, var(--cc-surface-soft) 100%)",
                      backgroundSize: "220% 100%",
                      animation: "cc-shimmer 1.2s infinite",
                    }} />
                    <span className="chat-skeleton-line" style={{
                      width: "74%",
                      height: "10px",
                      borderRadius: "999px",
                      background: "linear-gradient(90deg, var(--cc-surface-soft) 0%, var(--cc-surface) 50%, var(--cc-surface-soft) 100%)",
                      backgroundSize: "220% 100%",
                      animation: "cc-shimmer 1.2s infinite",
                    }} />
                  </span>
                </div>
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div
              className="chat-empty-small"
              style={{
                padding: "20px",
                color: "var(--cc-muted)",
                textAlign: "center",
              }}
            >
              No chats yet. Search someone to start a conversation.
            </div>
          ) : (
            chats.map((chat) => (
              <div
                className={`chat-list-item ${String(selectedUser?._id) === String(chat.user?._id) ? "is-active" : ""}`}
                key={chat.roomId}
                onClick={() => handleOpenChat(chat.user)}
                style={{
                  display: "flex",
                  gap: "12px",
                  padding: "14px",
                  cursor: "pointer",
                  borderRadius: "var(--cc-radius)",
                  border: String(selectedUser?._id) === String(chat.user?._id) ? "1px solid rgba(15, 118, 110, 0.16)" : "1px solid transparent",
                  background: String(selectedUser?._id) === String(chat.user?._id) ? "var(--cc-primary-soft)" : "transparent",
                }}
              >
                <Avatar
                  user={chat.user}
                  size={48}
                  isOnline={chat.isOnline || onlineUserIds.has(String(chat.user?._id))}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div
                        className="chat-user-name"
                        style={{
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {chat.user?.name}
                      </div>

                      {chat.unreadCount > 0 && (
                        <div
                          className="chat-unread-badge"
                          style={{
                            background: "#ef4444",
                            color: "#ffffff",
                            minWidth: "18px",
                            height: "18px",
                            borderRadius: "999px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "0 6px",
                          }}
                        >
                          {chat.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className="chat-last-message"
                    style={{
                      fontSize: "13px",
                      color: "var(--cc-muted)",
                      marginTop: "4px",
                    }}
                  >
                    {chat.lastMessage}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div
        className="chat-panel"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "var(--cc-surface-raised)",
          height: "100%",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {call && (
          <section className={`chat-call-stage ${call.mode === "video" ? "is-video" : "is-audio"}`} style={{
            position: "absolute",
            inset: 0,
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "28px",
            overflow: "hidden",
            background: "var(--cc-surface-raised)",
            color: "var(--cc-text)",
          }}>
            <div className="call-stage-main" style={{
              position: "relative",
              display: "grid",
              flex: 1,
              minHeight: 0,
              placeItems: "center",
              border: "1px solid var(--cc-border)",
              borderRadius: "var(--cc-radius)",
              background: "var(--cc-surface-soft)",
              overflow: "hidden",
            }}>
              {call.mode === "video" ? (
                <video
                  autoPlay
                  className="call-remote-video"
                  playsInline
                  ref={remoteVideoRef}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <>
                  <audio autoPlay ref={remoteVideoRef} />
                  <Avatar user={call.peer} size={96} />
                </>
              )}
              {call.mode === "video" && (
                <video
                  autoPlay
                  className="call-local-video"
                  muted
                  playsInline
                  ref={localVideoRef}
                  style={{
                    position: "absolute",
                    right: "18px",
                    bottom: "18px",
                    width: "clamp(120px, 20vw, 220px)",
                    aspectRatio: "4/3",
                    border: "2px solid var(--cc-surface-raised)",
                    borderRadius: "10px",
                    background: "var(--cc-surface-soft)",
                    boxShadow: "var(--cc-shadow)",
                    objectFit: "cover",
                  }}
                />
              )}
              <div className="call-stage-copy" style={{
                position: "absolute",
                left: "50%",
                bottom: "24px",
                display: "grid",
                gap: "3px",
                maxWidth: "calc(100% - 48px)",
                padding: "10px 15px",
                border: "1px solid var(--cc-border)",
                borderRadius: "10px",
                background: "var(--cc-surface-raised)",
                boxShadow: "var(--cc-shadow-soft)",
                textAlign: "center",
                transform: "translateX(-50%)",
              }}>
                <strong style={{ overflow: "hidden", color: "var(--cc-text)", fontSize: "15px", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {call.peer?.name || "Campus member"}
                </strong>
                <span style={{ color: "var(--cc-muted)", fontSize: "12px" }}>
                  {call.status === "incoming"
                    ? `Incoming ${call.mode === "video" ? "video" : "voice"} call`
                    : call.status === "calling"
                      ? "Calling..."
                      : call.mode === "video"
                        ? "Video call"
                        : "Voice call"}
                </span>
              </div>
            </div>

            {call.status === "incoming" ? (
              <div className="call-stage-controls" style={{
                display: "flex",
                justifyContent: "center",
                gap: "10px",
                paddingTop: "18px",
              }}>
                <button className="call-control is-decline" onClick={declineCall} type="button" style={{
                  display: "inline-flex",
                  minWidth: "44px",
                  height: "44px",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "7px",
                  padding: "0 14px",
                  border: "1px solid transparent",
                  borderRadius: "999px",
                  background: "var(--cc-danger)",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 800,
                }}>
                  <FiPhoneOff />
                  Decline
                </button>
                <button className="call-control is-accept" onClick={acceptCall} type="button" style={{
                  display: "inline-flex",
                  minWidth: "44px",
                  height: "44px",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "7px",
                  padding: "0 14px",
                  border: "1px solid transparent",
                  borderRadius: "999px",
                  background: "var(--cc-primary)",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 800,
                }}>
                  {call.mode === "video" ? <FiVideo /> : <FiPhone />}
                  Accept
                </button>
              </div>
            ) : (
              <div className="call-stage-controls" style={{
                display: "flex",
                justifyContent: "center",
                gap: "10px",
                paddingTop: "18px",
              }}>
                <button
                  aria-label={call.muted ? "Turn microphone on" : "Mute microphone"}
                  className={`call-control ${call.muted ? "is-muted" : ""}`}
                  onClick={toggleMicrophone}
                  type="button"
                  style={{
                    display: "inline-flex",
                    minWidth: "44px",
                    height: "44px",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                    padding: "0 14px",
                    border: "1px solid var(--cc-border)",
                    borderRadius: "999px",
                    background: call.muted ? "var(--cc-warning-soft)" : "var(--cc-surface-soft)",
                    color: call.muted ? "var(--cc-warning)" : "var(--cc-text)",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 800,
                  }}
                >
                  {call.muted ? <FiMicOff /> : <FiMic />}
                </button>
                {call.mode === "video" && (
                  <button
                    aria-label={call.cameraOff ? "Turn camera on" : "Turn camera off"}
                    className={`call-control ${call.cameraOff ? "is-muted" : ""}`}
                    onClick={toggleCamera}
                    type="button"
                    style={{
                      display: "inline-flex",
                      minWidth: "44px",
                      height: "44px",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "7px",
                      padding: "0 14px",
                      border: "1px solid var(--cc-border)",
                      borderRadius: "999px",
                      background: call.cameraOff ? "var(--cc-warning-soft)" : "var(--cc-surface-soft)",
                      color: call.cameraOff ? "var(--cc-warning)" : "var(--cc-text)",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: 800,
                    }}
                  >
                    {call.cameraOff ? <FiVideoOff /> : <FiVideo />}
                  </button>
                )}
                <button aria-label="End call" className="call-control is-end" onClick={endCall} type="button" style={{
                  display: "inline-flex",
                  minWidth: "44px",
                  height: "44px",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "7px",
                  padding: "0 14px",
                  border: "1px solid transparent",
                  borderRadius: "999px",
                  background: "var(--cc-danger)",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 800,
                }}>
                  <FiPhoneOff />
                </button>
              </div>
            )}
          </section>
        )}
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div
              className="chat-panel-header"
              style={{
                padding: "12px 24px",
                borderBottom: "1px solid var(--cc-border)",
                background: "var(--cc-surface-raised)",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                height: "56px",
                flexShrink: 0,
                minHeight: "56px",
                zIndex: 10,
              }}
            >
              <button
                aria-label="Back to chats"
                className="chat-mobile-back"
                onClick={handleBackToChats}
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  minHeight: "38px",
                  padding: "8px 10px",
                  border: "1px solid var(--cc-border)",
                  borderRadius: "var(--cc-radius)",
                  background: "var(--cc-surface-soft)",
                  color: "var(--cc-text)",
                  fontSize: "13px",
                  fontWeight: 850,
                  cursor: "pointer",
                }}
              >
                <FiArrowLeft />
                <span>Chats</span>
              </button>
              <Avatar
                user={selectedUser}
                size={36}
                isOnline={onlineUserIds.has(String(selectedUser._id)) || chats.find((chat) => String(chat.user?._id) === String(selectedUser._id))?.isOnline}
                onClick={() => navigate(`/dashboard/user/${selectedUser._id}`)}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  onClick={() => navigate(`/dashboard/user/${selectedUser._id}`)}
                  style={{
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {selectedUser.name}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--cc-muted)",
                  }}
                >
                  {onlineUserIds.has(String(selectedUser._id)) ||
                  chats.find((chat) => String(chat.user?._id) === String(selectedUser._id))?.isOnline
                    ? "Online"
                    : "Offline"}
                </div>
              </div>
              <div className="chat-call-actions" style={{
                display: "inline-flex",
                gap: "7px",
              }}>
                <button
                  aria-label={`Start voice call with ${selectedUser.name}`}
                  className="chat-tool-button"
                  disabled={Boolean(call)}
                  onClick={() => startCall("audio")}
                  title="Voice call"
                  type="button"
                  style={{
                    display: "inline-grid",
                    width: "34px",
                    height: "34px",
                    placeItems: "center",
                    border: "1px solid var(--cc-border)",
                    borderRadius: "50%",
                    background: "var(--cc-surface-soft)",
                    color: "var(--cc-muted-strong)",
                    cursor: "pointer",
                    transition: "background 160ms ease, color 160ms ease, border-color 160ms ease",
                  }}
                >
                  <FiPhone />
                </button>
                <button
                  aria-label={`Start video call with ${selectedUser.name}`}
                  className="chat-tool-button"
                  disabled={Boolean(call)}
                  onClick={() => startCall("video")}
                  title="Video call"
                  type="button"
                  style={{
                    display: "inline-grid",
                    width: "34px",
                    height: "34px",
                    placeItems: "center",
                    border: "1px solid var(--cc-border)",
                    borderRadius: "50%",
                    background: "var(--cc-surface-soft)",
                    color: "var(--cc-muted-strong)",
                    cursor: "pointer",
                    transition: "background 160ms ease, color 160ms ease, border-color 160ms ease",
                  }}
                >
                  <FiVideo />
                </button>
              </div>
              <div className="chat-header-actions" style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
              }}>
                <button
                  aria-label="Chat options"
                  className="chat-tool-button"
                  onClick={() => setShowChatActions((open) => !open)}
                  type="button"
                  style={{
                    display: "inline-grid",
                    width: "34px",
                    height: "34px",
                    placeItems: "center",
                    border: "1px solid var(--cc-border)",
                    borderRadius: "50%",
                    background: "var(--cc-surface-soft)",
                    color: "var(--cc-muted-strong)",
                    cursor: "pointer",
                    transition: "background 160ms ease, color 160ms ease, border-color 160ms ease",
                  }}
                >
                  <FiMoreVertical />
                </button>
                {showChatActions && (
                  <button
                    className="chat-clear-button"
                    onClick={async () => {
                      if (!room || !window.confirm("Clear this chat from your view?")) return;
                      await clearChatForMe(room._id);
                      setMessages([]);
                      setChats((current) =>
                        current.filter((chat) => String(chat.roomId) !== String(room._id)),
                      );
                      setShowChatActions(false);
                      refreshChats({ silent: true });
                      notifyChatCounters();
                    }}
                    type="button"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      zIndex: 12,
                      width: "max-content",
                      padding: "9px 12px",
                      border: "1px solid var(--cc-border)",
                      borderRadius: "8px",
                      background: "var(--cc-surface-raised)",
                      color: "var(--cc-danger)",
                      boxShadow: "var(--cc-shadow)",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: 750,
                    }}
                  >
                    Clear chat
                  </button>
                )}
              </div>
            </div>

            {/* Messages Container */}
            <div
              className="chat-messages"
              ref={messagesContainerRef}
              onScroll={async (e) => {
                const container = e.currentTarget;
                const nearBottom =
                  container.scrollHeight -
                    container.scrollTop -
                    container.clientHeight <
                  180;

                if (nearBottom && hasNewMessageRef.current) {
                  hasNewMessageRef.current = false;
                  setShowUnread(false);
                }

                if (
                  e.currentTarget.scrollTop > 50 ||
                  loadingOld ||
                  !hasMore ||
                  !room
                ) {
                  return;
                }

                try {
                  setLoadingOld(true);
                  const oldHeight = e.currentTarget.scrollHeight;
                  const next = pageRef.current + 1;
                  const res = await getMessages(room._id, next);

                  if (res.messages?.length) {
                    setMessages((prev) => {
                      const ids = new Set(prev.map((m) => m._id));
                      return [
                        ...getVisibleMessages(res.messages).filter((m) => !ids.has(m._id)),
                        ...prev,
                      ];
                    });
                    pageRef.current = next;
                    requestAnimationFrame(() => {
                      if (messagesContainerRef.current) {
                        const newHeight = messagesContainerRef.current.scrollHeight;
                        messagesContainerRef.current.scrollTop = newHeight - oldHeight;
                      }
                    });
                  }
                  setHasMore(res.hasMore);
                } catch (err) {
                  console.log(err);
                } finally {
                  setLoadingOld(false);
                }
              }}
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                padding: "16px 20px",
                background: "var(--cc-surface-soft)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {loadingOld && (
                <div
                  className="chat-loading-old"
                  style={{
                    textAlign: "center",
                    color: "var(--cc-muted)",
                    fontSize: "12px",
                    padding: "8px",
                  }}
                >
                  Loading older messages...
                </div>
              )}

              {loadingMessages ? (
                <div className="chat-loading-state" style={{
                  display: "grid",
                  justifyItems: "center",
                  gap: "8px",
                  margin: "auto",
                  padding: "28px",
                  color: "var(--cc-muted)",
                  textAlign: "center",
                }}>
                  <span className="chat-spinner" style={{
                    width: "34px",
                    height: "34px",
                    border: "3px solid var(--cc-border)",
                    borderTopColor: "var(--cc-primary)",
                    borderRadius: "999px",
                    animation: "cc-spin 700ms linear infinite",
                  }} />
                  <strong style={{ color: "var(--cc-text)", fontSize: "15px" }}>Loading conversation</strong>
                  <small style={{ color: "var(--cc-muted)" }}>Getting the latest messages...</small>
                </div>
              ) : messages.length === 0 ? (
                <div
                  className="chat-empty-state"
                  style={{
                    margin: "auto",
                    textAlign: "center",
                    color: "var(--cc-muted)",
                    fontSize: "14px",
                  }}
                >
                  No messages yet. Say hello! 👋
                </div>
              ) : (
                <>
                  {(() => {
                    const currentChat = chats.find(
                      (c) => String(c.roomId) === String(room?._id),
                    );

                    const unreadCount = showUnread
                      ? currentChat?.unreadCount || 0
                      : 0;

                    const firstUnreadIndex =
                      showUnread && unreadCount > 0
                        ? Math.max(messages.length - unreadCount, 0)
                        : -1;

                    return messages.map((msg, index) => {
                      const senderId = msg.sender?._id || msg.sender;
                      const isMe =
                        String(senderId) === String(currentUser?._id);
                      const isMobileActionOpen =
                        activeMobileActionMessageId === msg._id;
                      const hasMedia = Boolean(
                        msg.attachmentPreviews?.length || msg.attachments?.length,
                      );
                      const isMediaOnly = hasMedia && !msg.content?.trim();

                      const currentDate = new Date(msg.createdAt);
                      const previousDate =
                        index > 0
                          ? new Date(messages[index - 1].createdAt)
                          : null;

                      const showDate =
                        !previousDate ||
                        currentDate.toDateString() !==
                          previousDate.toDateString();

                      const getDateLabel = (date) => {
                        const today = new Date();
                        const yesterday = new Date();
                        yesterday.setDate(today.getDate() - 1);

                        if (date.toDateString() === today.toDateString()) {
                          return "Today";
                        }
                        if (date.toDateString() === yesterday.toDateString()) {
                          return "Yesterday";
                        }
                        return date.toLocaleDateString([], {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        });
                      };

                      return (
                        <div key={msg._id}>
                          {showDate && (
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "center",
                                margin: "14px 0",
                              }}
                            >
                              <div
                                style={{
                                  background: "var(--cc-surface-raised)",
                                  border: "1px solid var(--cc-border)",
                                  padding: "6px 14px",
                                  borderRadius: "999px",
                                  fontSize: "12px",
                                  color: "var(--cc-muted-strong)",
                                  fontWeight: 600,
                                }}
                              >
                                {getDateLabel(currentDate)}
                              </div>
                            </div>
                          )}

                          {firstUnreadIndex === index && (
                            <div ref={unreadAnchorRef}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  margin: "12px 0",
                                }}
                              >
                                <div
                                  style={{
                                    flex: 1,
                                    height: "1px",
                                    background: "var(--cc-primary)",
                                  }}
                                />
                                <div
                                  style={{
                                    color: "var(--cc-primary)",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                  }}
                                >
                                  UNREAD
                                </div>
                                <div
                                  style={{
                                    flex: 1,
                                    height: "1px",
                                    background: "var(--cc-primary)",
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          <div
                            ref={(el) => {
                              if (el) {
                                messageRefs.current[msg._id] = el;
                              }
                            }}
                            style={{
                              display: "flex",
                              justifyContent: isMe ? "flex-end" : "flex-start",
                              marginBottom: "4px",
                              padding: "2px 0",
                            }}
                          >
                            <div
                              className="chat-message-row-inner"
                              style={{
                                display: "flex",
                                flexDirection: isMe ? "row-reverse" : "row",
                                alignItems: "flex-end",
                                gap: "4px",
                                maxWidth: "75%",
                                position: "relative",
                              }}
                            >
                              {/* Message Bubble */}
                              <div
                                className={`chat-message-bubble ${isMe ? "is-me" : "is-them"} ${hasMedia ? "has-media" : ""} ${isMediaOnly ? "is-media-only" : ""}`}
                                onContextMenu={(e) => handleMessageContextMenu(e, msg._id)}
                                onPointerCancel={clearLongPressTimer}
                                onPointerDown={(e) => handleMessagePointerDown(e, msg._id)}
                                onPointerLeave={clearLongPressTimer}
                                onPointerUp={clearLongPressTimer}
                                style={{
                                  padding: "8px 14px",
                                  background: isMe
                                    ? "var(--cc-message-sent-bg)"
                                    : "var(--cc-surface)",
                                  color: isMe ? "var(--cc-message-sent-text)" : "var(--cc-text)",
                                  borderRadius: "18px",
                                  borderBottomRightRadius: isMe
                                    ? "4px"
                                    : "18px",
                                  borderBottomLeftRadius: isMe ? "18px" : "4px",
                                  boxShadow: isMe
                                    ? "none"
                                    : "var(--cc-shadow-soft)",
                                  border: isMe
                                    ? "1px solid transparent"
                                    : "1px solid var(--cc-border)",
                                  maxWidth: "100%",
                                  position: "relative",
                                  wordBreak: "break-word",
                                }}
                              >
                                {msg.replyTo && (
                                  <button
                                    className="chat-reply-snippet"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      scrollToMessage(msg.replyTo._id);
                                    }}
                                    type="button"
                                  >
                                    <ReplyPreview msg={msg.replyTo} />
                                  </button>
                                )}

                                <div>{msg.content}</div>

                                <MessageMedia msg={msg} />

                                {msg.reactions?.length > 0 && (
                                  <div className="chat-message-reactions" style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "4px",
                                    marginTop: "7px",
                                  }}>
                                    {[...new Set(msg.reactions.map((reaction) => reaction.emoji))].map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMessageReaction(msg._id, emoji);
                                        }}
                                        type="button"
                                        style={{
                                          padding: "2px 8px",
                                          border: "1px solid var(--cc-border)",
                                          borderRadius: "999px",
                                          background: "var(--cc-surface-raised)",
                                          color: "var(--cc-text)",
                                          fontSize: "12px",
                                          cursor: "pointer",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "3px",
                                        }}
                                      >
                                        {emoji} {msg.reactions.filter((reaction) => reaction.emoji === emoji).length}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                <div
                                  style={{
                                    fontSize: "10px",
                                    marginTop: "4px",
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    gap: "3px",
                                    alignItems: "center",
                                  }}
                                >
                                  {formatTime(msg.createdAt)}
                                  {isMe && <span>{renderStatus(msg)}</span>}
                                </div>
                              </div>

                              {/* Vertical Dots Menu */}
                              <div
                                className={`message-actions-wrapper ${isMe ? "is-me" : "is-them"}`}
                                style={{
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "flex-end",
                                  paddingBottom: "4px",
                                  ...(isMobileActionOpen
                                    ? {
                                        position: "absolute",
                                        left: "50%",
                                        bottom: "calc(100% + 6px)",
                                        zIndex: 20,
                                        transform: "translateX(-50%)",
                                      }
                                    : {}),
                                }}
                                onMouseEnter={(e) => {
                                  const btn = e.currentTarget.querySelector('button');
                                  if (btn) {
                                    btn.style.opacity = "1";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  const btn = e.currentTarget.querySelector('button');
                                  if (btn && !btn.classList.contains('is-open')) {
                                    btn.style.opacity = "0";
                                  }
                                }}
                              >
                                <MessageActionsMenu
                                  msg={msg}
                                  isMe={isMe}
                                  forcedOpen={isMobileActionOpen}
                                  onClose={() => setActiveMobileActionMessageId(null)}
                                  onReply={handleReplyClick}
                                  onDelete={handleMessageDelete}
                                  onForward={handleForwardClick}
                                  onReact={handleMessageReaction}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Section - Composer */}
            <div
              className="chat-composer-shell"
              style={{
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                background: "var(--cc-surface-raised)",
                borderTop: "1px solid var(--cc-border)",
              }}
            >
              {typing && (
                <div
                  className="chat-typing"
                  style={{
                    padding: "2px 24px",
                    paddingBottom: "0px",
                    color: "var(--cc-primary)",
                    fontSize: "12px",
                    fontStyle: "italic",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    minHeight: "20px",
                    background: "var(--cc-surface-raised)",
                  }}
                >
                  <span style={{ display: "inline-block", animation: "pulse 1.4s ease-in-out infinite" }}>●</span>
                  <span>{typing} typing...</span>
                </div>
              )}

              {replyTo && (
                <div className="chat-reply-preview">
                  <div className="chat-reply-preview-content">
                    <span className="chat-reply-preview-icon">↩</span>
                    <ReplyPreview msg={replyTo} prefix="Replying to" />
                  </div>
                  <button
                    onClick={() => setReplyTo(null)}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "18px",
                      cursor: "pointer",
                      color: "var(--cc-muted)",
                      padding: "0 8px",
                      fontWeight: 300,
                      transition: "color 0.2s ease",
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--cc-text)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--cc-muted)";
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              {(attachments.length > 0 || attachmentError) && (
                <div className="chat-attachment-preview" style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  padding: "10px 24px 0",
                  background: "var(--cc-surface-raised)",
                }}>
                  {attachments.map((item, index) => (
                    <span className="chat-attachment-chip" key={item.id}>
                      <span className="chat-attachment-thumb">
                        {item.type.startsWith("video/") ? (
                          <video muted playsInline preload="metadata" src={item.previewUrl} />
                        ) : (
                          <img alt={item.name} src={item.previewUrl} />
                        )}
                      </span>
                      <span className="chat-attachment-meta">
                        <span>
                          {item.type.startsWith("video/") ? <FiVideo /> : <FiImage />}
                          {item.type.startsWith("video/") ? "Video" : "Image"}
                        </span>
                        <strong>{item.name}</strong>
                        <small>{formatFileSize(item.size)}</small>
                      </span>
                      <button
                        aria-label={`Remove ${item.name}`}
                        disabled={sendingMessage}
                        onClick={() =>
                          setAttachments((files) => {
                            revokeAttachmentPreviews(files[index] ? [files[index]] : []);
                            return files.filter((_, itemIndex) => itemIndex !== index);
                          })
                        }
                        type="button"
                        style={{
                          display: "inline-grid",
                          width: "18px",
                          height: "18px",
                          flex: "0 0 auto",
                          placeItems: "center",
                          border: "none",
                          borderRadius: "50%",
                          background: "transparent",
                          color: "var(--cc-muted)",
                          cursor: "pointer",
                        }}
                      >
                        <FiX />
                      </button>
                    </span>
                  ))}
                  {attachmentError && (
                    <p className="chat-attachment-error">{attachmentError}</p>
                  )}
                </div>
              )}

              <div
                className="chat-input-row"
                style={{
                  padding: "8px 24px",
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                  minHeight: "48px",
                  background: "var(--cc-surface-raised)",
                }}
              >
                <input
                  accept="image/*,video/mp4,video/webm,video/quicktime"
                  hidden
                  multiple
                  onChange={handleAttachmentChange}
                  ref={attachmentInputRef}
                  type="file"
                />
                <button
                  aria-label="Attach image or video"
                  className="chat-tool-button"
                  disabled={composerDisabled}
                  onClick={() => attachmentInputRef.current?.click()}
                  type="button"
                  style={{
                    display: "inline-grid",
                    width: "34px",
                    height: "34px",
                    placeItems: "center",
                    border: "1px solid var(--cc-border)",
                    borderRadius: "50%",
                    background: "var(--cc-surface-soft)",
                    color: "var(--cc-muted-strong)",
                    cursor: composerDisabled ? "not-allowed" : "pointer",
                    opacity: composerDisabled ? 0.55 : 1,
                    transition: "background 160ms ease, color 160ms ease, border-color 160ms ease",
                  }}
                >
                  <FiPaperclip />
                </button>

                <input
                  className="chat-message-input"
                  value={message}
                  disabled={composerDisabled}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (room) {
                      socket.emit("typing", {
                        roomId: room._id,
                        user: currentUser?.name,
                      });
                      clearTimeout(window.typing);
                      window.typing = setTimeout(() => {
                        socket.emit("stop_typing", room._id);
                      }, 1000);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  onPaste={handleMessagePaste}
                  placeholder={loadingMessages ? "Loading conversation..." : sendingMessage ? "Sending..." : replyTo ? "Type your reply..." : "Type a message..."}
                  style={{
                    flex: 1,
                    padding: "8px 16px",
                    border: "1px solid var(--cc-border)",
                    borderRadius: "24px",
                    fontSize: "14px",
                    outline: "none",
                    background: "var(--cc-surface-soft)",
                    color: "var(--cc-text)",
                    transition: "all 0.2s ease",
                    minWidth: 0,
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--cc-primary)";
                    e.target.style.background = "var(--cc-surface)";
                    e.target.style.boxShadow = "0 0 0 4px rgba(15,118,110,0.13)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--cc-border)";
                    e.target.style.background = "var(--cc-surface-soft)";
                    e.target.style.boxShadow = "none";
                  }}
                />

                <button
                  className="chat-send-button"
                  onClick={handleSend}
                  disabled={!canSendMessage}
                  style={{
                    padding: "6px 18px",
                    background: canSendMessage
                      ? "var(--cc-primary)"
                      : "var(--cc-primary-soft)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "24px",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: canSendMessage
                      ? "pointer"
                      : "not-allowed",
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                    boxShadow: canSendMessage
                      ? "0 10px 18px rgba(15,118,110,0.18)"
                      : "none",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (canSendMessage) {
                      e.currentTarget.style.background = "var(--cc-primary-dark)";
                      e.currentTarget.style.transform = "scale(1.02)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (canSendMessage) {
                      e.currentTarget.style.background = "var(--cc-primary)";
                      e.currentTarget.style.transform = "scale(1)";
                    }
                  }}
                >
                  {sendingMessage ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div
            className="chat-empty-state chat-empty-state-main"
            style={{
              margin: "auto",
              textAlign: "center",
              color: "var(--cc-muted)",
              fontSize: "16px",
              padding: "20px",
            }}
          >
            <div
              className="chat-empty-icon"
              style={{
                width: "58px",
                height: "58px",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
                borderRadius: "18px",
                background: "linear-gradient(135deg, var(--cc-primary), var(--cc-accent))",
                color: "#ffffff",
                fontSize: "18px",
                fontWeight: 900,
                boxShadow: "var(--cc-shadow-soft)",
              }}
            >
              CC
            </div>
            <div
              style={{
                fontWeight: 600,
                color: "var(--cc-text)",
                fontSize: "18px",
                marginBottom: "8px",
              }}
            >
              Select a chat
            </div>
            <div
              style={{
                fontSize: "14px",
              }}
            >
              Choose someone from your connections to start messaging
            </div>
          </div>
        )}
      </div>
      {forwardMessage && (
        <div
          className="chat-forward-backdrop"
          onClick={closeForwardPanel}
          role="presentation"
        >
          <div
            className="chat-forward-panel"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Forward message"
          >
            <div className="chat-forward-header">
              <strong>Forward message</strong>
              <button aria-label="Close forward panel" onClick={closeForwardPanel} type="button">
                <FiX />
              </button>
            </div>
            <div className="chat-forward-preview">
              <span>{forwardPreviewText}</span>
              {forwardMessage.attachments?.length > 0 && (
                <small>{forwardMessage.attachments.length} media</small>
              )}
            </div>
            <input
              className="chat-forward-search"
              value={forwardSearch}
              onChange={(event) => setForwardSearch(event.target.value)}
              placeholder="Search people"
            />
            <div className="chat-forward-count">
              <span>{forwardTargets.length}/{MAX_FORWARD_TARGETS} selected</span>
              <small>Select up to {MAX_FORWARD_TARGETS}</small>
            </div>
            {forwardTargets.length > 0 && (
              <div className="chat-forward-selected">
                {forwardTargets.map((target) => (
                  <button
                    key={target.key}
                    onClick={() => toggleForwardTarget(target)}
                    type="button"
                  >
                    {target.user?.name}
                    <FiX size={13} />
                  </button>
                ))}
              </div>
            )}
            <div className="chat-forward-list">
              {forwardChatTargets.map((chat) => {
                const targetKey = getForwardTargetKey(chat);
                const isSelected = selectedForwardKeys.has(targetKey);
                const isDisabled =
                  forwardingMessage ||
                  (!isSelected && forwardTargets.length >= MAX_FORWARD_TARGETS);

                return (
                  <button
                    className={isSelected ? "is-selected" : ""}
                    disabled={isDisabled}
                    key={chat.roomId}
                    onClick={() => toggleForwardTarget(chat)}
                    type="button"
                  >
                    <Avatar user={chat.user} size={34} />
                    <span>{chat.user?.name}</span>
                    <small>{isSelected ? "Selected" : "Tap to select"}</small>
                  </button>
                );
              })}
              {forwardSearchTargets.map((user) => {
                const targetKey = getForwardTargetKey(user);
                const isSelected = selectedForwardKeys.has(targetKey);
                const isDisabled =
                  forwardingMessage ||
                  (!isSelected && forwardTargets.length >= MAX_FORWARD_TARGETS);

                return (
                  <button
                    className={isSelected ? "is-selected" : ""}
                    disabled={isDisabled}
                    key={user._id}
                    onClick={() => toggleForwardTarget({ user })}
                    type="button"
                  >
                    <Avatar user={user} size={34} />
                    <span>{user.name}</span>
                    <small>{isSelected ? "Selected" : "Tap to select"}</small>
                  </button>
                );
              })}
              {!visibleForwardTargetsCount && (
                <p>No people found</p>
              )}
            </div>
            <div className="chat-forward-footer">
              <button
                className="is-secondary"
                disabled={forwardingMessage}
                onClick={closeForwardPanel}
                type="button"
              >
                Cancel
              </button>
              <button
                className="is-primary"
                disabled={forwardingMessage || forwardTargets.length === 0}
                onClick={handleForwardSend}
                type="button"
              >
                {forwardingMessage ? "Sending..." : `Send (${forwardTargets.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
