import { ProspectHunterSubNav } from "./ProspectHunterSubNav";

export const metadata = { title: "AI Prospect Hunter" };

// Plain Server Component wrapper — same split as (protected)/layout.tsx
// itself (auth stays server-side; only the active-tab highlighting in
// ProspectHunterSubNav needs to be a Client Component).
export default function AIProspectHunterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Prospect Hunter</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/45">
          Discovers crypto/Web3 projects via CoinGecko and scores each one&apos;s realistic animation opportunity for
          Nimia Studio, for human review. A CoinGecko listing is not automatically a lead — it never contacts
          anyone automatically, either; every outreach message is a draft you approve and send yourself.
        </p>
      </div>

      <ProspectHunterSubNav />

      {children}
    </div>
  );
}
