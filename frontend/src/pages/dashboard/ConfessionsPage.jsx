import { FiEyeOff, FiFlag, FiMessageCircle } from "react-icons/fi";

import ModuleHub from "../../components/dashboard/ModuleHub";

const ConfessionsPage = () => {
  return (
    <ModuleHub
      actions={[
        {
          label: "Read confessions",
          description: "Browse anonymous campus posts in a calmer layout.",
          icon: FiEyeOff,
        },
        {
          label: "Moderate safely",
          description: "Keep sensitive reports visible to the right reviewers.",
          icon: FiFlag,
        },
        {
          label: "Discuss openly",
          description: "Move public discussions back to the campus feed.",
          icon: FiMessageCircle,
          to: "/dashboard/feed",
        },
      ]}
      description="A privacy-first space for anonymous posts, review flows, and safer community conversation."
      eyebrow="Confessions"
      highlights={["Privacy-first", "Review friendly", "Community focused"]}
      metrics={[
        { label: "Workspace status", value: "Ready" },
        { label: "Primary flow", value: "Posts" },
        { label: "Safety", value: "Review" },
      ]}
      title="Anonymous campus space"
    />
  );
};

export default ConfessionsPage;
