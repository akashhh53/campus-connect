import { FiCalendar, FiCheckSquare, FiUsers } from "react-icons/fi";

import ModuleHub from "../../components/dashboard/ModuleHub";

const EventsPage = () => {
  return (
    <ModuleHub
      actions={[
        {
          label: "Explore events",
          description: "Keep club events, deadlines, and campus sessions visible.",
          icon: FiCalendar,
        },
        {
          label: "Manage registrations",
          description: "Prepare attendance and RSVP flows for event teams.",
          icon: FiCheckSquare,
        },
        {
          label: "Open community feed",
          description: "Share event announcements with the wider campus.",
          icon: FiUsers,
          to: "/dashboard/feed",
        },
      ]}
      description="A calendar-minded workspace for clubs, registrations, and campus event discovery."
      eyebrow="Events"
      highlights={["Event discovery", "Club coordination", "Registration-ready"]}
      metrics={[
        { label: "Workspace status", value: "Ready" },
        { label: "Primary flow", value: "Events" },
        { label: "Audience", value: "Campus" },
      ]}
      title="Campus events"
    />
  );
};

export default EventsPage;
