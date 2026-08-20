import { getCurrentUser } from "../lib/currentUser";
import { TelegramLinkGate } from "../components/TelegramLinkGate";
import { ComingSoon } from "../components/ComingSoon";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) return <TelegramLinkGate />;

  return (
    <ComingSoon
      title="📦 My Orders"
      description="Track your order status, negotiations, and deliveries right here soon."
    />
  );
}
