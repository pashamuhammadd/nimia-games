import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { TelegramLinkGate } from "./components/TelegramLinkGate";

export default async function HomePage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <TelegramLinkGate />;
  }

  const { data: profile } = await supabase.from("users").select("full_name").eq("id", user.id).maybeSingle();
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="page">
      <h1 className="greeting">Welcome back, {firstName} 👋</h1>
      <p className="subtitle">Your Telegram account is connected to Nimia Studio.</p>

      <a className="cta-button" href="/services">
        🎮 Start a Project
      </a>

      <div className="card">
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>
          This first release confirms your account is linked and ready. Browsing services, tracking
          orders, and your Partner Dashboard are coming in the next update — see the Services, Orders,
          and Partner tabs below.
        </p>
      </div>
    </div>
  );
}
