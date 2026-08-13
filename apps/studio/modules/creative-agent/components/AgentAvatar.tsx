import { Bot } from "lucide-react";

// Shared "who's talking" mark for Nimia Creative Agent — used by both
// MessageBubble (agent replies) and TypingIndicator (while a reply is in
// flight), so the two always stay visually identical. Swapped from a
// generic Sparkles glyph to Bot (13 Agustus 2026, per user feedback after
// seeing the live chat — a recognizable "this is the AI" mark reads better
// than a sparkle, which could be mistaken for a decorative flourish).
export function AgentAvatar() {
  return (
    <div
      aria-hidden="true"
      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--nimia-gold-soft)]"
    >
      <Bot className="h-4 w-4 text-[var(--nimia-gold)]" />
    </div>
  );
}
