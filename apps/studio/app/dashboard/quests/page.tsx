import { Target } from "lucide-react";
import { ComingSoonState } from "../../components/dashboard/ComingSoonState";

export const metadata = { title: "Quests" };

export default function QuestsPage() {
  return (
    <ComingSoonState
      icon={Target}
      title="Quests"
      description="Complete milestones and earn rewards as a Nimia Games client. This is on the way."
    />
  );
}
