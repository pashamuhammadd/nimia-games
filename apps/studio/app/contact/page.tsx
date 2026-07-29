import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { PublicNavbar } from "../components/PublicNavbar";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="nimia-dark">
      <PublicNavbar isAuthenticated={!!user} />

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <h1 className="nimia-font-display text-3xl font-bold tracking-tight">Contact</h1>
          <p className="mx-auto mt-2 max-w-lg text-[var(--nimia-muted)]">
            Have a project in mind, or just a question? Send us a message and
            we&apos;ll get back to you by email.
          </p>
        </div>

        <ContactForm />
      </main>
    </div>
  );
}
