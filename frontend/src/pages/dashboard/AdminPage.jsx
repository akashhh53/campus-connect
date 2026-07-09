import { FiClipboard, FiShield, FiUserPlus } from "react-icons/fi";

import ModuleHub from "../../components/dashboard/ModuleHub";

const AdminPage = () => {
  return (
    <ModuleHub
      actions={[
        {
          label: "Review actions",
          description: "Track moderation, access, and campus admin work.",
          icon: FiClipboard,
        },
        {
          label: "Invite admins",
          description: "Prepare admin invitations for college teams.",
          icon: FiUserPlus,
        },
        {
          label: "Protect modules",
          description: "Keep role access aligned with campus policy.",
          icon: FiShield,
        },
      ]}
      description="A restrained admin workspace for moderation, invites, college setup, and role-based access."
      eyebrow="Admin Panel"
      highlights={["Role-aware access", "Moderation-ready", "College controls"]}
      metrics={[
        { label: "Workspace status", value: "Ready" },
        { label: "Primary flow", value: "Access" },
        { label: "Audience", value: "Admins" },
      ]}
      title="Campus administration"
    />
  );
};

export default AdminPage;
