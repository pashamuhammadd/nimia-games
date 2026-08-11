// Mirrors apps/studio/modules/partners/constants/wallet-network.ts (and,
// one level further back, apps/studio's own PaymentPanel.tsx
// NETWORK_LABELS) EXACTLY — public.crypto_network has no shared package
// apps/admin and apps/studio can both import from (separate Next.js apps
// in the monorepo, same gap partner-level.ts's own comment already
// flags). If a network is ever added/removed, update all three.
export const WALLET_NETWORK_LABELS: Record<string, string> = {
  ethereum: "Ethereum",
  bsc: "BNB Smart Chain (BSC)",
  tron: "Tron",
  solana: "Solana",
  cardano: "Cardano",
  ton: "TON",
};

export function walletNetworkLabel(network: string): string {
  return WALLET_NETWORK_LABELS[network] ?? network;
}
