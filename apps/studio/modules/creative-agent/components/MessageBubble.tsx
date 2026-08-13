import { cn } from "@nimia/ui";
import { AgentAvatar } from "./AgentAvatar";

export interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  /** Assistant messages that carry a provider failure reason are styled
   * a touch more muted than a normal reply, without looking like a scary
   * error box — this is still a warm consultant, not a system alert. */
  isNotice?: boolean;
}

export function MessageBubble({ role, content, isNotice }: MessageBubbleProps) {
  const isAgent = role === "assistant";

  return (
    <div className={cn("nimia-message-in flex items-start gap-3", isAgent ? "justify-start" : "justify-end")}>
      {isAgent ? <AgentAvatar /> : null}
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] leading-relaxed sm:max-w-[75%]",
          isAgent
            ? cn(
                "rounded-tl-sm border text-[var(--foreground)]",
                isNotice
                  ? "border-[var(--nimia-border)] bg-[var(--nimia-surface)] text-[var(--nimia-muted)]"
                  : "border-[var(--nimia-gold-soft)] bg-[var(--nimia-surface)]",
              )
            : "rounded-tr-sm bg-[var(--nimia-crimson)] text-white",
        )}
      >
        {content}
      </div>
    </div>
  );
}
