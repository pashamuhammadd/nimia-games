// Shared types for the Nimia AI Animation Client Hunter (V1).
//
// Kept as one file rather than scattered per-module — this whole package
// is small enough that a single source of truth for the shapes flowing
// through Discovery -> Tools -> Orchestrator -> Database is more useful
// than avoiding a "big types file". Mirrors the enum values created in
// packages/db/migrations/0039_ai_client_hunter.sql exactly — if you add a
// value to one, add it here too.

export type AiBuyingIntent = "high" | "medium" | "low" | "none";

export type AiQualificationStatus =
  | "new"
  | "qualified"
  | "possible"
  | "rejected"
  | "contacted"
  | "replied"
  | "negotiation"
  | "converted"
  | "lost";

export type AiOutreachStatus =
  | "not_contacted"
  | "ready"
  | "contacted"
  | "replied"
  | "no_response"
  | "interested"
  | "not_interested";

export type AiRunStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

// ------------------------------------------------------------------
// Discovery layer
// ------------------------------------------------------------------

/** What the Find Clients page collects and hands to the orchestrator. */
export type DiscoveryParams = {
  target: string;
  serviceFilter?: string | null;
  audienceFilter?: string | null;
  /** How many candidates THIS source should try to return — the
   * orchestrator asks each enabled source for a share of
   * requestedLeads, not the full amount, so one source running hot
   * doesn't crowd out the others. */
  limit: number;
};

/** One unanalyzed hit from a discovery source, before any AI
 * analysis/scoring — deliberately "dumb": a source's only job is to find
 * candidate text and where it came from, never to judge whether it's a
 * real prospect. `text` is the exact raw content the qualification
 * engine will quote as evidence from, so a source must never summarize,
 * translate, or embellish it. */
export type Candidate = {
  discoverySourceId: string;
  platform: string;
  externalId?: string | null;
  username?: string | null;
  prospectName?: string | null;
  title?: string | null;
  text: string;
  sourceUrl: string | null;
  projectUrl?: string | null;
  postedAt?: string | null;
  contactMethod?: string | null;
  contactUrl?: string | null;
  isDemo: boolean;
};

export type DiscoverySourceStatus = {
  id: string;
  label: string;
  description: string;
  configured: boolean;
  /** Shown in the Find Clients UI next to a source that exists in the
   * registry but isn't wired to a live API yet — never silently pretend
   * to search when this is set. */
  notConfiguredReason?: string;
};

export interface DiscoverySource {
  id: string;
  label: string;
  description: string;
  /** True only for a source that can actually reach a live, authorized
   * API right now (all required env vars present). The Demo provider is
   * always configured; every other V1 provider is a structured stub that
   * returns configured=false until real credentials + an implementation
   * are added — see each provider file's own comment. */
  isConfigured(): boolean;
  /** Human-readable reason discover() would refuse to run, shown in the
   * UI when isConfigured() is false. */
  notConfiguredReason?(): string;
  discover(params: DiscoveryParams): Promise<Candidate[]>;
}

// ------------------------------------------------------------------
// Analysis / scoring
// ------------------------------------------------------------------

export type ScoreFactor = {
  score: number;
  max: number;
  reasons: string[];
};

export type ScoreBreakdown = {
  buyingIntent: ScoreFactor;
  serviceFit: ScoreFactor;
  projectRelevance: ScoreFactor;
  budgetPotential: ScoreFactor;
  projectActivity: ScoreFactor;
  contactability: ScoreFactor;
  total: number;
};

export type EvidenceItem = {
  quote: string;
  sourceUrl: string | null;
};

/** Fully analyzed lead, shaped to insert directly into `ai_leads`
 * (camelCase here, snake_case at the DB boundary — see
 * tools/save.ts's mapping). */
export type AnalyzedLead = {
  runId: string | null;
  projectName: string | null;
  prospectName: string | null;
  username: string | null;
  platform: string;
  sourceUrl: string | null;
  projectUrl: string | null;
  detectedService: string | null;
  animationType: string | null;
  projectDescription: string;
  detectedNeed: string | null;
  buyingIntent: AiBuyingIntent;
  budgetInformation: string | null;
  deadlineInformation: string | null;
  leadScore: number;
  scoreBreakdown: ScoreBreakdown;
  qualificationStatus: AiQualificationStatus;
  qualificationReason: string;
  evidence: EvidenceItem[];
  contactMethod: string | null;
  contactUrl: string | null;
  isDemo: boolean;
  dedupeKey: string;
  discoverySourceId: string;
  rawSnippet: string;
};

// ------------------------------------------------------------------
// Agent run
// ------------------------------------------------------------------

export type AgentRunParams = {
  target: string;
  serviceFilter?: string | null;
  audienceFilter?: string | null;
  requestedLeads: number;
  minLeadScore: number;
  sourceIds: string[];
  createdBy: string | null;
};

export type AgentRunError = {
  step: string;
  message: string;
  at: string;
};

export type AgentRunSummary = {
  runId: string;
  status: AiRunStatus;
  candidatesFound: number;
  candidatesAnalyzed: number;
  qualifiedLeads: number;
  rejectedLeads: number;
  errors: AgentRunError[];
  isDemo: boolean;
};
