import type { WalletNetwork } from "../types/reward";

// Withdrawal target networks — same set + labels as
// app/dashboard/orders/PaymentPanel.tsx's own NETWORK_LABELS (public.crypto_network,
// packages/db/migrations/0013, extended with 'ton' in 0014), reused here
// rather than inventing a second network list: a partner's payout wallet
// is the same kind of address a client's payment wallet is, just flowing
// the other direction. KEEP IN SYNC with that file + the enum itself if a
// network is ever added/removed.
export const WALLET_NETWORK_LABELS: Record<WalletNetwork, string> = {
  ethereum: "Ethereum",
  bsc: "BNB Smart Chain (BSC)",
  tron: "Tron",
  solana: "Solana",
  cardano: "Cardano",
  ton: "TON",
};

export const WALLET_NETWORK_OPTIONS: { value: WalletNetwork; label: string }[] = (
  Object.keys(WALLET_NETWORK_LABELS) as WalletNetwork[]
).map((value) => ({ value, label: WALLET_NETWORK_LABELS[value] }));
