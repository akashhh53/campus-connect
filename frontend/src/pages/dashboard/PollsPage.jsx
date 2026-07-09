import { FiBarChart2, FiCheckCircle, FiMessageSquare } from "react-icons/fi";

import ModuleHub from "../../components/dashboard/ModuleHub";

const PollsPage = () => {
  return (
    <ModuleHub
      actions={[
        {
          label: "Collect responses",
          description: "Shape quick polls and feedback into one campus view.",
          icon: FiCheckCircle,
        },
        {
          label: "Review results",
          description: "Keep response trends readable for teams.",
          icon: FiBarChart2,
        },
        {
          label: "Share context",
          description: "Use the feed for discussion around poll outcomes.",
          icon: FiMessageSquare,
          to: "/dashboard/feed",
        },
      ]}
      description="A feedback workspace for polls, response trends, and campus decisions."
      eyebrow="Polls"
      highlights={["Fast responses", "Readable results", "Feedback loops"]}
      metrics={[
        { label: "Workspace status", value: "Ready" },
        { label: "Primary flow", value: "Polls" },
        { label: "Audience", value: "Campus" },
      ]}
      title="Polls and feedback"
    />
  );
};

export default PollsPage;
