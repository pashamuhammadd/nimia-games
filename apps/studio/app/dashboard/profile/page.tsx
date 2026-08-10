import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Label, buttonVariants, cn } from "@nimia/ui";
import { Avatar } from "../../components/dashboard/Avatar";
import { DisconnectDiscordButton } from "./DisconnectDiscordButton";

export const metadata = { title: "Profile" };

// Discord status banner text — keyed off the ?discord=connected|error&
// reason=... query params app/api/discord/callback/route.ts redirects
// here with. See that file for exactly which `reason` values it can send.
const DISCORD_ERROR_MESSAGES: Record<string, string> = {
  denied: "Discord connection cancelled.",
  invalid_state: "That Discord connection link expired or was invalid — please try again.",
  exchange_failed: "Something went wrong connecting your Discord account. Please try again.",
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ discord?: string; reason?: string }>;
}) {
  const { discord: discordStatus, reason: discordReason } = await searchParams;

  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, avatar_url")
    .eq("id", user!.id)
    .single();

  const { data: client } = await supabase
    .from("clients")
    .select("company_name, whatsapp, country, discord_user_id, discord_username, discord_avatar_url")
    .eq("user_id", user!.id)
    .single();

  const rows: { label: string; value: string }[] = [
    { label: "Full name", value: profile?.full_name || "Not set" },
    { label: "Email", value: user?.email ?? "Not set" },
    { label: "Company", value: client?.company_name || "Not set" },
    { label: "WhatsApp", value: client?.whatsapp || "Not set" },
    { label: "Country", value: client?.country || "Not set" },
  ];

  const isDiscordConnected = Boolean(client?.discord_user_id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      {discordStatus === "connected" ? (
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
          Discord account connected.
        </div>
      ) : discordStatus === "error" ? (
        <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-400">
          {DISCORD_ERROR_MESSAGES[discordReason ?? ""] ?? "Something went wrong connecting your Discord account."}
        </div>
      ) : null}

      <Card className="max-w-md">
        <CardHeader>
          <div className="flex items-center gap-4">
            {/* Default avatar (3 Agustus 2026, per user request) — see
                components/dashboard/Avatar.tsx: shows profile.avatar_url
                once a real photo exists, otherwise a Nimia-colored generic
                person silhouette instead of a plain initial letter. */}
            <Avatar avatarUrl={profile?.avatar_url} name={profile?.full_name ?? undefined} size="md" />
            <div>
              <CardTitle>Account information</CardTitle>
              <CardDescription>
                Profile editing (including uploading a real photo) will be available in a future
                phase. For now, contact admin if any information needs updating.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.label}>
              <Label className="mb-0.5">{row.label}</Label>
              <p className="text-sm">{row.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Discord (9 Agustus 2026, launch-readiness follow-up — see
          docs/DISCORD.md and packages/db/migrations/0025_discord_account_linking.sql).
          First slice of the Discord integration: linking an account and
          getting the ⭐ Client role. Notifications/order threads/support
          tickets are separate follow-up work, not gated on this card. */}
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Discord</CardTitle>
          <CardDescription>
            {isDiscordConnected
              ? "Your Discord account is linked to Nimia Studio."
              : "Connect your Discord account to get the Client role on the Nimia Studio server and receive updates there."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isDiscordConnected ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar avatarUrl={client?.discord_avatar_url} name={client?.discord_username ?? undefined} size="sm" />
                <p className="text-sm font-medium">{client?.discord_username}</p>
              </div>
              <DisconnectDiscordButton />
            </div>
          ) : (
            <Link href="/api/discord/connect" className={cn(buttonVariants({ size: "sm" }))}>
              Connect Discord
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
