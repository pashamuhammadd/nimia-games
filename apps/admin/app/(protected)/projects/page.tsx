import { FolderKanban } from "lucide-react";
import { ComingSoonState } from "../../components/dashboard/ComingSoonState";

export const metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <ComingSoonState
      icon={FolderKanban}
      title="Project Management"
      description="Managing every project's 10-stage lifecycle, progress, and timeline from one place is coming in a later stage."
    />
  );
}
