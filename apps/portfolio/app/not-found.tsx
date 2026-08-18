import Link from "next/link";
import { buttonVariants, cn } from "@nimia/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col items-center px-4 py-28 text-center sm:px-6">
      <p className="nimia-font-display text-6xl font-bold text-white/20">404</p>
      <p className="mt-4 text-lg font-semibold text-white">This page doesn&apos;t exist.</p>
      <p className="mt-1.5 text-sm text-[var(--nimia-muted)]">
        The work you&apos;re looking for may have moved — browse the full portfolio instead.
      </p>
      <Link href="/" className={cn(buttonVariants({ size: "sm" }), "mt-6")}>
        Back to Portfolio
      </Link>
    </main>
  );
}
