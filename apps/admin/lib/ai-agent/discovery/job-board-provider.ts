import type { Candidate, DiscoveryParams, DiscoverySource } from "../types";

// Job Board discovery provider — STRUCTURED STUB, not implemented in V1.
// Same reasoning as reddit-provider.ts / web-search-provider.ts.
//
// To make this real later: pick a job board with an official public/
// partner API for freelance or gig listings relevant to animation/game-dev
// work, set JOB_BOARD_API_KEY / JOB_BOARD_PROVIDER below, and implement
// discover() to pull recent listings matching an animation-related query,
// mapping each listing's title/description/url/budget/deadline into a
// Candidate. A job listing is usually the highest-buying-intent source
// available (someone is *already* hiring), so this is a strong future
// candidate for a second real integration after Reddit.
export class JobBoardDiscoveryProvider implements DiscoverySource {
  id = "job_board";
  label = "Job Boards";
  description =
    "Freelance/gig job listings mentioning animation work — not implemented in V1. Requires a job board with " +
    "an official API (see this file's header comment).";

  isConfigured(): boolean {
    return Boolean(process.env.JOB_BOARD_API_KEY);
  }

  notConfiguredReason(): string {
    if (!this.isConfigured()) {
      return "No job board API is connected — set JOB_BOARD_API_KEY (and JOB_BOARD_PROVIDER) and implement the " +
        "listing search in job-board-provider.ts. Not implemented in V1.";
    }
    return "A job board API key is set, but this provider's discover() is still a stub in V1 — see job-board-provider.ts.";
  }

  async discover(_params: DiscoveryParams): Promise<Candidate[]> {
    await Promise.resolve();
    return [];
  }
}
