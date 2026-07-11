import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { NavLink, Outlet } from "react-router";

import Topbar from "../components/Topbar";
import { getMyChats } from "../services/chatService";
import socket, { connectSocket, disconnectSocket } from "../socket/socket";
import sidebarConfig from "../utils/sidebarConfig";

const DashboardLayout = () => {
  const reduxUser = useSelector((state) => state.auth.user);
  const localData = JSON.parse(localStorage.getItem("userInfo") || "null");
  const user = reduxUser || localData?.user;
  const modules = useMemo(() => user?.role?.allowedModules || {}, [user]);

  const [chatUnread, setChatUnread] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("cc-theme");

    if (savedTheme === "dark" || savedTheme === "light") {
      return savedTheme;
    }

    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  const visibleItems = useMemo(() => {
    const hasModuleMap = Object.keys(modules).length > 0;

    return sidebarConfig.filter((item) => {
      if (hasModuleMap) {
        return modules[item.module];
      }

      return item.module === "dashboard" || item.module === "feed";
    });
  }, [modules]);

  useEffect(() => {
    if (!user?._id) return undefined;

    connectSocket(user._id);
    return () => disconnectSocket();
  }, [user?._id]);

  useEffect(() => {
    let alive = true;

    const loadUnread = async () => {
      try {
        const data = await getMyChats({ force: true });
        const total = (data.chats || []).filter(
          (chat) => (chat.unreadCount || 0) > 0,
        ).length;

        if (alive) {
          setChatUnread(total);
        }
      } catch (err) {
        console.log(err);
      }
    };

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
    window.addEventListener("cc:chat-updated", refreshUnread);
    window.addEventListener("focus", loadUnread);

    return () => {
      alive = false;
      socket.off("new_message", refreshUnread);
      socket.off("chat_updated", refreshUnread);
      window.removeEventListener("cc:chat-updated", refreshUnread);
      window.removeEventListener("focus", loadUnread);
    };
  }, [user?._id]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("cc-theme", theme);
  }, [theme]);

  const roleName = user?.role?.name || "Member";

  return (
    <div className="dashboard-shell">
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          className="dashboard-backdrop"
          onClick={() => setSidebarOpen(false)}
          type="button"
        />
      )}

      <aside className={`dashboard-sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">CC</div>
          <div>
            <h2 className="sidebar-brand-title">Campus Connect</h2>
            <p className="sidebar-brand-subtitle">One campus workspace</p>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isChat = item.path === "/dashboard/chat";

            return (
              <NavLink
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "is-active" : ""}`
                }
                end={item.path === "/dashboard"}
                key={item.path}
                onClick={() => setSidebarOpen(false)}
                to={item.path}
              >
                <span className="sidebar-link-main">
                  <Icon />
                  <span className="sidebar-link-label">{item.name}</span>
                </span>

                {isChat && chatUnread > 0 && (
                  <span className="sidebar-badge">
                    {chatUnread > 99 ? "99+" : chatUnread}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <p className="sidebar-footer-label">Signed in role</p>
          <p className="sidebar-footer-value">{roleName}</p>
        </div>
      </aside>

      <div className="dashboard-content">
        <Topbar
          chatUnread={chatUnread}
          isSidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((value) => !value)}
          onToggleTheme={() =>
            setTheme((currentTheme) =>
              currentTheme === "dark" ? "light" : "dark",
            )
          }
          theme={theme}
        />
        <div className="dashboard-outlet">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
