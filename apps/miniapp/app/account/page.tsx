import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { TelegramLinkGate } from "../components/TelegramLinkGate";
import { disconnectTelegramAction, logoutAction } from "./actions";

export default async function AccountPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <TelegramLinkGate />;

  const [{ data: profile }, { data: client }] = await Promise.all([
    supabase.from("users").select("full_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("clients")
      .select("telegram_username, telegram_connected_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return (
    <div className="page">
      <h1 className="greeting">👤 Account</h1>

      <div className="card">
        <p style={{ margin: 0, fontWeight: 600 }}>{profile?.full_name ?? "Nimia Client"}</p>
        <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 13 }}>{user.email}</p>
      </div>

      <div className="card">
        <p style={{ margin: 0, fontWeight: 600 }}>Telegram</p>
        {client?.telegram_connected_at ? (
          <>
            <p style={{ margin: "4px 0 12px", color: "var(--text-muted)", fontSize: 13 }}>
              Connected{client.telegram_username ? ` as @${client.telegram_username}` : ""}
            </p>
            <form action={disconnectTelegramAction}>
              <button type="submit" className="cta-button secondary">
                Disconnect Telegram
              </button>
            </form>
          </>
        ) : (
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 13 }}>Not connected.</p>
        )}
      </div>

      <form action={logoutAction}>
        <button type="submit" className="cta-button secondary">
          Log Out
        </button>
      </form>
    </div>
  );
}
