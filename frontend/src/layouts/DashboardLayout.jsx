import { useSelector } from "react-redux";
import { Outlet, NavLink } from "react-router";
import { useEffect, useState } from "react";
import sidebarConfig from "../utils/sidebarConfig";
import Topbar from "../components/Topbar";
import api from "../api/axios";
import socket from "../socket/socket";

const DashboardLayout = () => {
  const reduxUser = useSelector((state) => state.auth.user);
  const localData = JSON.parse(localStorage.getItem("userInfo") || "null");
  const user = reduxUser || localData?.user;
  const modules = user?.role?.allowedModules || {};

  // ===== CHAT UNREAD STATE =====
  const [chatUnread, setChatUnread] = useState(0);

  // ===== SINGLE EFFECT: INITIAL LOAD + SOCKET + FOCUS =====
  useEffect(() => {
    let alive = true;

    const loadUnread = async () => {
      try {
        const res = await api.get("/chat/my-chats");
        const total = (res.data.chats || []).filter(
          (c) => (c.unreadCount || 0) > 0,
        ).length;
        // Only update if component is still alive
        if (alive) {
          setChatUnread(total);
        }
      } catch (err) {
        console.log(err);
      }
    };

    // Initial load
    loadUnread();
    const refreshUnread = () => {
      setTimeout(() => {
        if (alive) {
          loadUnread();
        }
      }, 200);
    };

    socket.on("new_message", refreshUnread);

    socket.on("chat_updated", refreshUnread);

    // Focus listener for tab visibility
    window.addEventListener("focus", loadUnread);

    // Cleanup
    return () => {
      alive = false;
      socket.off("new_message", refreshUnread);

      socket.off("chat_updated", refreshUnread);
      window.removeEventListener("focus", loadUnread);
    };
  }, [user?._id]);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: "250px",
          background: "#111827",
          color: "white",
          padding: "20px",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
        }}
      >
        <h2>Campus Connect</h2>
        <hr />

        {sidebarConfig.map((item) => {
          if (!modules[item.module]) {
            return null;
          }

          const isChat = item.path === "/dashboard/chat";

          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: "block",
                color: "white",
                marginBottom: "20px",
                textDecoration: "none",
                background: isActive ? "#2563eb" : "transparent",
                padding: "10px",
                borderRadius: "8px",
              })}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <item.icon />
                  <span>{item.name}</span>
                </div>

                {isChat && chatUnread > 0 && (
                  <div
                    style={{
                      background: "#ef4444",
                      color: "white",
                      minWidth: "22px",
                      height: "22px",
                      borderRadius: "999px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "0 6px",
                      boxShadow: "0 2px 4px rgba(239, 68, 68, 0.4)",
                    }}
                  >
                    {chatUnread > 99 ? "99+" : chatUnread}
                  </div>
                )}
              </div>
            </NavLink>
          );
        })}
      </div>

      {/* Right Side */}
      <div
        style={{
          flex: 1,
          background: "#f3f4f6",
          color: "#111827",
        }}
      >
        {/* Topbar */}
        <Topbar chatUnread={chatUnread} />

        {/* Page Content */}
        <div
          style={{
            padding: "0",
            flex: 1,
            overflowY: "auto",
            minHeight: 0,
          }}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
