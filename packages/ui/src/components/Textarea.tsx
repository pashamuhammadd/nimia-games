import * as React from "react";
import { cn } from "../lib/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-24 w-full rounded-md border bg-[var(--nimia-surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--nimia-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nimia-crimson)] disabled:cursor-not-allowed disabled:opacity-50",
          invalid
            ? "border-red-500 focus-visible:ring-red-500"
            : "border-[var(--nimia-border)]",
          className,
        )}
        aria-invalid={invalid || undefined}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";
