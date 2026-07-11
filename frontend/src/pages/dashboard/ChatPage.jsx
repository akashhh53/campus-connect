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
  FiMic,
  FiMicOff,
  FiMoreHorizontal,
  FiPaperclip,
  FiPhone,
  FiPhoneOff,
  FiSmile,
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
  const [typing, setTyping] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [showUnread, setShowUnread] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set());
  const [attachments, setAttachments] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showChatActions, setShowChatActions] = useState(false);
  const [reactionTarget, setReactionTarget] = useState(null);
  const [reactionDraft, setReactionDraft] = useState("");
  const [activeTab, setActiveTab] = useState("chats");
  const [call, setCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callHistory, setCallHistory] = useState(() => {
    const userId = JSON.parse(localStorage.getItem("userInfo") || "null")?.user?._id;
    if (!userId) return [];
    return JSON.parse(localStorage.getItem(`cc:call-history:${userId}`) || "[]");
  });
  const messagesEndRef = useRef(null);
  const messageRefs = useRef({});
  const messagesContainerRef = useRef(null);
  const [search, setSearch] = useState("");
  const [searchUsers, setSearchUsers] = useState([]);
  const navigate = useNavigate();

  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem("userInfo"))?.user;

  // ===== REF FOR PAGE TO PREVENT STALE CLOSURES =====
  const pageRef = useRef(1);
  const firstLoad = useRef(true);
  const hasNewMessageRef = useRef(false);
  const unreadAnchorRef = useRef(null);
  const openChatRequestRef = useRef(0);
  const attachmentInputRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

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

  // ===== MESSAGE STATUS LISTENER =====
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
  // ===== END MESSAGE STATUS LISTENER =====

  useEffect(() => {
    const applyDeletedMessage = ({ messageId, roomId }) => {
      if (String(roomId) !== String(room?._id)) return;
      setMessages((current) =>
        current.map((item) =>
          item._id === messageId
            ? {
                ...item,
                isDeleted: true,
                content: "This message was deleted.",
                attachments: [],
                reactions: [],
              }
            : item,
        ),
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

  // ===== REAL-TIME MESSAGE LISTENER =====
  useEffect(() => {
    const receive = (msg) => {
      clearChatCache(msg.chatRoomId);

      // Refresh chats from backend instead of local math
      setTimeout(() => {
        refreshChats({ silent: true });
        notifyChatCounters();
      }, 150);

      // Only add to messages if it's the current room
      if (String(msg.chatRoomId) === String(room?._id)) {
        // ===== CHECK IF USER IS NEAR BOTTOM =====
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

        setMessages((prev) => {
          const exists = prev.some((m) => m._id === msg._id);
          if (exists) return prev;
          return [...prev, msg];
        });

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
  // ===== END REAL-TIME MESSAGE LISTENER =====

  // ===== TYPING INDICATOR LISTENER =====
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
  // ===== END TYPING INDICATOR LISTENER =====

  // ===== AUTO SCROLL BOTTOM =====
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

      // Reset pageRef
      pageRef.current = 1;

      const cachedHistory = getCachedMessages(res.room._id, 1);

      if (cachedHistory) {
        setMessages(cachedHistory.messages ?? []);
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

      setMessages(history.messages ?? []);
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

      // ===== Disable firstLoad effect for initial open =====
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
  // ===== END SCROLL TO MESSAGE =====

  // ===== HANDLE REPLY CLICK =====
  const handleReplyClick = (msg) => {
    if (replyTo?._id === msg._id) {
      setReplyTo(null);
      return;
    }
    setReplyTo(msg);
  };
  // ===== END HANDLE REPLY CLICK =====

  // ===== HANDLE SEND =====
  const handleSend = async () => {
    if ((!message.trim() && attachments.length === 0) || !room || loadingMessages) return;

    try {
      await sendMessage({
        roomId: room._id,
        content: message,
        replyTo: replyTo?._id,
        attachments,
      });

      setMessage("");
      setReplyTo(null);
      setAttachments([]);
      setShowEmojiPicker(false);

      // Stop typing indicator
      socket.emit("stop_typing", room._id);
    } catch (err) {
      console.log(err);
    }
  };
  // ===== END HANDLE SEND =====

  const handleAttachmentChange = (event) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(
      (file) =>
        (file.type.startsWith("image/") || file.type.startsWith("video/")) &&
        file.size <= 30 * 1024 * 1024,
    );
    setAttachments(validFiles);
    event.target.value = "";
  };

  const handleMessageDelete = async (messageId) => {
    if (!window.confirm("Delete this message for everyone?")) return;
    try {
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

  const submitCustomReaction = async () => {
    if (!reactionTarget || !reactionDraft.trim()) return;
    await handleMessageReaction(reactionTarget, reactionDraft.trim());
    setReactionTarget(null);
    setReactionDraft("");
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Function to render message status
  const renderStatus = (msg) => {
    const senderId = msg.sender?._id || msg.sender;
    if (String(senderId) !== String(currentUser?._id)) return null;

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
        const next = [entry, ...current].slice(0, 30);
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

  return (
    <div
      className={`chat-page ${selectedUser || call ? "has-active-chat" : "is-chat-list"}`}
      style={{
        display: "flex",
        height: "calc(100vh - 70px)",
        width: "100%",
        background: "var(--cc-bg)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
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
                <div className="chat-list-item call-history-item" key={entry.id}>
                  <Avatar user={entry.peer} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="chat-user-name">{entry.peer?.name || "Campus member"}</div>
                    <div className="chat-last-message">
                      {entry.status === "missed" ? "Missed" : entry.direction === "incoming" ? "Incoming" : "Outgoing"} {entry.mode === "video" ? "video" : "voice"} call
                    </div>
                  </div>
                  <span className={`call-history-status is-${entry.status}`}>
                    {entry.mode === "video" ? <FiVideo /> : <FiPhone />}
                  </span>
                </div>
              ))
            ) : (
              <div className="chat-empty-small call-empty">
                <FiPhone />
                <strong>No calls yet</strong>
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
                    <div>{user.name}</div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--cc-muted)",
                      }}
                    >
                      Start new chat
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
                }}
              >
                No users found
              </div>
            )
          ) : loadingChats ? (
            <div className="chat-skeleton-list" aria-label="Loading chats">
              {[1, 2, 3, 4, 5].map((item) => (
                <div className="chat-skeleton-row" key={item}>
                  <span className="chat-skeleton-avatar" />
                  <span className="chat-skeleton-lines">
                    <span className="chat-skeleton-line is-title" />
                    <span className="chat-skeleton-line" />
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
              }}
            >
              No chats yet. Search someone to start a conversation.
            </div>
          ) : (
            chats.map((chat) => (
              <div
                className={`chat-list-item ${
                  String(selectedUser?._id) === String(chat.user?._id)
                    ? "is-active"
                    : ""
                }`}
                key={chat.roomId}
                onClick={() => handleOpenChat(chat.user)}
                style={{
                  display: "flex",
                  gap: "12px",
                  padding: "14px",
                  cursor: "pointer",
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
          <section className={`chat-call-stage ${call.mode === "video" ? "is-video" : "is-audio"}`}>
            <div className="call-stage-main">
              {call.mode === "video" ? (
                <video
                  autoPlay
                  className="call-remote-video"
                  playsInline
                  ref={remoteVideoRef}
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
                />
              )}
              <div className="call-stage-copy">
                <strong>{call.peer?.name || "Campus member"}</strong>
                <span>
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
              <div className="call-stage-controls">
                <button className="call-control is-decline" onClick={declineCall} type="button">
                  <FiPhoneOff />
                  Decline
                </button>
                <button className="call-control is-accept" onClick={acceptCall} type="button">
                  {call.mode === "video" ? <FiVideo /> : <FiPhone />}
                  Accept
                </button>
              </div>
            ) : (
              <div className="call-stage-controls">
                <button
                  aria-label={call.muted ? "Turn microphone on" : "Mute microphone"}
                  className={`call-control ${call.muted ? "is-muted" : ""}`}
                  onClick={toggleMicrophone}
                  type="button"
                >
                  {call.muted ? <FiMicOff /> : <FiMic />}
                </button>
                {call.mode === "video" && (
                  <button
                    aria-label={call.cameraOff ? "Turn camera on" : "Turn camera off"}
                    className={`call-control ${call.cameraOff ? "is-muted" : ""}`}
                    onClick={toggleCamera}
                    type="button"
                  >
                    {call.cameraOff ? <FiVideoOff /> : <FiVideo />}
                  </button>
                )}
                <button aria-label="End call" className="call-control is-end" onClick={endCall} type="button">
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
                  onClick={() =>
                    navigate(`/dashboard/user/${selectedUser._id}`)
                  }
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
              <div className="chat-call-actions">
                <button
                  aria-label={`Start voice call with ${selectedUser.name}`}
                  className="chat-tool-button"
                  disabled={Boolean(call)}
                  onClick={() => startCall("audio")}
                  title="Voice call"
                  type="button"
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
                >
                  <FiVideo />
                </button>
              </div>
              <div className="chat-header-actions">
                <button
                  aria-label="Chat options"
                  className="chat-tool-button"
                  onClick={() => setShowChatActions((open) => !open)}
                  type="button"
                >
                  <FiMoreHorizontal />
                </button>
                {showChatActions && (
                  <button
                    className="chat-clear-button"
                    onClick={async () => {
                      if (!room || !window.confirm("Clear this chat from your view?")) return;
                      await clearChatForMe(room._id);
                      setMessages([]);
                      setShowChatActions(false);
                      notifyChatCounters();
                    }}
                    type="button"
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

                // ===== HIDE UNREAD WHEN SCROLLING TO BOTTOM =====
                if (nearBottom && hasNewMessageRef.current) {
                  hasNewMessageRef.current = false;
                  setShowUnread(false);
                }

                // Load older messages when scrolled to top
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

                  // Save current scroll height before prepending
                  const oldHeight = e.currentTarget.scrollHeight;

                  // Use pageRef to prevent stale page values
                  const next = pageRef.current + 1;
                  const res = await getMessages(room._id, next);

                  if (res.messages?.length) {
                    // Deduplicate messages to prevent duplicates
                    setMessages((prev) => {
                      const ids = new Set(prev.map((m) => m._id));
                      return [
                        ...res.messages.filter((m) => !ids.has(m._id)),
                        ...prev,
                      ];
                    });

                    // Only update pageRef if messages were returned
                    pageRef.current = next;

                    // Preserve scroll position after messages are added
                    requestAnimationFrame(() => {
                      if (messagesContainerRef.current) {
                        const newHeight =
                          messagesContainerRef.current.scrollHeight;
                        messagesContainerRef.current.scrollTop =
                          newHeight - oldHeight;
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
                <div className="chat-loading-state">
                  <span className="chat-spinner" />
                  <strong>Loading conversation</strong>
                  <small>Getting the latest messages...</small>
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
                    // ===== UNREAD LOGIC =====
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
                      const isReplying = replyTo?._id === msg._id;

                      // DATE GROUPING
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
                              style={{
                                display: "flex",
                                flexDirection: isMe ? "row" : "row-reverse",
                                alignItems: "center",
                                gap: "4px",
                                maxWidth: "70%",
                              }}
                            >
                              {/* Reply Icon - hidden by default, shows on hover over message bubble */}
                              <div
                                className="reply-icon"
                                onClick={() => handleReplyClick(msg)}
                                style={{
                                  fontSize: "16px",
                                  color: isReplying
                                    ? "var(--cc-primary)"
                                    : "var(--cc-muted)",
                                  cursor: "pointer",
                                  opacity: isReplying ? 1 : 0,
                                  width: "26px",
                                  transition: "opacity 0.2s ease",
                                  flexShrink: 0,
                                }}
                              >
                                ↩
                              </div>

                              {/* Message Bubble - hover events directly on bubble */}
                              <div
                                className={`chat-message-bubble ${
                                  isMe ? "is-me" : "is-them"
                                }`}
                                onClick={() => {
                                  if (isReplying) {
                                    setReplyTo(null);
                                  } else {
                                    handleReplyClick(msg);
                                  }
                                }}
                                onMouseEnter={(e) => {
                                  // Show reply icon when hovering over message bubble
                                  const replyIcon =
                                    e.currentTarget.parentElement.querySelector(
                                      ".reply-icon",
                                    );
                                  if (replyIcon && !isReplying) {
                                    replyIcon.style.opacity = "1";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  // Hide reply icon when not hovering, unless it's selected
                                  const replyIcon =
                                    e.currentTarget.parentElement.querySelector(
                                      ".reply-icon",
                                    );
                                  if (replyIcon && !isReplying) {
                                    replyIcon.style.opacity = "0";
                                  }
                                }}
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
                                  cursor: "pointer",
                                }}
                              >
                                {msg.replyTo && (
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      scrollToMessage(msg.replyTo._id);
                                    }}
                                    style={{
                                      fontSize: "12px",
                                      marginBottom: "6px",
                                      padding: "4px 10px",
                                      borderLeft: "3px solid var(--cc-primary)",
                                      background: isMe
                                        ? "rgba(255,255,255,.14)"
                                        : "var(--cc-surface-soft)",
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    {msg.replyTo?.content}
                                  </div>
                                )}

                                <div>{msg.content}</div>

                                {msg.attachments?.length > 0 && (
                                  <div className="chat-message-media">
                                    {msg.attachments.map((attachment) =>
                                      /\.(mp4|webm|mov)(?:\?|$)/i.test(attachment) ? (
                                        <video controls key={attachment} preload="metadata" src={attachment} />
                                      ) : (
                                        <img alt="Message attachment" key={attachment} src={attachment} />
                                      ),
                                    )}
                                  </div>
                                )}

                                {!msg.isDeleted && (
                                  <div className="chat-message-actions">
                                    {["👍", "❤️", "😂"].map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleMessageReaction(msg._id, emoji);
                                        }}
                                        type="button"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                    <button
                                      aria-label="Choose any emoji reaction"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setReactionTarget(msg._id);
                                        setReactionDraft("");
                                      }}
                                      type="button"
                                    >
                                      <FiSmile />
                                    </button>
                                    {isMe && (
                                      <button
                                        aria-label="Delete message"
                                        className="is-delete"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleMessageDelete(msg._id);
                                        }}
                                        type="button"
                                      >
                                        <FiTrash2 />
                                      </button>
                                    )}
                                  </div>
                                )}

                                {msg.reactions?.length > 0 && (
                                  <div className="chat-message-reactions">
                                    {[...new Set(msg.reactions.map((reaction) => reaction.emoji))].map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleMessageReaction(msg._id, emoji);
                                        }}
                                        type="button"
                                      >
                                        {emoji} {msg.reactions.filter((reaction) => reaction.emoji === emoji).length}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {reactionTarget === msg._id && (
                                  <div
                                    className="chat-custom-reaction"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    <input
                                      autoFocus
                                      inputMode="text"
                                      maxLength="32"
                                      onChange={(event) => setReactionDraft(event.target.value)}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                          event.preventDefault();
                                          submitCustomReaction();
                                        }
                                      }}
                                      placeholder="Add emoji"
                                      value={reactionDraft}
                                    />
                                    <button onClick={submitCustomReaction} type="button">
                                      Add
                                    </button>
                                    <button
                                      aria-label="Close emoji reaction picker"
                                      onClick={() => setReactionTarget(null)}
                                      type="button"
                                    >
                                      <FiX />
                                    </button>
                                  </div>
                                )}

                                <div
                                  style={{
                                    fontSize: "10px",
                                    marginTop: "4px",
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    gap: "3px",
                                  }}
                                >
                                  {formatTime(msg.createdAt)}
                                  {isMe && <span>{renderStatus(msg)}</span>}
                                </div>
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

            {/* Bottom Section */}
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
              {/* Typing Indicator */}
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
                  <span
                    style={{
                      display: "inline-block",
                      animation: "pulse 1.4s ease-in-out infinite",
                    }}
                  >
                    ●
                  </span>
                  <span>{typing} typing...</span>
                </div>
              )}

              {/* Reply Preview - Simple version (reverted) */}
              {replyTo && (
                <div
                  className="chat-reply-preview"
                  style={{
                    padding: "4px 24px",
                    background: "var(--cc-primary-soft)",
                    borderTop: "1px solid var(--cc-border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    minHeight: "30px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--cc-text)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <span style={{ color: "var(--cc-primary)", fontSize: "14px" }}>
                      ↩
                    </span>
                    <span
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        color: "var(--cc-text)",
                      }}
                    >
                      {replyTo.content}
                    </span>
                  </div>
                  <button
                    onClick={() => setReplyTo(null)}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "16px",
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

              {/* Message Input */}
              {attachments.length > 0 && (
                <div className="chat-attachment-preview">
                  {attachments.map((file, index) => (
                    <span key={`${file.name}-${index}`}>
                      {file.type.startsWith("video/") ? "Video" : "Image"}: {file.name}
                      <button
                        aria-label={`Remove ${file.name}`}
                        onClick={() => setAttachments((files) => files.filter((_, itemIndex) => itemIndex !== index))}
                        type="button"
                      >
                        <FiX />
                      </button>
                    </span>
                  ))}
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
                  disabled={loadingMessages || !room}
                  onClick={() => attachmentInputRef.current?.click()}
                  type="button"
                >
                  <FiPaperclip />
                </button>
                <input
                  className="chat-message-input"
                  value={message}
                  disabled={loadingMessages || !room}
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
                  placeholder={
                    loadingMessages
                      ? "Loading conversation..."
                      : replyTo
                        ? "Type your reply..."
                        : "Type a message..."
                  }
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
                <div className="chat-emoji-wrap">
                  <button
                    aria-label="Add emoji"
                    className="chat-tool-button"
                    disabled={loadingMessages || !room}
                    onClick={() => setShowEmojiPicker((open) => !open)}
                    type="button"
                  >
                    <FiSmile />
                  </button>
                  {showEmojiPicker && (
                    <div className="chat-emoji-picker">
                      {["😀", "👍", "❤️", "😂", "🎉", "🙏"].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            setMessage((value) => `${value}${emoji}`);
                            setShowEmojiPicker(false);
                          }}
                          type="button"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  className="chat-send-button"
                  onClick={handleSend}
                  disabled={(!message.trim() && attachments.length === 0) || loadingMessages || !room}
                  style={{
                    padding: "6px 18px",
                    background:
                      (message.trim() || attachments.length > 0) && !loadingMessages && room
                        ? "var(--cc-primary)"
                        : "var(--cc-primary-soft)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "24px",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor:
                      (message.trim() || attachments.length > 0) && !loadingMessages && room
                        ? "pointer"
                        : "not-allowed",
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                    boxShadow: (message.trim() || attachments.length > 0) && !loadingMessages && room
                      ? "0 10px 18px rgba(15,118,110,0.18)"
                      : "none",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if ((message.trim() || attachments.length > 0) && !loadingMessages && room) {
                      e.currentTarget.style.background = "var(--cc-primary-dark)";
                      e.currentTarget.style.transform = "scale(1.02)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if ((message.trim() || attachments.length > 0) && !loadingMessages && room) {
                      e.currentTarget.style.background = "var(--cc-primary)";
                      e.currentTarget.style.transform = "scale(1)";
                    }
                  }}
                >
                  Send
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
                fontSize: "48px",
                marginBottom: "16px",
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
    </div>
  );
};

export default ChatPage;
