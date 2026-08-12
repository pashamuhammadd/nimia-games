import type { EvidenceItem } from "./types";
import { callAiProvider, isAiProviderConfigured } from "./provider";

// Outreach Generator (brief section 17) — produces an EDITABLE draft, and
// only ever a draft. Nothing in this file sends anything; see
// apps/admin/app/(protected)/ai-client-hunter/actions.ts for the actual
// human-in-the-loop boundary (generateOutreachAction only INSERTs into
// ai_outreach, never contacts the prospect, and nothing flips
// ai_leads.outreach_status without an explicit separate admin action).
//
// The deterministic template below is always what gets saved — it only
// ever quotes the lead's OWN evidence and Nimia's actual matched
// service, so it can never fabricate a claim. The optional AI provider
// (../provider.ts) is used purely to smooth the wording of that same
// template into more natural prose; its output is discarded (falls back
// to the deterministic draft) if the provider isn't configured, errors,
// or — as a final safety net — omits every evidence quote the
// deterministic draft included (a cheap signal it may have drifted from
// the source material).

export type OutreachLeadInput = {
  prospectName: string | null;
  projectName: string | null;
  username: string | null;
  platform: string;
  detectedService: string | null;
  animationType: string | null;
  detectedNeed: string | null;
  evidence: EvidenceItem[];
};

function buildDeterministicDraft(lead: OutreachLeadInput): string {
  const name = lead.prospectName || lead.projectName || lead.username || "there";
  const service = lead.animationType || lead.detectedService;
  const quote = lead.evidence[0]?.quote;

  const lines: string[] = [];
  lines.push(`Hi ${name},`);
  lines.push("");

  if (quote) {
    lines.push(`Came across your post on ${lead.platform} — saw you mentioned: "${quote}"`);
  } else {
    lines.push(`Came across your post on ${lead.platform} about your project.`);
  }

  if (service) {
    lines.push(
      `I'm reaching out from Nimia Studio — we do frame-by-frame animation, and ${service.toLowerCase()} is exactly the kind of work we focus on. Happy to share some examples if it'd be useful.`,
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
  lead: OutreachLeadInput,
): Promise<{ message: string; aiAssisted: boolean; note?: string }> {
  const deterministicDraft = buildDeterministicDraft(lead);

  if (!isAiProviderConfigured()) {
    return { message: deterministicDraft, aiAssisted: false };
  }

  const result = await callAiProvider({
    system:
      "You rewrite short outreach message drafts for Nimia Studio, an animation studio, to sound warmer and more " +
      "natural. STRICT RULES: never add any fact, claim, budget figure, deadline, or portfolio example that is not " +
      "already present in the draft you're given. Never claim Nimia was personally recommended. Never invent a " +
      "quote from the prospect beyond what's already quoted in the draft. Keep it short (under 120 words), " +
      "friendly, not salesy. Return ONLY the rewritten message text, no preamble.",
    prompt: `Rewrite this outreach draft:\n\n${deterministicDraft}`,
    maxTokens: 300,
  });

  if ("text" in result) {
    // Safety net: if the draft quoted the prospect's own words and the
    // rewrite dropped that quote entirely, prefer the deterministic
    // version rather than risk a rewrite that drifted from the evidence.
    const quote = lead.evidence[0]?.quote;
    if (quote && !result.text.includes(quote.slice(0, Math.min(20, quote.length)))) {
      return {
        message: deterministicDraft,
        aiAssisted: false,
        note: "AI rewrite omitted the original evidence quote, so the deterministic draft was used instead.",
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
