import { FiGlobe, FiLayers, FiShield } from "react-icons/fi";

import ModuleHub from "../../components/dashboard/ModuleHub";

const GlobalPage = () => {
  return (
    <ModuleHub
      actions={[
        {
          label: "View colleges",
          description: "Keep multi-college visibility organized.",
          icon: FiGlobe,
        },
        {
          label: "Coordinate modules",
          description: "Plan access across campus workspaces.",
          icon: FiLayers,
        },
        {
          label: "Admin controls",
          description: "Move into administration for protected actions.",
          icon: FiShield,
          to: "/dashboard/admin",
        },
      ]}
      description="A global access space for high-level visibility, college coordination, and platform controls."
      eyebrow="Global Access"
      highlights={["Multi-college view", "Module oversight", "Admin handoff"]}
      metrics={[
        { label: "Workspace status", value: "Ready" },
        { label: "Primary flow", value: "Oversight" },
        { label: "Audience", value: "Global" },
      ]}
      title="Global workspace"
    />
  );
};

export default GlobalPage;
