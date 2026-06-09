import { useSelector } from "react-redux";

import { Outlet, NavLink } from "react-router";

import sidebarConfig from "../utils/sidebarConfig";

import Topbar from "../components/Topbar";

const DashboardLayout = () => {
  const { user } = useSelector(
    (state) => state.auth
  );

  const modules =
    user?.role?.allowedModules || {};

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

        {
          sidebarConfig.map((item) => {

            if (!modules[item.module]) {
              return null;
            }

            return (
              <NavLink
                key={item.path}

                to={item.path}

                style={({ isActive }) => ({
                  display: "block",

                  color: "white",

                  marginBottom: "20px",

                  textDecoration: "none",

                  background: isActive
                    ? "#2563eb"
                    : "transparent",

                  padding: "10px",

                  borderRadius: "8px",
                })}
              >
               <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "10px",
  }}
>
  <item.icon />

  <span>
    {item.name}
  </span>
</div>
              </NavLink>
            );
          })
        }
      </div>

      {/* Right Side */}

      <div
        style={{
          flex: 1,
          background: "#f3f4f6",
            color: "#111827"
        }}
      >

        {/* Topbar */}

        <Topbar />

        {/* Page Content */}

        <div
          style={{
            padding: "30px",
          }}
        >
          <Outlet />
        </div>

      </div>

    </div>
  );
};

export default DashboardLayout;