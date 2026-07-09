import { FiMessageCircle, FiSearch, FiShoppingBag } from "react-icons/fi";

import ModuleHub from "../../components/dashboard/ModuleHub";

const MarketplacePage = () => {
  return (
    <ModuleHub
      actions={[
        {
          label: "Browse listings",
          description: "Review campus buy, sell, and exchange items.",
          icon: FiSearch,
        },
        {
          label: "Create request",
          description: "Prepare item requests for the marketplace workflow.",
          icon: FiShoppingBag,
        },
        {
          label: "Coordinate safely",
          description: "Move interested users into messaging when ready.",
          icon: FiMessageCircle,
          to: "/dashboard/chat",
        },
      ]}
      description="A clean space for campus listings, requests, and handoffs once marketplace activity is available."
      eyebrow="Marketplace"
      highlights={[
        "Item-first layout",
        "Trust-focused actions",
        "Messaging handoff",
      ]}
      metrics={[
        { label: "Workspace status", value: "Ready" },
        { label: "Primary flow", value: "Items" },
        { label: "Next step", value: "Data" },
      ]}
      title="Campus marketplace"
    />
  );
};

export default MarketplacePage;
