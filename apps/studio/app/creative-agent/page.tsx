import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { PublicNavbar } from "../components/PublicNavbar";
import { Footer } from "../components/Footer";
import { CreativeAgentWorkspace } from "@/modules/creative-agent";

// Not meant to be found via search — this page only ever has content for
// the specific anonymous session that started it (see CreativeAgentWorkspace's
// restore-on-mount effect, which bounces anyone else back to "/"). Same
// "noindex a personalized, mostly-empty-by-default page" reasoning as
// app/dashboard/layout.tsx.
export const metadata: Metadata = {
  title: "Nimia Creative Agent",
  robots: { index: false, follow: true },
};

// Dedicated Creative Agent conversation page (P8, 13 Agustus 2026) — split
// out of the homepage after live testing showed the original morph-in-
// place version felt cramped (see CreativeAgentSection.tsx's own comment
// on the handoff). PublicNavbar/Footer are repeated here exactly like
// app/page.tsx does (this app's root layout.tsx deliberately doesn't
// render them globally — every public page supplies its own), so this
// page keeps the same chrome/branding as the rest of the site.
export default async function CreativeAgentPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="nimia-dark">
      <PublicNavbar isAuthenticated={!!user} />
      <main>
        <CreativeAgentWorkspace />
      </main>
      <Footer />
    </div>
  );
}
