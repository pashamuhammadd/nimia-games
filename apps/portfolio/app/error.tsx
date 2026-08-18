"use client";

import { ErrorState } from "./components/ErrorState";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main>
      <ErrorState onRetry={reset} />
    </main>
  );
}
