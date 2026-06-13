import { useDispatch, useSelector } from "react-redux";
import { logout } from "../features/auth/authSlice";
import { useState, useEffect, useRef, useCallback } from "react";
import { logoutUser } from "../services/authService";
import { getNotifications, markRead } from "../services/notificationService";
import { useNavigate } from "react-router";

const Topbar = () => {
  const dispatch = useDispatch();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const notificationsListRef = useRef(null);

  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const navigate = useNavigate();
  
  // Redux user
  const reduxUser = useSelector((state) => state.auth.user);

  // LocalStorage user
  const localData = JSON.parse(localStorage.getItem("userInfo") || "null");

  // Final user
  const user = localData?.user || reduxUser;

  const fetchNotificationCount = async () => {
    try {
      const data = await getNotifications(1, 10);
      setNotificationCount(data.unreadCount || 0);
    } catch (err) {
      console.log(err);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await markRead(notification._id);
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notification._id ? { ...n, isRead: true } : n
          )
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

  const fetchNotifications = async (pageNum = 1, isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoadingNotifications(true);
      }
      
      const data = await getNotifications(pageNum, 15);
      const newNotifications = data.notifications || [];
      
      if (isLoadMore) {
        setNotifications(prev => [...prev, ...newNotifications]);
      } else {
        setNotifications(newNotifications);
      }
      
      setHasMore(newNotifications.length === 15);
      setPage(pageNum);
    } catch (err) {
      console.log(err);
    } finally {
      setLoadingNotifications(false);
      setLoadingMore(false);
    }
  };

  // Scroll pagination handler
  const handleScroll = useCallback(() => {
    if (!notificationsListRef.current || loadingMore || !hasMore) return;
    
    const { scrollTop, scrollHeight, clientHeight } = notificationsListRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      fetchNotifications(page + 1, true);
    }
  }, [loadingMore, hasMore, page]);

  useEffect(() => {
    const listElement = notificationsListRef.current;
    if (listElement && notificationsOpen) {
      listElement.addEventListener('scroll', handleScroll);
      return () => listElement.removeEventListener('scroll', handleScroll);
    }
  }, [notificationsOpen, handleScroll]);

  useEffect(() => {
    fetchNotificationCount();
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.log(err);
    }
    dispatch(logout());
    setIsDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
        setPage(1);
        setHasMore(true);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return "U";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get time ago string
  const getTimeAgo = (date) => {
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
        return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
      }
    }
    return 'just now';
  };

  return (
    <nav
      style={{
        height: "70px",
        background: "#ffffff",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        position: "sticky",
        top: 0,
        zIndex: 1000,
      }}
    >
      <div
        style={{
          height: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 32px",
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {/* Logo/Brand Section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            cursor: "pointer",
          }}
          onClick={() => navigate("/")}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 6px -1px rgba(99, 102, 241, 0.3)",
              transition: "transform 0.2s ease",
            }}
          >
            <span
              style={{
                color: "white",
                fontSize: "20px",
                fontWeight: "bold",
              }}
            >
              CC
            </span>
          </div>
          <h2
            style={{
              fontSize: "22px",
              fontWeight: "700",
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              margin: 0,
              letterSpacing: "-0.5px",
            }}
          >
            Campus Connect
          </h2>
        </div>

        {/* User Section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
          }}
        >
          {/* Notification Bell */}
          <div
            ref={notificationRef}
            style={{
              position: "relative",
            }}
          >
            <button
              onClick={async () => {
                if (!notificationsOpen) {
                  setPage(1);
                  setHasMore(true);
                  await fetchNotifications(1, false);
                }
                setNotificationsOpen(!notificationsOpen);
              }}
              style={{
                position: "relative",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: "24px",
                padding: "8px",
                borderRadius: "10px",
                transition: "all 0.2s ease",
                backgroundColor: notificationsOpen ? "#f3f4f6" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!notificationsOpen)
                  e.currentTarget.style.backgroundColor = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                if (!notificationsOpen)
                  e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              🔔
              {notificationCount > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    color: "white",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    fontSize: "11px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 4px rgba(239, 68, 68, 0.4)",
                  }}
                >
                  {notificationCount > 99 ? "99+" : notificationCount}
                </div>
              )}
            </button>

            {/* Notification Modal */}
            {notificationsOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "55px",
                  width: "380px",
                  maxHeight: "520px",
                  background: "white",
                  borderRadius: "16px",
                  boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
                  border: "1px solid #e5e7eb",
                  zIndex: 999,
                  overflow: "hidden",
                  animation: "slideDown 0.25s ease",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: "16px 20px",
                    background: "#fafbfc",
                    borderBottom: "1px solid #eff3f6",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "16px",
                        fontWeight: "600",
                        color: "#1f2937",
                      }}
                    >
                      Notifications
                    </h3>
                    {notificationCount > 0 && (
                      <span
                        style={{
                          background: "#6366f1",
                          color: "white",
                          padding: "2px 8px",
                          borderRadius: "20px",
                          fontSize: "11px",
                          fontWeight: "500",
                        }}
                      >
                        {notificationCount} new
                      </span>
                    )}
                  </div>
                </div>

                {/* Notifications List with Scroll Pagination */}
                <div
                  ref={notificationsListRef}
                  style={{
                    maxHeight: "420px",
                    overflowY: "auto",
                  }}
                >
                  {loadingNotifications && notifications.length === 0 ? (
                    // Loading skeleton
                    <div style={{ padding: "16px" }}>
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            gap: "12px",
                            marginBottom: "16px",
                            padding: "12px",
                            borderRadius: "12px",
                          }}
                        >
                          <div
                            style={{
                              width: "40px",
                              height: "40px",
                              background: "#f0f0f0",
                              borderRadius: "50%",
                              animation: "pulse 1.5s ease-in-out infinite",
                            }}
                          ></div>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                height: "12px",
                                background: "#f0f0f0",
                                borderRadius: "6px",
                                marginBottom: "8px",
                                width: "80%",
                                animation: "pulse 1.5s ease-in-out infinite",
                              }}
                            ></div>
                            <div
                              style={{
                                height: "10px",
                                background: "#f0f0f0",
                                borderRadius: "6px",
                                width: "60%",
                                animation: "pulse 1.5s ease-in-out infinite",
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : notifications.length === 0 ? (
                    // Empty state
                    <div
                      style={{
                        padding: "48px 20px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "48px",
                          marginBottom: "12px",
                          opacity: 0.6,
                        }}
                      >
                        🔔
                      </div>
                      <p
                        style={{
                          margin: 0,
                          color: "#6b7280",
                          fontSize: "14px",
                        }}
                      >
                        No notifications yet
                      </p>
                      <p
                        style={{
                          margin: "4px 0 0 0",
                          color: "#9ca3af",
                          fontSize: "12px",
                        }}
                      >
                        When you get notifications, they'll appear here
                      </p>
                    </div>
                  ) : (
                    <>
                      {notifications.map((n, index) => (
                        <div
                          onClick={() => handleNotificationClick(n)}
                          key={n._id}
                          style={{
                            padding: "16px 20px",
                            background: n.isRead ? "white" : "#eff6ff",
                            borderBottom: index === notifications.length - 1 ? "none" : "1px solid #f3f4f6",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            position: "relative",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = n.isRead ? "#f9fafb" : "#dbeafe";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = n.isRead ? "white" : "#eff6ff";
                          }}
                        >
                          {!n.isRead && (
                            <div
                              style={{
                                position: "absolute",
                                left: "8px",
                                top: "20px",
                                width: "8px",
                                height: "8px",
                                background: "#3b82f6",
                                borderRadius: "50%",
                              }}
                            ></div>
                          )}
                          <div style={{ marginLeft: !n.isRead ? "16px" : "0" }}>
                            <div
                              style={{
                                fontWeight: n.isRead ? "500" : "600",
                                fontSize: "14px",
                                color: "#111827",
                                marginBottom: "4px",
                              }}
                            >
                              {n.title}
                            </div>
                            <div
                              style={{
                                fontSize: "13px",
                                color: "#6b7280",
                                lineHeight: "1.4",
                                marginBottom: "6px",
                              }}
                            >
                              {n.message}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#9ca3af",
                              }}
                            >
                              {getTimeAgo(n.createdAt)}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Loading more indicator */}
                      {loadingMore && (
                        <div style={{ padding: "20px", textAlign: "center" }}>
                          <div style={{ 
                            display: "inline-block", 
                            width: "24px", 
                            height: "24px", 
                            border: "2px solid #e5e7eb", 
                            borderTopColor: "#6366f1", 
                            borderRadius: "50%", 
                            animation: "spin 0.6s linear infinite" 
                          }} />
                        </div>
                      )}
                      
                      {/* No more notifications */}
                      {!hasMore && notifications.length > 0 && (
                        <div style={{ 
                          padding: "16px", 
                          textAlign: "center", 
                          color: "#9ca3af", 
                          fontSize: "12px",
                          borderTop: "1px solid #f3f4f6"
                        }}>
                          You're all caught up! 🎉
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Info Dropdown */}
          <div
            ref={dropdownRef}
            style={{
              position: "relative",
            }}
          >
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "6px 12px",
                borderRadius: "40px",
                transition: "all 0.2s ease",
                backgroundColor: isDropdownOpen ? "#f3f4f6" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!isDropdownOpen)
                  e.currentTarget.style.backgroundColor = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                if (!isDropdownOpen)
                  e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "600",
                  fontSize: "15px",
                  boxShadow: "0 2px 4px rgba(99, 102, 241, 0.2)",
                }}
              >
                {getUserInitials()}
              </div>

              {/* User Name */}
              <div
                style={{
                  textAlign: "left",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#111827",
                  }}
                >
                  {user?.name || "User"}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    color: "#6b7280",
                  }}
                >
                  {user?.email || ""}
                </p>
              </div>

              {/* Dropdown Arrow */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                style={{
                  transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="#6b7280"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: "260px",
                  background: "white",
                  borderRadius: "14px",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                  border: "1px solid #e5e7eb",
                  overflow: "hidden",
                  animation: "slideDown 0.2s ease",
                }}
              >
                <div
                  style={{
                    padding: "14px 16px",
                    borderBottom: "1px solid #f3f4f6",
                    background: "#fafbfc",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: "11px",
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontWeight: "600",
                    }}
                  >
                    Signed in as
                  </p>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: "13px",
                      fontWeight: "500",
                      color: "#111827",
                    }}
                  >
                    {user?.email || user?.name || "User"}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate("/profile");
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    fontSize: "14px",
                    color: "#374151",
                    transition: "background-color 0.2s ease",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Your Profile
                </button>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate("/settings");
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    fontSize: "14px",
                    color: "#374151",
                    transition: "background-color 0.2s ease",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  Settings
                </button>

                <div
                  style={{
                    borderTop: "1px solid #f3f4f6",
                    marginTop: "4px",
                    paddingTop: "8px",
                  }}
                >
                  <button
                    onClick={handleLogout}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      fontSize: "14px",
                      color: "#dc2626",
                      fontWeight: "500",
                      transition: "background-color 0.2s ease",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#fef2f2";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>
        {`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-12px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
          
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </nav>
  );
};

export default Topbar;