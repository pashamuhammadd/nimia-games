import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { OrderForm } from "./OrderForm";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: services } = await supabase
    .from("services")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="mt-1 text-[var(--nimia-muted)]">
          Fill out the form below to submit a new project to the Nimia Games team.
        </p>
      </div>
      <OrderForm services={services ?? []} defaultEmail={user?.email ?? undefined} />
    </div>
  );
}
