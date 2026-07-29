import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  buttonVariants,
} from "@nimia/ui";

export const metadata = { title: "Overview" };

export default async function DashboardOverviewPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const { data: client } = await supabase
    .from("clients")
    .select("id, company_name")
    .eq("user_id", user!.id)
    .single();

  let orderCount = 0;
  if (client) {
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("client_id", client.id);
    orderCount = count ?? 0;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">
          Hi{profile?.full_name ? `, ${profile.full_name}` : ""} 👋
        </h1>
        <p className="mt-1 text-[var(--nimia-muted)]">
          {client?.company_name ?? user?.email}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total orders</CardTitle>
            <CardDescription>All orders you&apos;ve ever submitted.</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-black">{orderCount}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submit a new order</CardTitle>
            <CardDescription>
              Start a new project — 3D animation, game trailer, and more.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/orders" className={buttonVariants({ size: "sm" })}>
              New order
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projects &amp; invoices</CardTitle>
            <CardDescription>
              Project tracking and invoicing are coming in Phase 5.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
