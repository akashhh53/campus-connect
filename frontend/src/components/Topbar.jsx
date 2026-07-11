import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router";
import {
  FiBell,
  FiBookmark,
  FiChevronDown,
  FiLogOut,
  FiMenu,
  FiMessageCircle,
  FiMoon,
  FiSmartphone,
  FiSun,
  FiX,
  FiUser,
} from "react-icons/fi";

import { logout } from "../features/auth/authSlice";
import { logoutUser } from "../services/authService";
import {
  arePhoneNotificationsEnabled,
  disablePhoneNotifications,
  requestPhoneNotifications,
  showPhoneNotification,
  syncPhoneNotificationState,
} from "../services/mobileNotificationService";
import { getNotifications, markAllRead, markRead } from "../services/notificationService";
import socket from "../socket/socket";

const Topbar = ({
  chatUnread = 0,
  isSidebarOpen = false,
  onToggleSidebar,
  onToggleTheme,
  theme = "light",
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const notificationsListRef = useRef(null);

  const reduxUser = useSelector((state) => state.auth.user);
  const localData = JSON.parse(localStorage.getItem("userInfo") || "null");
  const user = localData?.user || reduxUser;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [phoneNotificationsEnabled, setPhoneNotificationsEnabled] = useState(
    () => arePhoneNotificationsEnabled(),
  );
  const [phoneNotificationBusy, setPhoneNotificationBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const pageMeta = useMemo(() => {
    const titleMap = [
      ["/dashboard/feed", ["Campus Feed", "Posts, people, and updates"]],
      ["/dashboard/post", ["Post Detail", "Conversation and comments"]],
      ["/dashboard/profile", ["Your Profile", "Account and activity"]],
      ["/dashboard/saved", ["Saved Posts", "Posts you kept for later"]],
      ["/dashboard/user", ["Profile", "Campus member details"]],
      ["/dashboard/marketplace", ["Marketplace", "Campus buying and selling"]],
      ["/dashboard/chat", ["Messages", "Realtime campus conversations"]],
      ["/dashboard/confessions", ["Confessions", "Anonymous campus thoughts"]],
      ["/dashboard/library", ["Library", "Books, access, and records"]],
      ["/dashboard/academic-hub", ["Academic Hub", "Questions, answers, and notes"]],
      ["/dashboard/events", ["Events", "Clubs and registrations"]],
      ["/dashboard/lost-found", ["Lost & Found", "Report, claim, and resolve items"]],
      ["/dashboard/polls", ["Polls", "Feedback from your campus"]],
      ["/dashboard/sustainability", ["Sustainability", "Campus impact and logs"]],
      ["/dashboard/admin", ["Admin", "Moderation and controls"]],
      ["/dashboard/global", ["Global", "Cross-campus overview"]],
    ];

    const match = titleMap.find(([path]) =>
      path === "/dashboard"
        ? location.pathname === path
        : location.pathname.startsWith(path),
    );

    if (match) {
      return { title: match[1][0], subtitle: match[1][1] };
    }

    return { title: "Dashboard", subtitle: "Your campus workspace" };
  }, [location.pathname]);

  const userInitials = (() => {
    if (!user?.name) return "U";

    return user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  })();

  const fetchNotificationCount = useCallback(async () => {
    try {
      const data = await getNotifications(1, 10);
      setNotificationCount(data.unreadCount || 0);
    } catch (err) {
      console.log(err);
    }
  }, []);

  const fetchNotifications = useCallback(async (pageNum = 1, isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoadingNotifications(true);
      }

      const data = await getNotifications(pageNum, 15);
      const newNotifications = data.notifications || [];

      if (isLoadMore) {
        setNotifications((prev) => [...prev, ...newNotifications]);
      } else {
        setNotifications(newNotifications);
      }

      setHasMore(newNotifications.length === 15);
      setPage(pageNum);
      setNotificationCount(data.unreadCount || 0);
    } catch (err) {
      console.log(err);
    } finally {
      setLoadingNotifications(false);
      setLoadingMore(false);
    }
  }, []);

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await markRead(notification._id);

        setNotifications((prev) =>
          prev.map((item) =>
            item._id === notification._id ? { ...item, isRead: true } : item,
          ),
        );
        setNotificationCount((prev) => Math.max(0, prev - 1));
      }

      setNotificationsOpen(false);

      if (notification.link) {
        navigate(notification.link);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleScroll = useCallback(() => {
    if (!notificationsListRef.current || loadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } =
      notificationsListRef.current;

    if (scrollTop + clientHeight >= scrollHeight - 50) {
      fetchNotifications(page + 1, true);
    }
  }, [fetchNotifications, hasMore, loadingMore, page]);

  useEffect(() => {
    const listElement = notificationsListRef.current;

    if (listElement && notificationsOpen) {
      listElement.addEventListener("scroll", handleScroll);
      return () => listElement.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll, notificationsOpen]);

  useEffect(() => {
    let alive = true;

    syncPhoneNotificationState()
      .then(({ enabled }) => {
        if (alive) {
          setPhoneNotificationsEnabled(enabled);
        }
      })
      .catch((error) => console.log(error));

    return () => {
      alive = false;
    };
  }, []);

  const handlePhoneNotificationToggle = async () => {
    if (phoneNotificationBusy) return;

    if (phoneNotificationsEnabled) {
      disablePhoneNotifications();
      setPhoneNotificationsEnabled(false);
      return;
    }

    try {
      setPhoneNotificationBusy(true);
      const { enabled } = await requestPhoneNotifications();
      setPhoneNotificationsEnabled(enabled);

      if (!enabled) {
        window.alert("Phone notification permission was not granted.");
      }
    } catch (error) {
      console.log(error);
      window.alert("Unable to enable phone notifications on this device.");
    } finally {
      setPhoneNotificationBusy(false);
    }
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(fetchNotificationCount, 0);

    const handleNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setNotificationCount((prev) => prev + 1);
      showPhoneNotification({
        title: notification.title || "Campus Connect",
        body: notification.message || "You have a new campus update.",
        data: {
          link: notification.link,
          notificationId: notification._id,
        },
      });
    };

    const handleRemove = (notificationId) => {
      setNotifications((prev) => prev.filter((item) => item._id !== notificationId));
      setNotificationCount((prev) => Math.max(0, prev - 1));
    };

    socket.on("new_notification", handleNotification);
    socket.on("notification_removed", handleRemove);

    return () => {
      window.clearTimeout(initialLoad);
      socket.off("new_notification", handleNotification);
      socket.off("notification_removed", handleRemove);
    };
  }, [fetchNotificationCount]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
        setPage(1);
        setHasMore(true);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.log(err);
    }

    dispatch(logout());
    setIsDropdownOpen(false);
    navigate("/login");
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);

      if (interval >= 1) {
        return `${interval} ${unit}${interval === 1 ? "" : "s"} ago`;
      }
    }

    return "just now";
  };

  return (
    <header className="topbar">
      {onToggleSidebar && (
        <button
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          className="mobile-menu-button"
          onClick={onToggleSidebar}
          type="button"
        >
          {isSidebarOpen ? <FiX /> : <FiMenu />}
        </button>
      )}

      <button
        className="topbar-brand"
        onClick={() => navigate("/dashboard")}
        type="button"
      >
        <span className="topbar-brand-mark">CC</span>
        <span>
          <span className="topbar-brand-title">{pageMeta.title}</span>
          <span className="topbar-brand-subtitle">{pageMeta.subtitle}</span>
        </span>
      </button>

      <div className="topbar-actions">
        <button
          aria-label="Open messages"
          className="topbar-icon-button"
          onClick={() => navigate("/dashboard/chat")}
          type="button"
        >
          <FiMessageCircle />
          {chatUnread > 0 && (
            <span className="topbar-badge">
              {chatUnread > 99 ? "99+" : chatUnread}
            </span>
          )}
        </button>

        <button
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          className="topbar-icon-button"
          onClick={onToggleTheme}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          type="button"
        >
          {theme === "dark" ? <FiSun /> : <FiMoon />}
        </button>

        <div className="topbar-popover-anchor" ref={notificationRef}>
          <button
            aria-label="Open notifications"
            className={`topbar-icon-button ${notificationsOpen ? "is-active" : ""}`}
            onClick={async () => {
              if (!notificationsOpen) {
                setPage(1);
                setHasMore(true);
                await fetchNotifications(1, false);
                try {
                  await markAllRead();
                  setNotifications((items) =>
                    items.map((item) => ({ ...item, isRead: true })),
                  );
                  setNotificationCount(0);
                } catch (err) {
                  console.log(err);
                }
              }

              setNotificationsOpen((open) => !open);
            }}
            type="button"
          >
            <FiBell />
            {notificationCount > 0 && (
              <span className="topbar-badge is-dot" aria-label="Unread notifications" />
            )}
          </button>

          {notificationsOpen && (
            <section className="notification-panel">
              <div className="notification-header">
                <div>
                  <h3>Notifications</h3>
                  <p>Campus updates and activity</p>
                </div>
                <button
                  className={`notification-phone-toggle ${
                    phoneNotificationsEnabled ? "is-enabled" : ""
                  }`}
                  disabled={phoneNotificationBusy}
                  onClick={handlePhoneNotificationToggle}
                  type="button"
                >
                  <FiSmartphone />
                  {phoneNotificationsEnabled ? "Phone alerts on" : "Enable phone alerts"}
                </button>
              </div>

              <div className="notification-list" ref={notificationsListRef}>
                {loadingNotifications && notifications.length === 0 ? (
                  <div className="notification-skeletons">
                    {[1, 2, 3].map((item) => (
                      <div className="notification-skeleton" key={item} />
                    ))}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="notification-empty">
                    <FiBell />
                    <strong>No notifications yet</strong>
                    <span>New activity will show up here.</span>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      className={`notification-item ${
                        notification.isRead ? "" : "is-unread"
                      }`}
                      key={notification._id}
                      onClick={() => handleNotificationClick(notification)}
                      type="button"
                    >
                      <span className="notification-dot" />
                      <span>
                        <strong>{notification.title}</strong>
                        <span>{notification.message}</span>
                        <time>{formatTimeAgo(notification.createdAt)}</time>
                      </span>
                    </button>
                  ))
                )}

                {loadingMore && (
                  <div className="notification-loading">Loading more...</div>
                )}

                {!hasMore && notifications.length > 0 && (
                  <div className="notification-loading">All caught up.</div>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="topbar-popover-anchor" ref={dropdownRef}>
          <button
            className={`topbar-user-button ${isDropdownOpen ? "is-active" : ""}`}
            onClick={() => setIsDropdownOpen((open) => !open)}
            type="button"
          >
            {user?.profilePicture ? (
              <img
                alt={user?.name || "User"}
                className="topbar-avatar"
                src={user.profilePicture}
              />
            ) : (
              <span className="topbar-avatar">{userInitials}</span>
            )}
            <span className="topbar-user-copy">
              <strong>{user?.name || "User"}</strong>
              <span>{user?.role?.name || "Member"}</span>
            </span>
            <FiChevronDown className="topbar-chevron" />
          </button>

          {isDropdownOpen && (
            <section className="user-menu">
              <div className="user-menu-header">
                <strong>{user?.name || "User"}</strong>
                <span>{user?.email || "Campus member"}</span>
              </div>

              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  navigate("/dashboard/profile");
                }}
                type="button"
              >
                <FiUser />
                Your Profile
              </button>

              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  navigate("/dashboard/saved");
                }}
                type="button"
              >
                <FiBookmark />
                Saved Posts
              </button>

              <button className="is-danger" onClick={handleLogout} type="button">
                <FiLogOut />
                Sign out
              </button>
            </section>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
