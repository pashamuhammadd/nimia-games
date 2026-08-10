import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { TicketsList, type TicketRow } from "./TicketsList";

export const metadata = { title: "Tickets" };

// Admin-side Support Tickets page (added 9 Agustus 2026, per
// docs/DISCORD.md's "Client support" section). Every write goes through
// ./actions.ts, which relies on support_tickets_update_admin_only
// (packages/db/migrations/0027_support_tickets.sql) as the real security
// boundary — this page and TicketsList.tsx are convenience/UX. Open
// tickets are listed first, closed ones after, both newest-first — no
// pagination yet, same as apps/admin's other list pages at this stage.
export default async function TicketsPage() {
  const supabase = createServerClient(await cookies());

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, subject, message, status, full_name, company_name, email, discord_thread_id, created_at")
    .order("created_at", { ascending: false });

  // DISCORD_GUILD_ID isn't a secret (see packages/discord/README.md) —
  // reading it directly here rather than importing @nimia/discord's
  // getDiscordBotConfig purely to avoid this page failing to render
  // entirely if the OTHER half of that config (DISCORD_BOT_TOKEN) isn't
  // set yet; the "Open in Discord" link is a nice-to-have, not something
  // that should be able to break this whole page.
  const guildId = process.env.DISCORD_GUILD_ID;

  const rows: TicketRow[] = (tickets ?? []).map((ticket: any) => ({
    id: ticket.id,
    subject: ticket.subject,
    message: ticket.message,
    status: ticket.status,
    full_name: ticket.full_name,
    company_name: ticket.company_name,
    email: ticket.email,
    created_at: ticket.created_at,
    discord_url:
      guildId && ticket.discord_thread_id
        ? `https://discord.com/channels/${guildId}/${ticket.discord_thread_id}`
        : null,
  }));

  const openCount = rows.filter((ticket) => ticket.status === "open").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Tickets</h1>
        <p className="mt-1 text-sm text-white/45">
          {openCount > 0
            ? `${openCount} open ticket${openCount === 1 ? "" : "s"} — reply in Discord if the client connected their account, then close it here once resolved.`
            : "No open tickets right now."}
        </p>
      </div>

      <TicketsList tickets={rows} />
    </div>
  );
}
