import { getCurrentUser } from "../lib/currentUser";
import { TelegramLinkGate } from "../components/TelegramLinkGate";
import { ComingSoon } from "../components/ComingSoon";

export default async function PartnerPage() {
  const user = await getCurrentUser();
  if (!user) return <TelegramLinkGate />;

  return (
    <ComingSoon
      title="🤝 Partner Program"
      description="Your referral link, level, and rewards will be right here soon."
    />
  );
}
