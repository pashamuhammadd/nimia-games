import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { TelegramLinkGate } from "../components/TelegramLinkGate";
import { EditProfileForm } from "./EditProfileForm";
import { disconnectTelegramAction, logoutAction } from "./actions";

// Redesigned 20 Agustus 2026, per Pasha's "halaman akun ... harus di
// improve dan tampilannya harus sama [dengan app.nimiastudio.com], bisa
// edit profil juga" request - see apps/app/app/dashboard/profile/page.tsx
// for the matching rewrite on the full site (same field set and order:
// avatar + name/email, then Full name / Company / WhatsApp / Country as
// an editable form, in both places now, plus each app's own connection
// card - Telegram here, Discord there - and this app's own Log Out
// action, which the full dashboard's Profile page doesn't need since its
// nav already has a sign-out elsewhere).
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
      .select("company_name, whatsapp, country, telegram_username, telegram_connected_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const fullName = profile?.full_name ?? "";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join("") || "N";

  return (
    <div className="page">
      <h1 className="greeting">👤 Account</h1>

      <div className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div className="avatar-circle">{initials}</div>
        <div>
          <p style={{ margin: 0, fontWeight: 600 }}>{fullName || "Nimia Client"}</p>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 13 }}>{user.email}</p>
        </div>
      </div>

      <EditProfileForm
        initial={{
          fullName,
          companyName: client?.company_name ?? "",
          whatsapp: client?.whatsapp ?? "",
          country: client?.country ?? "",
        }}
      />

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
