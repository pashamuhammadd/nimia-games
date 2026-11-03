import { z } from "zod";

// Short project intake (Nimia Studio redesign Tahap 2, 3 November 2026 —
// docs/nimia-studio-redesign/). Two service lines only (approved product
// decision); digital assets are no longer offered to new orders. Shared by
// the client form and re-validated by submitBriefOrderAction on the server.

export const SERVICE_LINES = ["animation", "development"] as const;
export type ServiceLine = (typeof SERVICE_LINES)[number];

export const PROJECT_TYPES = {
  animation: [
    { id: "character-animation", label: "Character animation" },
    { id: "music-video", label: "Music video" },
    { id: "trailer", label: "Trailer or promo" },
    { id: "motion-graphics", label: "Motion graphics" },
    { id: "animation-other", label: "Something else" },
  ],
  development: [
    { id: "website", label: "Website" },
    { id: "web-app", label: "Web app" },
    { id: "game", label: "Game" },
    { id: "development-other", label: "Something else" },
  ],
} as const satisfies Record<ServiceLine, readonly { id: string; label: string }[]>;

// The budget is a RANGE on purpose: it is the client's starting point for
// the conversation, never the final price (approved decision). Stored as
// text in orders.budget; proposed_price_usd is deliberately left null.
export const BUDGET_RANGES = [
  { id: "under-500", label: "Under $500" },
  { id: "500-1500", label: "$500 – $1,500" },
  { id: "1500-5000", label: "$1,500 – $5,000" },
  { id: "5000-15000", label: "$5,000 – $15,000" },
  { id: "15000-plus", label: "$15,000+" },
  { id: "not-sure", label: "Not sure yet" },
] as const;
export type BudgetRangeId = (typeof BUDGET_RANGES)[number]["id"];

export const MAX_BRIEF_FILES = 8;
export const MIN_DESCRIPTION_LENGTH = 30;
export const MAX_DESCRIPTION_LENGTH = 4000;

const ALL_PROJECT_TYPE_IDS = [...PROJECT_TYPES.animation, ...PROJECT_TYPES.development].map((t) => t.id);
const BUDGET_IDS = BUDGET_RANGES.map((b) => b.id);

function isFutureOrTodayIsoDate(value: string, today: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false;
  const todayIso = today.toISOString().slice(0, 10);
  return value >= todayIso;
}

/** Only files uploaded through this app's own signed Cloudinary upload
 * (folder orders/<auth user id>, see get-upload-signature-action.ts) are
 * accepted, so a client cannot attach arbitrary third-party URLs. */
export function isOwnCloudinaryUpload(url: string, userId: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      parsed.pathname.includes(`/orders/${userId}/`)
    );
  } catch {
    return false;
  }
}

export function buildBriefSchema(today: Date = new Date()) {
  return z
    .object({
      serviceLine: z.enum(SERVICE_LINES, { errorMap: () => ({ message: "Choose Animation or Development." }) }),
      projectType: z
        .string()
        .refine((value) => ALL_PROJECT_TYPE_IDS.includes(value as never), "Choose what kind of project this is."),
      title: z
        .string()
        .trim()
        .min(3, "Give your project a short name (at least 3 characters).")
        .max(120, "Keep the project name under 120 characters."),
      description: z
        .string()
        .trim()
        .min(MIN_DESCRIPTION_LENGTH, `Describe what you need in at least ${MIN_DESCRIPTION_LENGTH} characters.`)
        .max(MAX_DESCRIPTION_LENGTH, `Keep the description under ${MAX_DESCRIPTION_LENGTH} characters.`),
      budget: z
        .string()
        .refine((value) => BUDGET_IDS.includes(value as never), "Choose a budget range, or “Not sure yet”."),
      deadline: z
        .string()
        .trim()
        .refine((value) => value === "" || isFutureOrTodayIsoDate(value, today), "Pick a date from today onward.")
        .default(""),
      referenceLink: z
        .string()
        .trim()
        .refine((value) => {
          if (value === "") return true;
          try {
            const url = new URL(value);
            return url.protocol === "https:" || url.protocol === "http:";
          } catch {
            return false;
          }
        }, "Enter a full link starting with https://")
        .default(""),
      files: z
        .array(z.object({ name: z.string().trim().min(1).max(200), url: z.string().url() }))
        .max(MAX_BRIEF_FILES, `Attach up to ${MAX_BRIEF_FILES} files.`)
        .default([]),
      agreedToTerms: z.literal(true, { errorMap: () => ({ message: "Agree to the project terms to send your brief." }) }),
    })
    .refine(
      (input) => (PROJECT_TYPES[input.serviceLine] as readonly { id: string }[]).some((t) => t.id === input.projectType),
      { path: ["projectType"], message: "Choose what kind of project this is." },
    );
}

export type BriefInput = z.input<ReturnType<typeof buildBriefSchema>>;
export type BriefData = z.output<ReturnType<typeof buildBriefSchema>>;
