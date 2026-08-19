// Shared types for the Nimia AI Prospect Hunter (V2 — CoinGecko-powered
// crypto/Web3 project prospecting for Nimia Studio's animation services).
//
// Replaces the "AI Client Hunter" (V1)'s types.ts wholesale, not
// incrementally — V1 modeled a "Candidate" as a person's natural-language
// post expressing hiring intent (Reddit/Demo/Job Board). V2 has no such
// text: every discovered thing is a PROJECT with structured CoinGecko
// data. Mirrors packages/db/migrations/0040_ai_prospect_hunter.sql
// exactly — if you add a value to one, add it here too.

export type AiOpportunityLevel = "very_high" | "high" | "medium" | "low" | "none";

export type AiCommercialPotential = "very_high" | "high" | "medium" | "low";

export type AiAnalysisStatus = "pending" | "completed" | "failed";

// Spec's own pipeline (section 13): Project -> Animation Opportunity ->
// Qualified Prospect -> Contacted -> Replied -> Negotiation -> Client.
// 'project' is the floor every discovered project starts at — a CoinGecko
// listing is NOT automatically a lead. Everything from 'contacted' onward
// only ever changes from an explicit admin action (apps/admin's
// actions.ts), never automatically.
export type AiProspectStatus =
  | "project"
  | "opportunity"
  | "qualified_prospect"
  | "contacted"
  | "replied"
  | "negotiation"
  | "client"
  | "rejected";

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
// Category tiers (spec section 6)
// ------------------------------------------------------------------

export type CategoryTier = 1 | 2 | 3 | 4;

export type CategoryTierInfo = {
  tier: CategoryTier;
  label: string;
  /** CoinGecko category slugs (from /coins/categories/list) belonging to
   * this tier. Best-effort curated list — CoinGecko renames/splits
   * categories occasionally, so this is verified periodically against the
   * live endpoint rather than assumed permanent; see
   * discovery/coingecko-project-provider.ts's header comment. */
  categorySlugs: string[];
};

// ------------------------------------------------------------------
// Discovery layer
// ------------------------------------------------------------------

/** What the Find Prospects page collects and hands to the orchestrator. */
export type DiscoveryParams = {
  /** CoinGecko category slugs to search — empty means "every tier's
   * categories" (the registry's default sweep, constants.ts's
   * defaultSweepCategorySlugs()). */
  categorySlugs: string[];
  /** How many candidates THIS source should try to return. */
  limit: number;
  /** Every coingecko_id (or the "nft:{id}" form ai_projects.coingecko_id
   * uses for NFT-sourced rows) already saved to ai_projects — PERMANENTLY,
   * not a time-boxed cache. Product decision, 19 Aug 2026: a project
   * already discovered once is already sitting in the admin's Projects
   * list, so a later "Find Prospects" run should never re-spend its
   * limited CoinGecko detail-call budget re-showing it — that budget
   * should always go toward something genuinely new. This run should skip
   * spending a detail-call on any of these ids entirely; skipping just
   * means "leave the existing saved row alone", never invents anything
   * (spec section 21 is unaffected). Trade-off: an excluded project's
   * market data is never refreshed by a later run either — see
   * orchestrator.ts's own comment on this list's construction for the
   * full reasoning. Populated by the orchestrator from ai_projects before
   * discovery starts; a discovery source may ignore this if it can't
   * cheaply honor it. */
  excludeCoingeckoIds?: string[];
};

/** One project pulled from CoinGecko, before AI analysis/scoring —
 * deliberately "dumb": discovery's only job is to fetch and structurally
 * normalize what CoinGecko's API actually returned, never to judge
 * whether it's a real prospect. Every field here must be a verifiable
 * fact from the API response (spec section 21) — never an inference
 * dressed up as a fact (that's what tools/scoreProject.ts is for). */
export type DiscoveredProject = {
  discoverySourceId: string;
  coingeckoId: string;
  name: string;
  symbol: string | null;
  description: string | null;
  /** CoinGecko's own category labels, verbatim (human-readable, e.g.
   * "Gaming (Games)") — for display only. */
  categories: string[];
  /** CoinGecko category SLUGS (the /coins/markets?category=X query
   * parameter, e.g. "gaming") that this project was actually discovered
   * under — the authoritative value tools/scoreProject.ts's Category Fit
   * factor matches against constants.ts's CATEGORY_TIERS, since CoinGecko
   * has no reliable way to derive a slug back out of its own
   * human-readable `categories` labels above. Populated by whichever
   * discovery call actually found this project; never guessed. */
  matchedCategorySlugs: string[];
  logoUrl: string | null;

  homepageUrl: string | null;
  whitepaperUrl: string | null;
  docsUrl: string | null;
  explorerUrl: string | null;
  blockchainPlatforms: string[];

  /** From CoinGecko's `genesis_date` — null when not provided. Never the
   * same thing as `firstListedAt` below; see that field's own comment. */
  launchDate: string | null;
  /** ISO timestamp of when CoinGecko says this was added to ITS OWN
   * listings (only available for very recently listed coins via
   * /coins/list/new) — null otherwise. Never confused with launchDate in
   * any UI copy or AI reasoning text (spec section 8's explicit
   * requirement). */
  firstListedAt: string | null;

  currentPriceUsd: number | null;
  marketCapUsd: number | null;
  fullyDilutedValuationUsd: number | null;
  volume24hUsd: number | null;
  marketCapRank: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  athUsd: number | null;
  athDate: string | null;
  atlUsd: number | null;
  atlDate: string | null;
  priceChange24hPct: number | null;

  socialLinks: ProjectSocialLinks;
  developerLinks: ProjectDeveloperLinks;

  /** The exact API response this was built from — passed straight
   * through to ai_projects.raw_source_data. */
  rawSourceData: unknown;

  isDemo: boolean;
};

export type ProjectSocialLinks = {
  twitter: string | null;
  telegram: string | null;
  discord: string | null;
  reddit: string | null;
  facebook: string | null;
};

export type ProjectDeveloperLinks = {
  github: string[];
  sourceCode: string[];
};

export type DiscoverySourceStatus = {
  id: string;
  label: string;
  description: string;
  configured: boolean;
  /** Shown in the Find Prospects UI next to a source that exists in the
   * registry but isn't wired to a live API yet — never silently pretend
   * to search when this is set. */
  notConfiguredReason?: string;
};

export interface DiscoverySource {
  id: string;
  label: string;
  description: string;
  /** True only for a source that can actually reach a live, authorized
   * API right now (all required env vars present). */
  isConfigured(): boolean;
  notConfiguredReason?(): string;
  discover(params: DiscoveryParams): Promise<DiscoveredProject[]>;
}

// ------------------------------------------------------------------
// Analysis / scoring (spec section 12)
// ------------------------------------------------------------------

export type ScoreFactor = {
  score: number;
  max: number;
  reasons: string[];
};

export type OpportunityScoreBreakdown = {
  categoryFit: ScoreFactor; // 0-25
  visualPotential: ScoreFactor; // 0-20
  commercialPotential: ScoreFactor; // 0-20
  activity: ScoreFactor; // 0-15
  brandPresence: ScoreFactor; // 0-10
  contactability: ScoreFactor; // 0-10
  total: number; // 0-100
};

/** Fully analyzed project, shaped to insert directly into
 * ai_projects + ai_project_analysis (camelCase here, snake_case at the DB
 * boundary — see tools/save.ts's mapping). */
export type AnalyzedProject = {
  runId: string | null;
  discoverySourceId: string;
  project: DiscoveredProject;

  animationOpportunity: AiOpportunityLevel;
  opportunityScore: number;
  scoreBreakdown: OpportunityScoreBreakdown;
  projectFit: number;
  commercialPotential: AiCommercialPotential;
  recommendedServices: string[];
  /** Project-specific reasoning — never the spec's own "BAD" example
   * ("This project is on CoinGecko, therefore it may need animation").
   * See tools/scoreProject.ts's reasoning builder. */
  reasoning: string;
};

// ------------------------------------------------------------------
// Agent run
// ------------------------------------------------------------------

export type AgentRunParams = {
  /** CoinGecko category slugs to target — empty means every configured
   * tier. */
  categorySlugs: string[];
  requestedTarget: number;
  minOpportunityScore: number;
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
  projectsDiscovered: number;
  projectsAnalyzed: number;
  qualifiedOpportunities: number;
  rejectedProjects: number;
  errors: AgentRunError[];
  isDemo: boolean;
};
