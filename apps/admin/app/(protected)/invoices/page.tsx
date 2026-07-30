import { Receipt } from "lucide-react";
import { ComingSoonState } from "../../components/dashboard/ComingSoonState";

export const metadata = { title: "Invoices" };

export default function InvoicesPage() {
  return (
    <ComingSoonState
      icon={Receipt}
      title="Invoicing & Payments"
      description="Creating invoices, verifying submitted payments, and generating receipts from here is coming in a later stage."
    />
  );
}
