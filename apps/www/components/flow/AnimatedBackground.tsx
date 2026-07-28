// Slow-moving ambient gradient blobs behind every screen. Mounted once in
// the root layout (not per-page) so the animation keeps running smoothly
// across flow-step transitions instead of restarting on every navigation.
// Pure CSS animation, no client-side JS needed.
export default function AnimatedBackground() {
  return (
    <div
      aria-hidden
      className="nimia-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <span className="nimia-bg-blob nimia-bg-blob-1" />
      <span className="nimia-bg-blob nimia-bg-blob-2" />
      <span className="nimia-bg-blob nimia-bg-blob-3" />
    </div>
  );
}
