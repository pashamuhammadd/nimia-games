import type { AiProvider } from "./types";
import { geminiProvider } from "./gemini-provider";

export type { AiProvider, AiTurnResult } from "./types";

// Provider selector — reads CREATIVE_AGENT_PROVIDER (default "gemini") and
// returns the matching implementation. Adding a second provider later
// (OpenAI, Anthropic, a local model) means one new file next to
// gemini-provider.ts plus one more `case` here — nothing in service/ or
// components/ needs to change. Mirrors apps/admin/lib/ai-agent/
// provider.ts's own "AI_PROVIDER selects the implementation, unimplemented
// values fail gracefully" posture.
export function getAiProvider(): AiProvider {
  const provider = process.env.CREATIVE_AGENT_PROVIDER || "gemini";

  switch (provider) {
    case "gemini":
      return geminiProvider;
    default:
      return {
        async understand() {
          return {
            ok: false,
            reason: `CREATIVE_AGENT_PROVIDER="${provider}" is not implemented. Only "gemini" is supported right now.`,
          };
        },
      };
  }
}
