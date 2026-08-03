import { Boxes } from "lucide-react";
import { ComingSoonState } from "../../components/dashboard/ComingSoonState";

export const metadata = { title: "Services" };

export default function ServicesPage() {
  return (
    <ComingSoonState
      icon={Boxes}
      title="Service Catalog"
      description="Managing the services shown on the public Order form: pricing, categories, active/inactive. Coming in a later stage."
    />
  );
}
