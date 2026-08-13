import { callAiProvider, isAiProviderConfigured } from "./provider";

// Outreach Generator (spec section 19) — produces an EDITABLE draft, and
// only ever a draft. Nothing in this file sends anything; see
// apps/admin/app/(protected)/ai-prospect-hunter/actions.ts for the actual
// human-in-the-loop boundary (generateOutreachAction only INSERTs into
// ai_outreach, never contacts the project, and nothing flips
// ai_prospect_status.outreach_status without an explicit separate admin
// action).
//
// The deterministic template below is always what gets saved — it only
// ever cites the project's OWN category/services/market data, so it can
// never fabricate a claim. The optional AI provider (./provider.ts) is
// used purely to smooth the wording of that same template into more
// natural prose; its output is discarded (falls back to the deterministic
// draft) if the provider isn't configured, errors, or drops the project's
// name entirely (a cheap signal it may have drifted from the source
// material).

export type OutreachProjectInput = {
  name: string;
  symbol: string | null;
  category: string | null;
  recommendedServices: string[];
  reasoning: string;
  twitterUrl: string | null;
};

function buildDeterministicDraft(project: OutreachProjectInput): string {
  const service = project.recommendedServices[0];

  const lines: string[] = [];
  lines.push(`Hi ${project.name} team,`);
  lines.push("");
  lines.push(
    `We came across ${project.name}${project.symbol ? ` ($${project.symbol})` : ""} while researching ${project.category ?? "Web3"} projects.`,
  );

  if (service) {
    lines.push(
      `I'm reaching out from Nimia Studio — we do frame-by-frame animation, and ${service.toLowerCase()} is exactly the kind of work we focus on for projects like yours. Happy to share some examples if it'd be useful.`,
    );
  } else {
    lines.push(
      "I'm reaching out from Nimia Studio — we do frame-by-frame animation work and thought this might be a good fit. Happy to share some examples if it'd be useful.",
    );
  }

  lines.push("");
  lines.push("No pressure at all if the timing isn't right — just let me know if you'd like to see more or chat about the project.");
  lines.push("");
  lines.push("— Nimia Studio");

  return lines.join("\n");
}

export async function generateOutreachDraft(
  project: OutreachProjectInput,
): Promise<{ message: string; aiAssisted: boolean; note?: string }> {
  const deterministicDraft = buildDeterministicDraft(project);

  if (!isAiProviderConfigured()) {
    return { message: deterministicDraft, aiAssisted: false };
  }

  const result = await callAiProvider({
    system:
      "You rewrite short outreach message drafts for Nimia Studio, an animation studio, to sound warmer and more " +
      "natural. STRICT RULES: never add any fact, claim, market data, or portfolio example that is not already " +
      "present in the draft you're given. Never claim Nimia was personally recommended. Keep it short (under 120 " +
      "words), friendly, not salesy. Return ONLY the rewritten message text, no preamble.",
    prompt: `Rewrite this outreach draft:\n\n${deterministicDraft}`,
    maxTokens: 300,
  });

  if ("text" in result) {
    if (!result.text.toLowerCase().includes(project.name.toLowerCase().slice(0, 6))) {
      return {
        message: deterministicDraft,
        aiAssisted: false,
        note: "AI rewrite dropped the project's own name, so the deterministic draft was used instead.",
      };
    }
    return { message: result.text, aiAssisted: true };
  }

  return {
    message: deterministicDraft,
    aiAssisted: false,
    note: "configured" in result && !result.configured ? result.reason : "AI provider unavailable — used the deterministic draft.",
  };
}
