"use client";

import * as React from "react";
import type { ChatMessage, StructuredProjectData } from "../types";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { QuickReplies } from "./QuickReplies";
import { UnderstandingPreviewCard } from "./UnderstandingPreviewCard";

export interface ConversationThreadProps {
  messages: ChatMessage[];
  loading: boolean;
  /** True only for the assistant's most recent bubble, so a failure notice
   * doesn't retroactively re-style earlier successful replies. */
  lastMessageIsNotice: boolean;
  quickReplies: string[] | null;
  onQuickReply: (option: string) => void;
  understanding: StructuredProjectData | null;
  onConfirm: () => void;
  onWantToChange: () => void;
  confirming: boolean;
}

export function ConversationThread({
  messages,
  loading,
  lastMessageIsNotice,
  quickReplies,
  onQuickReply,
  understanding,
  onConfirm,
  onWantToChange,
  confirming,
}: ConversationThreadProps) {
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading, understanding]);

  return (
    <div className="flex flex-col gap-4">
      {messages.map((message, index) => (
        <MessageBubble
          key={index}
          role={message.role}
          content={message.content}
          isNotice={lastMessageIsNotice && message.role === "assistant" && index === messages.length - 1}
        />
      ))}

      {loading ? <TypingIndicator /> : null}

      {!loading && quickReplies && quickReplies.length > 0 ? (
        <QuickReplies options={quickReplies} onSelect={onQuickReply} />
      ) : null}

      {!loading && understanding ? (
        <UnderstandingPreviewCard
          understanding={understanding}
          onConfirm={onConfirm}
          onWantToChange={onWantToChange}
          loading={confirming}
        />
      ) : null}

      <div ref={bottomRef} />
    </div>
  );
}
