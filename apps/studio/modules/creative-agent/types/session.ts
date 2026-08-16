// Nimia Creative Agent — shared domain types (13 Agustus 2026 homepage
// redesign). Mirrors this repo's existing module shape (see
// modules/partners/types, modules/order/types): plain interfaces here,
// runtime validation lives next to this in ../schema.

/** One turn in the transcript, exactly as stored in
 * creative_agent_sessions.messages (packages/db/migrations/0041). */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  at: string; // ISO timestamp
}

/** The agent's cumulative understanding of the project — brief section 14's
 * field list, minus `uploaded_assets` and `client_confirmed`, which are
 * NOT part of the AI's own JSON output on purpose:
 *   - uploaded_assets doesn't exist yet (asset upload is a later phase).
 *   - client_confirmed is a deterministic client action (clicking "Yes,
 *     create my brief"), never something the model decides — see
 *     creative_agent_sessions.status / confirmed_at instead.
 * Every field is nullable/omittable: the AI is instructed to only ever
 * return what it actually knows, never invent a value to fill a gap. */
export interface StructuredProjectData {
  service: string | null;
  projectType: string | null;
  objective: string | null;
  concept: string | null;
  duration: string | null;
  characters: string[] | null;
  style: string | null;
  references: string[] | null;
  platform: string | null;
  deliverables: string[] | null;
  sound: string | null;
  deadline: string | null;
  budget: string | null;
  complexity: string | null;
  /** Plain-language notes on what's still missing and why it matters —
   * the same list surfaced to the UI as `missingInfo`, persisted here too
   * so the DB row stays a complete, self-contained snapshot. */
  missingInformation: string[] | null;
  /** A rough "starting from $X" courtesy estimate (P9, 13 Agustus 2026) —
   * ONLY ever set when the AI can reasonably reference the official
   * catalog price list it's given as context (see
   * lib/catalog-price-hints.ts), always phrased as a range, never a
   * computed total. This is NOT what `orders.proposed_price_usd` is set
   * to on Submit Order (that stays null on purpose, see
   * submit-creative-agent-order-action.ts) — it's shown to the client as
   * a courtesy signal only, clearly caveated in the AI's own reply text
   * as an estimate, not a quote. */
  estimatedPriceRange: string | null;
  /** A short, flowing-prose project summary (P9, 13 Agustus 2026) — 2-4
   * sentences written like the intro paragraph of a real creative brief,
   * not a field dump. Only ever set once readyToConfirm is true, and
   * REGENERATED FRESH each time (never appended to a prior version — see
   * system-prompt.ts's rule on this and gemini-provider.ts's comment on
   * why the earlier repetition-loop bug makes "append to previous text"
   * instructions dangerous here specifically). Shown to the client in
   * CreativeBriefCard and prepended to the order description Admin sees. */
  briefSummary: string | null;
}

export const EMPTY_STRUCTURED_DATA: StructuredProjectData = {
  service: null,
  projectType: null,
  objective: null,
  concept: null,
  duration: null,
  characters: null,
  style: null,
  references: null,
  platform: null,
  deliverables: null,
  sound: null,
  deadline: null,
  budget: null,
  complexity: null,
  missingInformation: null,
  estimatedPriceRange: null,
  briefSummary: null,
};

export type CreativeAgentSessionStatus = "active" | "confirmed" | "abandoned";

/** Pay in Full vs Pay in Installments (16 Agustus 2026, Fase 6 of the
 * Order/Payment/Invoice/Creative Agent refactor — see FASE0-AUDIT.md's
 * Implementation Order item 6: "Creative Agent tidak punya step payment
 * method" was one of the 7 gaps order_flow_simulation_16agst.md's audit
 * found). Same two literal values as modules/order's
 * `CustomOrderPaymentMethod` (apps/app) and `public.order_payment_method`
 * (packages/db/migrations/0038_custom_order_installments.sql) — kept as
 * its own local type rather than importing across apps (apps/studio and
 * apps/app are separate Next.js apps in this monorepo; only packages/* is
 * shared between them), but the literal strings MUST stay in sync with
 * both, since this value is written straight to `orders.payment_method`
 * (see state/submit-creative-agent-order-action.ts). Unlike the Order
 * Wizard's PaymentMethodStep, there is no dollar-amount preview shown
 * alongside this choice — a Creative Agent order never has a
 * client-computed price (`proposed_price_usd` stays null on purpose, see
 * that file's own header comment: the team prices it after review), so
 * there is no subtotal to split a preview off of. */
export type CreativeAgentPaymentMethod = "full_payment" | "installments";

/** A reference file the visitor attached mid-chat (P5, 13 Agustus 2026) —
 * uploaded straight to Cloudinary from the browser, never through the AI.
 * See packages/db/migrations/0042's column comment. */
export interface UploadedAsset {
  name: string;
  url: string;
}

/** Row shape of creative_agent_sessions, as read back by the repository
 * (camelCase — mapped from the snake_case columns at the repository
 * boundary, same convention as modules/partners/repository). */
export interface CreativeAgentSession {
  id: string;
  sessionToken: string;
  clientId: string | null;
  status: CreativeAgentSessionStatus;
  messages: ChatMessage[];
  structuredData: StructuredProjectData;
  uploadedAssets: UploadedAsset[];
  turnCount: number;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  /** Set once this session became a real order (P7) — see
   * submit-creative-agent-order-action.ts. Also doubles as the client-side
   * signal that Submit Order/Negotiate Price already succeeded. */
  orderId: string | null;
}
