import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { TicketsList, type TicketRow } from "./TicketsList";
import { PostTicketButtonCta } from "./PostTicketButtonCta";

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

  // order_id + orders(package_name, services(name)) embed (19 Agustus
  // 2026, migration 0053_support_ticket_order_link.sql) — lets staff see
  // WHICH order a ticket is about at a glance, same title-derivation logic
  // apps/app/app/dashboard/orders/page.tsx already uses for its own list.
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select(
      "id, subject, message, status, full_name, company_name, email, discord_thread_id, created_at, order_id, orders(package_name, services(name))",
    )
    .order("created_at", { ascending: false });

  // DISCORD_GUILD_ID isn't a secret (see packages/discord/README.md) —
  // reading it directly here rather than importing @nimia/discord's
  // getDiscordBotConfig purely to avoid this page failing to render
  // entirely if the OTHER half of that config (DISCORD_BOT_TOKEN) isn't
  // set yet; the "Open in Discord" link is a nice-to-have, not something
  // that should be able to break this whole page.
  const guildId = process.env.DISCORD_GUILD_ID;

  const rows: TicketRow[] = (tickets ?? []).map((ticket: any) => {
    // Same normalize-either-shape defensive read as
    // apps/app/app/dashboard/orders/page.tsx — PostgREST embeds a to-one
    // FK as a plain object, but that isn't guaranteed at compile time
    // without generated types (Database is still the `any` placeholder).
    const order = Array.isArray(ticket.orders) ? ticket.orders[0] : ticket.orders;
    const service = order ? (Array.isArray(order.services) ? order.services[0] : order.services) : null;
    const orderLabel = ticket.order_id
      ? `ORD-${String(ticket.order_id).slice(0, 8).toUpperCase()} — ${service?.name ?? order?.package_name ?? "Custom Project"}`
      : null;

    return {
      id: ticket.id,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status,
      full_name: ticket.full_name,
      company_name: ticket.company_name,
      email: ticket.email,
      created_at: ticket.created_at,
      order_label: orderLabel,
      discord_url:
        guildId && ticket.discord_thread_id
          ? `https://discord.com/channels/${guildId}/${ticket.discord_thread_id}`
          : null,
    };
  });

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

      <PostTicketButtonCta />

      <TicketsList tickets={rows} />
    </div>
  );
}
