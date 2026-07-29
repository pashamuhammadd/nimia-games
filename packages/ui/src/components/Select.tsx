import * as React from "react";
import { cn } from "../lib/cn";

// Plain native <select>, styled to match Input/Textarea. Deliberately not a
// Radix/custom listbox for now — native <select> is fully accessible and
// keyboard-operable out of the box with zero extra dependency risk.
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border bg-[var(--nimia-surface)] px-3 text-sm text-[var(--foreground)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nimia-crimson)] disabled:cursor-not-allowed disabled:opacity-50",
          invalid
            ? "border-red-500 focus-visible:ring-red-500"
            : "border-[var(--nimia-border)]",
          className,
        )}
        aria-invalid={invalid || undefined}
        {...props}
      >
        {children}
      </select>
    );
  },
);
Select.displayName = "Select";
