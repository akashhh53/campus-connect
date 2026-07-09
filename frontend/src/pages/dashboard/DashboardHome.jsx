import { useMemo } from "react";
import { useSelector } from "react-redux";

import ModuleHub from "../../components/dashboard/ModuleHub";
import sidebarConfig from "../../utils/sidebarConfig";

const DashboardHome = () => {
  const reduxUser = useSelector((state) => state.auth.user);
  const localData = JSON.parse(localStorage.getItem("userInfo") || "null");
  const user = reduxUser || localData?.user;
  const modules = useMemo(() => user?.role?.allowedModules || {}, [user]);

  const enabledModules = useMemo(() => {
    const hasModuleMap = Object.keys(modules).length > 0;

    return sidebarConfig.filter((item) => {
      if (hasModuleMap) {
        return modules[item.module];
      }

      return item.module === "dashboard" || item.module === "feed";
    });
  }, [modules]);

  const firstName = user?.name?.split(" ")[0] || "there";
  const actionCopy = {
    feed: {
      description: "Share campus updates, search people, and follow the latest conversations.",
      meta: "Community",
    },
    marketplace: {
      description: "Browse or prepare campus buy, sell, and exchange activity.",
      meta: "Listings",
    },
    confessions: {
      description: "Read anonymous campus thoughts in a calmer, moderated space.",
      meta: "Anonymous",
    },
    library: {
      description: "Keep books, access, and library records close to your workflow.",
      meta: "Resources",
    },
    academicHub: {
      description: "Ask questions, organize study threads, and share learning material.",
      meta: "Study",
    },
    events: {
      description: "Find club events, campus programs, and registration updates.",
      meta: "Calendar",
    },
    messaging: {
      description: "Continue one-to-one conversations with classmates and campus members.",
      meta: "Realtime",
    },
    lostFound: {
      description: "Report lost items, claim found ones, and track resolution status.",
      meta: "Campus help",
    },
    polls: {
      description: "Collect opinions and see quick feedback from your campus community.",
      meta: "Feedback",
    },
    sustainability: {
      description: "Follow impact work, green habits, and campus sustainability updates.",
      meta: "Impact",
    },
    adminPanel: {
      description: "Manage moderation, role access, and college-level controls.",
      meta: "Controls",
    },
    globalAccess: {
      description: "View cross-campus access and wider platform-level context.",
      meta: "Overview",
    },
    dashboard: {
      description: "Review your profile, saved work, and account-level shortcuts.",
      meta: "Account",
    },
  };

  return (
    <ModuleHub
      actions={enabledModules
        .filter((item) => item.path !== "/dashboard")
        .slice(0, 9)
        .map((item) => ({
          label: item.name,
          description:
            actionCopy[item.module]?.description ||
            `Open the ${item.name.toLowerCase()} workspace.`,
          icon: item.icon,
          meta: actionCopy[item.module]?.meta || "Workspace",
          to: item.path,
        }))}
      description="Your modules, conversations, campus updates, and reports are organized in one cleaner dashboard. Use the shortcut cards below when you want to jump straight into work."
      eyebrow="Dashboard"
      highlights={[
        "Role-based module access",
        "Realtime chat and notifications",
        "Scroll-friendly quick actions",
      ]}
      metrics={[
        {
          label: "Available modules",
          value: enabledModules.length,
        },
        {
          label: "Signed-in role",
          value: user?.role?.name || "Member",
        },
        {
          label: "Workspace",
          value: "Live",
        },
      ]}
      title={`Welcome back, ${firstName}`}
    />
  );
};

export default DashboardHome;
