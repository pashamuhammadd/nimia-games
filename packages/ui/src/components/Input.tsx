import * as React from "react";
import { cn } from "../lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border bg-[var(--nimia-surface)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--nimia-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nimia-crimson)] disabled:cursor-not-allowed disabled:opacity-50",
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
Input.displayName = "Input";
