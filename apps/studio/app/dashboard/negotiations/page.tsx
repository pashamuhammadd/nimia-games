import { Handshake } from "lucide-react";
import { ComingSoonState } from "../../components/dashboard/ComingSoonState";

export const metadata = { title: "Negotiations" };

export default function NegotiationsPage() {
  return (
    <ComingSoonState
      icon={Handshake}
      title="Negotiations"
      description="Discuss pricing and scope directly with the Nimia Games team before your order is confirmed. This is on the way."
    />
  );
}
