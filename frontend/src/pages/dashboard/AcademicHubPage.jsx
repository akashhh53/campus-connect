import { FiBookOpen, FiMessageSquare, FiTag } from "react-icons/fi";

import ModuleHub from "../../components/dashboard/ModuleHub";

const AcademicHubPage = () => {
  return (
    <ModuleHub
      actions={[
        {
          label: "Browse threads",
          description: "Organize class questions, replies, and resources.",
          icon: FiMessageSquare,
        },
        {
          label: "Use academic tags",
          description: "Keep topics grouped by subject and difficulty.",
          icon: FiTag,
        },
        {
          label: "Share resources",
          description: "Route study material into the feed when useful.",
          icon: FiBookOpen,
          to: "/dashboard/feed",
        },
      ]}
      description="A focused academic workspace for questions, answers, tags, and shared learning material."
      eyebrow="Academic Hub"
      highlights={["Threaded discussions", "Subject tags", "Resource sharing"]}
      metrics={[
        { label: "Workspace status", value: "Ready" },
        { label: "Primary flow", value: "Q&A" },
        { label: "Audience", value: "Campus" },
      ]}
      title="Academic collaboration"
    />
  );
};

export default AcademicHubPage;
