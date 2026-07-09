import { FiActivity, FiHeart, FiTrendingUp } from "react-icons/fi";

import ModuleHub from "../../components/dashboard/ModuleHub";

const SustainabilityPage = () => {
  return (
    <ModuleHub
      actions={[
        {
          label: "Log impact",
          description: "Capture sustainability activity in a structured view.",
          icon: FiHeart,
        },
        {
          label: "Track metrics",
          description: "Keep campus progress readable over time.",
          icon: FiTrendingUp,
        },
        {
          label: "Share updates",
          description: "Post initiatives to the campus feed.",
          icon: FiActivity,
          to: "/dashboard/feed",
        },
      ]}
      description="A sustainability workspace for activity logs, impact metrics, and campus initiatives."
      eyebrow="Sustainability"
      highlights={["Impact logs", "Progress metrics", "Campus initiatives"]}
      metrics={[
        { label: "Workspace status", value: "Ready" },
        { label: "Primary flow", value: "Impact" },
        { label: "Audience", value: "Campus" },
      ]}
      title="Sustainability hub"
    />
  );
};

export default SustainabilityPage;
