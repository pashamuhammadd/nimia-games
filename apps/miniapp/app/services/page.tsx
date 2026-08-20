import { getCurrentUser } from "../lib/currentUser";
import { TelegramLinkGate } from "../components/TelegramLinkGate";
import { ComingSoon } from "../components/ComingSoon";

export default async function ServicesPage() {
  const user = await getCurrentUser();
  if (!user) return <TelegramLinkGate />;

  return (
    <ComingSoon
      title="🛒 Services"
      description="Browse Nimia Studio's game trailer, animation, game development, and web development services right here soon."
    />
  );
}
