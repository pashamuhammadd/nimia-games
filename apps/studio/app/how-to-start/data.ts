import type { LucideIcon } from "lucide-react";
import {
  UserRound,
  Package,
  FileText,
  MessageCircle,
  Wallet,
  Cog,
  BadgeCheck,
  ReceiptText,
  MessageSquareText,
  Lock,
  LayoutDashboard,
} from "lucide-react";

// Single source of truth for the /how-to-start page (replaces /contact,
// 30 Juli 2026 brief; Section 2 rebuilt into a single-active-step "product
// tour" carousel, 30 Juli 2026 second brief). Kept as plain data, separate
// from the section components, same pattern as app/services/data.ts and
// app/portfolio/data.ts.

// Both CTA targets reuse the SAME destinations already used across the
// rest of the site (/services' ORDER_HREF, the navbar's "Start a Project"
// link) — /dashboard/orders is the existing generic order form, gated by
// middleware.ts so an unauthenticated visitor is bounced to /login first.
// That's intentional here: Step 1 of this very page ("Create Your
// Account") describes exactly that requirement.
export const ORDER_HREF = "/dashboard/orders";
export const SERVICES_HREF = "/services";

export interface FlowStep {
  label: string;
  accent?: boolean;
}

export interface JourneyStep {
  number: string;
  // Short 1-2 word label for the roadmap strip / progress rail (product
  // tour redesign, 30 Juli 2026) — kept separate from `title` so the full,
  // exact step name/description stays completely unabridged inside the
  // active step card. No information from the original 7-step version was
  // removed; this field is purely an ADDITIONAL compact label for the
  // roadmap UI. Fixed 30 Juli 2026 (audit, third session): Step 6's
  // shortLabel used to say "Production" while its card title is "Payment
  // Verification" and Step 7 is titled "Production & Delivery" — the
  // roadmap strip ended up showing "Production" one step before the stage
  // that's actually about production, which read as misleading at a
  // glance. Step 6 now uses "Verification" so the roadmap strip matches
  // its own card title exactly.
  shortLabel: string;
  title: string;
  description: string;
  icon: LucideIcon;
  highlight?: boolean;
  badge?: string;
  flow?: FlowStep[];
  checklist?: string[];
  chips?: string[];
}

// SECTION 2 — "Your Journey with Nimia". Exactly 7 steps, order fixed by
// the brief. Step 4 ("Negotiate the Price") is the flagship step — it's
// the only one with `highlight: true`, a `badge`, a `flow` diagram, AND a
// `checklist`, which is what the active-step card uses to render it larger
// and more elaborate than the other six. Step 6 also carries a `flow` (its
// own, smaller verification diagram) and Step 5 carries `chips` for the
// supported payment networks — both data-driven through the same optional
// fields rather than one-off markup.
export const JOURNEY_STEPS: JourneyStep[] = [
  {
    number: "01",
    shortLabel: "Create Account",
    title: "Create Your Account",
    description:
      "Create your Nimia Studio account to access your personal dashboard where you can manage projects, payments, files, invoices, and progress.",
    icon: UserRound,
  },
  {
    number: "02",
    shortLabel: "Choose Service",
    title: "Choose a Service",
    description:
      "Select the service you need such as Animation, Game Development, or Website Development.",
    icon: Package,
  },
  {
    number: "03",
    shortLabel: "Submit Project",
    title: "Submit Your Project",
    description:
      "Complete the order form by describing your project, uploading reference files, selecting your preferred style, timeline, and payment network.",
    icon: FileText,
  },
  {
    number: "04",
    shortLabel: "Negotiate",
    title: "Negotiate the Price",
    description:
      "Every project starts with an estimated price based on the selected service. If the estimate doesn't fit your budget, you can submit your own offer. Our team will review your proposal and either approve it or send a counter offer. The project only moves forward once both parties agree on the final price.",
    icon: MessageCircle,
    highlight: true,
    badge: "⭐ Flexible Pricing",
    flow: [
      { label: "Estimated Price" },
      { label: "$100" },
      { label: "Your Offer" },
      { label: "$80" },
      { label: "Counter Offer" },
      { label: "$90" },
      { label: "Agreement" },
      { label: "Production Starts", accent: true },
    ],
    checklist: ["Price Negotiation Available", "No Hidden Fees", "Fair Pricing"],
  },
  {
    number: "05",
    shortLabel: "Payment",
    title: "Complete Payment",
    description:
      "After the quotation has been approved, you'll receive payment instructions based on your selected blockchain network. Once you've sent the transfer, simply submit your Transaction Hash through your dashboard.",
    icon: Wallet,
    chips: ["USDT", "USDC", "SOL", "ETH", "BNB", "Polygon", "+ more"],
  },
  {
    number: "06",
    shortLabel: "Verification",
    title: "Payment Verification",
    description:
      "Our team verifies your transaction directly on the blockchain. Once confirmed, you'll receive a notification and your project status will automatically change to Production.",
    icon: Cog,
    flow: [
      { label: "Transfer" },
      { label: "Submit TX Hash" },
      { label: "Verification" },
      { label: "Approved", accent: true },
    ],
  },
  {
    number: "07",
    shortLabel: "Delivery",
    title: "Production & Delivery",
    description:
      "Track your project progress directly from your dashboard. Receive progress updates, download deliverables, request revisions, and access your invoice anytime.",
    icon: BadgeCheck,
  },
];

export interface WhyDifferentItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

// SECTION 3 — "Why Our Process is Different". Exactly 4 cards.
export const WHY_DIFFERENT: WhyDifferentItem[] = [
  {
    icon: ReceiptText,
    title: "Transparent Pricing",
    description: "Every quotation is clearly explained before production begins.",
  },
  {
    icon: MessageSquareText,
    title: "Negotiation Friendly",
    description: "Every client can discuss pricing before making any payment.",
  },
  {
    icon: Lock,
    title: "Secure Payments",
    description: "Payments are verified before production starts.",
  },
  {
    icon: LayoutDashboard,
    title: "Project Dashboard",
    description: "Monitor your project status, files, invoices, and updates in one place.",
  },
];

export interface FaqItem {
  question: string;
  answer: string;
}

// SECTION 4 — FAQ accordion. Exactly 6 questions, order fixed by the brief.
export const FAQS: FaqItem[] = [
  {
    question: "Can I negotiate the price?",
    answer: "Yes. Every quotation can be negotiated before payment.",
  },
  {
    question: "When do I pay?",
    answer: "Only after the quotation has been approved by both parties.",
  },
  {
    question: "How do I submit payment?",
    answer:
      "Transfer to the provided wallet address, then submit your Transaction Hash through your dashboard.",
  },
  {
    question: "How is payment verified?",
    answer: "Our team verifies every blockchain transaction before production begins.",
  },
  {
    question: "Can I request revisions?",
    answer: "Yes. Revision availability depends on your selected package.",
  },
  {
    question: "Do you work with international clients?",
    answer: "Yes. We work with clients worldwide.",
  },
];
