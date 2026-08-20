import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { TelegramLinkGate } from "../components/TelegramLinkGate";
import { normalizeOfferingKey } from "./pricing";
import { NewOrderForm } from "./NewOrderForm";

interface OfferingMeta {
  label: string;
  icon: string;
  hint: string;
}

// Keys match the `?offering=` query param app/services/page.tsx's two
// curated CTAs now link with (meme / gif). Anything else (no param, or
// an unrecognized one - e.g. someone bookmarks /order directly) falls
// back to a generic "Custom Project" framing rather than erroring, since
// this form still works fine for an unclassified request.
const OFFERING_META: Record<"meme" | "gif" | "default", OfferingMeta> = {
  meme: {
    label: "Meme Animation",
    icon: "🎭",
    hint: "Tell us the meme or character, the vibe you want, and where it'll be posted (X, Telegram, Discord...).",
  },
  gif: {
    label: "Crypto GIFs",
    icon: "✨",
    hint: "Tell us the type (welcome, GM/GN, buy alert, etc.), your project's colors/logo, and how many you need.",
  },
  default: {
    label: "Custom Project",
    icon: "🎬",
    hint: "Tell us what you'd like us to create, and any references that help explain it.",
  },
};

interface ClientProfile {
  whatsapp: string | null;
  country: string | null;
}

// New, 20 Agustus 2026, per Pasha's "harus bisa membuat order ... di
// miniapp" request. Deliberately a short-form intake, not a second copy
// of apps/app's OrderWizard (apps/app/modules/order - a large
// multi-category configurator with live pricing/bundles/installments):
// this covers exactly the two curated offerings app/services/page.tsx
// promotes. Once submitted, the client lands on this order's detail page
// (app/orders/[orderId]) where the existing negotiation flow
// (NegotiationPanel.tsx) takes over.
//
// Follow-up, same day: now offers the same two intents apps/app's own
// Order Configurator does ("Submit for review" vs "Negotiate Price") —
// see ./pricing.ts (the duration -> estimate lookup) and ./actions.ts
// (which decides `pending_review` vs `negotiating` from whether the
// client entered their own offer) for the parity with
// apps/app/modules/order/state/submit-order-action.ts's `intent` field.
export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ offering?: string }>;
}) {
  const { offering } = await searchParams;
  const offeringKey = normalizeOfferingKey(offering);
  const meta = OFFERING_META[offeringKey];

  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <TelegramLinkGate />;

  const [{ data: profile }, { data: clientData }] = await Promise.all([
    supabase.from("users").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("clients").select("whatsapp, country").eq("user_id", user.id).maybeSingle(),
  ]);
  const client = clientData as ClientProfile | null;

  return (
    <div className="page">
      <a className="back-link" href="/services">
        ‹ Back to Services
      </a>
      <h1 className="greeting">
        {meta.icon} New Order — {meta.label}
      </h1>
      <p className="subtitle">
        Share the details below. The price you&apos;ll see is a starting estimate — everything is flexible, and
        you can negotiate right here in the app until we agree.
      </p>

      <NewOrderForm
        offeringKey={offeringKey}
        offeringLabel={meta.label}
        hint={meta.hint}
        initial={{
          fullName: profile?.full_name ?? "",
          email: user.email ?? "",
          whatsapp: client?.whatsapp ?? "",
          country: client?.country ?? "",
        }}
      />
    </div>
  );
}
