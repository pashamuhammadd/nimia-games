import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { OrderWizard } from "@/modules/order";

export const metadata: Metadata = {
  title: "Start Your Project",
  description:
    "Configure your Animation, Digital Assets, Website Development, or Game Development project step by step and get an instant estimate.",
};

// /order — the Project Configurator (multi-step wizard), reached from the
// Services page's "Start Your Project" CTA (see app/services/data.ts'
// ORDER_HREF). Deliberately NOT behind middleware.ts's /dashboard auth gate
// — a visitor can configure and price out a full project while signed out;
// only Submit (Step 7) requires an account. See
// modules/order/state/use-order-wizard.ts#submit for that redirect, and
// app/actions.ts#signInAction for the `redirectedFrom` handling that brings
// them back here afterward.
export default async function OrderPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <OrderWizard isAuthenticated={!!user} />;
}
