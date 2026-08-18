import { AlertCircle } from "lucide-react";
import { buttonVariants, cn } from "@nimia/ui";

// Spec §30/§37: "Do not expose technical errors to visitors." — generic
// copy only, whatever the underlying failure (Cloudinary/Supabase/network)
// actually was.
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--nimia-border)] text-[var(--nimia-muted)]">
        <AlertCircle className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="mt-5 text-lg font-semibold text-white">Unable to load the portfolio right now.</p>
      <p className="mt-1.5 text-sm text-[var(--nimia-muted)]">Please try again.</p>
      <button type="button" onClick={onRetry} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-6")}>
        Try again
      </button>
    </div>
  );
}
