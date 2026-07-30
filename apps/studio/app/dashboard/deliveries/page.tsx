import { Gift } from "lucide-react";
import { ComingSoonState } from "../../components/dashboard/ComingSoonState";

export const metadata = { title: "Deliveries" };

export default function DeliveriesPage() {
  return (
    <ComingSoonState
      icon={Gift}
      title="Deliveries"
      description="Download finished animations, game assets, and files handed off by the Nimia Games team. This is on the way."
    />
  );
}
