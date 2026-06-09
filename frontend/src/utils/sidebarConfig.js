import {
  FiHome,
  FiMessageCircle,
  FiShoppingBag,
  FiCalendar,
  FiSearch,
  FiBookOpen,
  FiFileText,
  FiShield,
  FiBarChart2,
  FiGlobe,
  FiAlertCircle,
  FiHeart,
  FiUser,
} from "react-icons/fi";

const sidebarConfig = [
  {
    name: "Dashboard",
    path: "/dashboard",
    module: "dashboard",
    icon: FiHome,
  },

  {
    name: "Feed",
    path: "/dashboard/feed",
    module: "feed",
    icon: FiSearch,
  },

  {
    name: "Marketplace",
    path: "/dashboard/marketplace",
    module: "marketplace",
    icon: FiShoppingBag,
  },

  {
    name: "Confessions",
    path: "/dashboard/confessions",
    module: "confessions",
    icon: FiAlertCircle,
  },

  {
    name: "Library",
    path: "/dashboard/library",
    module: "library",
    icon: FiBookOpen,
  },

  {
    name: "Academic Hub",
    path: "/dashboard/academic-hub",
    module: "academicHub",
    icon: FiFileText,
  },

  {
    name: "Events",
    path: "/dashboard/events",
    module: "events",
    icon: FiCalendar,
  },

  {
    name: "Messaging",
    path: "/dashboard/chat",
    module: "messaging",
    icon: FiMessageCircle,
  },

  {
    name: "Lost & Found",
    path: "/dashboard/lost-found",
    module: "lostFound",
    icon: FiSearch,
  },

  {
    name: "Polls",
    path: "/dashboard/polls",
    module: "polls",
    icon: FiBarChart2,
  },

  {
    name: "Sustainability",
    path: "/dashboard/sustainability",
    module: "sustainability",
    icon: FiHeart,
  },

  {
    name: "Admin Panel",
    path: "/dashboard/admin",
    module: "adminPanel",
    icon: FiShield,
  },

  {
    name: "Global Access",
    path: "/dashboard/global",
    module: "globalAccess",
    icon: FiGlobe,
  },
  {
  name: "Profile",
  path: "/dashboard/profile",
  module: "dashboard",
  icon: FiUser,
},
];

export default sidebarConfig;