import { AgentAvatar } from "./AgentAvatar";

// Three-dot pulse shown in place of the agent's next bubble while a
// request is in flight — see .nimia-typing-dot (globals.css) for the
// keyframe. Deliberately calm/slow, not a snappy chat-app spinner (brief
// §2: this is a consultant, not a chatbot).
export function TypingIndicator() {
  return (
    <div className="nimia-message-in flex items-start gap-3" aria-live="polite" aria-label="Nimia Creative Agent is typing">
      <AgentAvatar />
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-[var(--nimia-gold-soft)] bg-[var(--nimia-surface)] px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden="true"
            style={{ animationDelay: `${i * 0.15}s` }}
            className="nimia-typing-dot h-1.5 w-1.5 rounded-full bg-[var(--nimia-gold)]"
          />
        ))}
      </div>
    </div>
  );
}
