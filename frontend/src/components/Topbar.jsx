import { useDispatch, useSelector } from "react-redux";
import { logout } from "../features/auth/authSlice";
import { useState, useEffect, useRef } from "react";

const Topbar = () => {
  const dispatch = useDispatch();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Redux user
  const reduxUser = useSelector((state) => state.auth.user);

  // LocalStorage user
  const localData = JSON.parse(localStorage.getItem("user"));

  // Final user
  const user = localData?.user || reduxUser;

  const handleLogout = () => {
    dispatch(logout());
    setIsDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
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

  return (
    <nav
      style={{
        height: "70px",
        background: "#ffffff",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
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
            gap: "8px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: "white",
                fontSize: "18px",
                fontWeight: "bold",
              }}
            >
              CC
            </span>
          </div>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: "600",
              color: "#111827",
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
            gap: "20px",
          }}
        >
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
                padding: "8px 12px",
                borderRadius: "12px",
                transition: "all 0.2s ease",
                backgroundColor: isDropdownOpen ? "#f3f4f6" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!isDropdownOpen) e.currentTarget.style.backgroundColor = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                if (!isDropdownOpen) e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "600",
                  fontSize: "14px",
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
                  width: "240px",
                  background: "white",
                  borderRadius: "12px",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.02)",
                  border: "1px solid #e5e7eb",
                  overflow: "hidden",
                  animation: "slideDown 0.2s ease",
                }}
              >
                <div
                  style={{
                    padding: "12px",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: "12px",
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Signed in as
                  </p>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#111827",
                    }}
                  >
                    {user?.email || user?.name || "User"}
                  </p>
                </div>

                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    fontSize: "14px",
                    color: "#dc2626",
                    transition: "background-color 0.2s ease",
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
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Keyframe animation for dropdown */}
      <style>
        {`
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
        `}
      </style>
    </nav>
  );
};

export default Topbar;