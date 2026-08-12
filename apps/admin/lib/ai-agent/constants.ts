// Scoring weights and qualification thresholds — the single source of
// truth for the "Lead Scoring" section of the brief. Kept as named
// constants (not magic numbers scattered through tools/score.ts) so the
// Overview/Settings pages can display the exact same numbers the engine
// actually uses.

export const SCORE_MAX = {
  buyingIntent: 30,
  serviceFit: 25,
  projectRelevance: 15,
  budgetPotential: 10,
  projectActivity: 10,
  contactability: 10,
} as const;

export const SCORE_TOTAL_MAX = Object.values(SCORE_MAX).reduce((sum, n) => sum + n, 0); // 100

// A lead at or above this score is auto-qualified; below it but still a
// plausible prospect (not rejected outright) lands in "possible" — see
// tools/qualify.ts. These are defaults; a run's own `minLeadScore` (Find
// Clients page) is a SEPARATE, admin-chosen filter for what counts toward
// that run's "qualified" tally, and never lowers a lead's actual stored
// qualification_status below what these thresholds say.
export const QUALIFIED_SCORE_THRESHOLD = 70;
export const POSSIBLE_SCORE_THRESHOLD = 40;

export const DEFAULT_REQUESTED_LEADS = 20;
export const DEFAULT_MIN_LEAD_SCORE = 70;

export const OUTREACH_STATUS_LABELS: Record<string, string> = {
  not_contacted: "Not Contacted",
  ready: "Ready",
  contacted: "Contacted",
  replied: "Replied",
  no_response: "No Response",
  interested: "Interested",
  not_interested: "Not Interested",
};

export const QUALIFICATION_STATUS_LABELS: Record<string, string> = {
  new: "New",
  qualified: "Qualified",
  possible: "Possible",
  rejected: "Rejected",
  contacted: "Contacted",
  replied: "Replied",
  negotiation: "Negotiation",
  converted: "Converted",
  lost: "Lost",
};
