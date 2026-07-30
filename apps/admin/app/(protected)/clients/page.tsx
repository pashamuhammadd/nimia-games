import { Users } from "lucide-react";
import { ComingSoonState } from "../../components/dashboard/ComingSoonState";

export const metadata = { title: "Clients" };

export default function ClientsPage() {
  return (
    <ComingSoonState
      icon={Users}
      title="Client Directory"
      description="A searchable list of every client — company info, contact details, and their full order/project history — is coming in a later stage."
    />
  );
}
