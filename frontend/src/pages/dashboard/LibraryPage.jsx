import { FiArchive, FiBookOpen, FiClock } from "react-icons/fi";

import ModuleHub from "../../components/dashboard/ModuleHub";

const LibraryPage = () => {
  return (
    <ModuleHub
      actions={[
        {
          label: "Browse catalogue",
          description: "Organize books, files, and learning materials.",
          icon: FiBookOpen,
        },
        {
          label: "Track borrowing",
          description: "Prepare issue, return, and history workflows.",
          icon: FiClock,
        },
        {
          label: "Review access",
          description: "Keep library activity clear for campus teams.",
          icon: FiArchive,
        },
      ]}
      description="A library workspace shaped for catalogue browsing, access logs, and borrowing history."
      eyebrow="Library"
      highlights={["Catalogue layout", "Borrowing flow", "Access history"]}
      metrics={[
        { label: "Workspace status", value: "Ready" },
        { label: "Primary flow", value: "Catalogue" },
        { label: "Audience", value: "Campus" },
      ]}
      title="Library centre"
    />
  );
};

export default LibraryPage;
