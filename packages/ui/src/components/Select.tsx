import * as React from "react";
import { cn } from "../lib/cn";

// Plain native <select>, styled to match Input/Textarea. Deliberately not a
// Radix/custom listbox for now — native <select> is fully accessible and
// keyboard-operable out of the box with zero extra dependency risk.
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, children, style, ...props }, ref) => {
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
        // color-scheme set directly on the element itself (3 Agustus 2026,
        // fourth pass, per user report — the open dropdown list stayed
        // white even after color-scheme: dark was added to the surrounding
        // .nimia-dark/.nimia-dark-vars scope in globals.css). That should
        // have been enough on its own since color-scheme inherits — this
        // inline style is a belt-and-suspenders fix so the native popup is
        // guaranteed dark no matter what's (or isn't) applied up the DOM
        // tree above it, since every current caller of this shared
        // component (apps/admin entirely, apps/studio's dashboard/modal
        // usage) is dark-only anyway. Merged after `style` so a future
        // caller could still override it explicitly if a light-themed
        // Select is ever needed.
        style={{ colorScheme: "dark", ...style }}
        {...props}
      >
        {children}
      </select>
    );
  },
);
Select.displayName = "Select";
