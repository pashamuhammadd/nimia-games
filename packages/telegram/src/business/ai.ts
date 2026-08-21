import { detectBudgetInText } from "./lead-parser";

// AI Layer foundation (brief §10, §16 folder structure) — deliberately a
// STUB in v1: a real Nimia Studio AI Agent (mentioned in the brief as a
// future integration, not something to build now) would replace
// `interpretLeadMessage`'s body with an actual model call, WITHOUT
// requiring any change to conversation.ts (app/lib/business-bot), which
// only ever calls this function's exported interface, never
// detectBudgetInText directly. This is the whole point of a separate AI
// Layer: the Telegram/Conversation layers stay unaware of whether
// "understand this message" is a regex today or a model call tomorrow.

export interface LeadMessageInterpretation {
  detectedBudget: string | null;
}

/** Today: a thin pass-through to the regex heuristic in lead-parser.ts.
 * Tomorrow: swap this body for a real AI Agent call (e.g. extracting
 * budget AND a structured brief summary, suggesting a service category
 * from free text on the "Tell Me More" path, etc.) — every call site
 * (conversation.ts) already goes through this function, so that swap
 * never touches the conversation state machine itself. */
export function interpretLeadMessage(text: string): LeadMessageInterpretation {
  return { detectedBudget: detectBudgetInText(text) };
}
