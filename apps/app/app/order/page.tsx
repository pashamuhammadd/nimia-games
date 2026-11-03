import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@nimia/db";
import { OrderHeader } from "@/modules/order";
import { BriefIntakeForm } from "@/modules/brief-intake";

// /order — Nimia Studio redesign Tahap 2 (3 November 2026,
// docs/nimia-studio-redesign/). Decisions applied here:
//   - Login BEFORE filling in the brief (signed-out visitors are sent to
//     /login and come straight back via redirectedFrom).
//   - The old configurator (Project Builder / Packages / Custom Builder,
//     modules/order's OrderWizard) is no longer linked or rendered. Its
//     code stays in modules/order because existing orders, pricing tests
//     and shared helpers (upload, header) still use it.
//   - Only Animation and Development are offered; digital assets are not.
export const metadata: Metadata = {
  title: "Start a project",
  description:
    "Tell Nimia Studio what you need — animation or development — with your budget range. We agree on scope and price together before anything is billed.",
  alternates: {
    canonical: "/order",
  },
  robots: { index: false, follow: true },
};

export default async function OrderPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectedFrom=${encodeURIComponent("/order")}`);
  }

  return (
    <div className="nimia-dark min-h-screen">
      <OrderHeader isAuthenticated />
      <main id="main" className="mx-auto max-w-2xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
        <BriefIntakeForm />
      </main>
    </div>
  );
}
