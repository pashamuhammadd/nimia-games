import { AIHunterSubNav } from "./AIHunterSubNav";

export const metadata = { title: "AI Client Hunter" };

// Plain Server Component wrapper — same split as (protected)/layout.tsx
// itself (auth stays server-side; only the active-tab highlighting in
// AIHunterSubNav needs to be a Client Component).
export default function AIClientHunterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Client Hunter</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/45">
          Discovers and qualifies potential animation clients for human review. It never contacts anyone
          automatically — every outreach message is a draft you approve and send yourself.
        </p>
      </div>

      <AIHunterSubNav />

      {children}
    </div>
  );
}
