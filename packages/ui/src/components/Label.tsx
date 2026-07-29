import * as React from "react";
import { cn } from "../lib/cn";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("mb-1.5 block text-sm font-medium text-[var(--foreground)]", className)}
    {...props}
  />
));
Label.displayName = "Label";

export const FieldError = ({ children }: { children?: React.ReactNode }) => {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1.5 text-sm text-red-400">
      {children}
    </p>
  );
};
