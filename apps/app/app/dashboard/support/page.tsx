import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@nimia/ui";
import { LifeBuoy } from "lucide-react";
import { SupportTicketForm } from "./SupportTicketForm";

export const metadata = { title: "Support" };

// Client-facing "Support" page (added 9 Agustus 2026, per docs/DISCORD.md's
// "Client support" section). Reachable from the Topbar account dropdown
// (see components/dashboard/Topbar.tsx) rather than the main Sidebar —
// DashboardNav.tsx's own comment notes the original brief's "JANGAN
// tambahkan menu lain" (don't add other sidebar items), same reason
// Settings/Profile live in the dropdown instead of the sidebar too.
export default async function SupportPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: client } = await supabase.from("clients").select("id").eq("user_id", user!.id).single();

  const { data: tickets } = client
    ? await supabase
        .from("support_tickets")
        .select("id, subject, status, created_at, closed_at")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Support</h1>
        <p className="mt-1 text-sm text-white/45">
          Need help with an order, payment, or anything else? Open a ticket and our team will follow up — in
          Discord if you&apos;ve connected your account, or right here either way.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open a new ticket</CardTitle>
          <CardDescription>We usually respond within 24 hours.</CardDescription>
        </CardHeader>
        <CardContent>
          <SupportTicketForm />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/40">Your tickets</h2>
        {!tickets || tickets.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-12 text-center">
            <LifeBuoy className="h-8 w-8 text-white/25" aria-hidden="true" />
            <p className="max-w-sm text-sm text-white/50">No tickets yet — open one above if you need anything.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{ticket.subject}</p>
                  <p className="mt-0.5 text-xs text-white/40">
                    Opened {new Date(ticket.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                    {ticket.status === "closed" && ticket.closed_at
                      ? ` · Closed ${new Date(ticket.closed_at).toLocaleDateString("en-US", { dateStyle: "medium" })}`
                      : ""}
                  </p>
                </div>
                <span
                  className={
                    ticket.status === "open"
                      ? "shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-400"
                      : "shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/50"
                  }
                >
                  {ticket.status === "open" ? "Open" : "Closed"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
