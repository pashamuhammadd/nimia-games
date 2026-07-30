import { Ticket } from "lucide-react";
import { ComingSoonState } from "../../components/dashboard/ComingSoonState";

export const metadata = { title: "Vouchers" };

export default function VouchersPage() {
  return (
    <ComingSoonState
      icon={Ticket}
      title="Vouchers"
      description="Redeem discount vouchers on your next order. This is on the way."
    />
  );
}
