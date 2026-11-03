// Motion Frame logo (Nimia Studio). The SVG files in public/brand/ are a
// RECONSTRUCTION traced from the approved PNG concept
// (docs/nimia-studio-redesign/reference/motion-frame-logo-reference.png),
// not the designer's master file — swap the files when a master exists.
// Height drives size; width follows the SVG's own viewBox ratio, so the
// mark can never be stretched.

const LOCKUP_RATIO = 1323 / 375;
const MARK_RATIO = 414 / 375;

export interface MotionFrameLogoProps {
  variant?: "lockup" | "mark";
  height?: number;
  className?: string;
}

export function MotionFrameLogo({ variant = "lockup", height = 40, className }: MotionFrameLogoProps) {
  const isLockup = variant === "lockup";
  const ratio = isLockup ? LOCKUP_RATIO : MARK_RATIO;
  const src = isLockup
    ? "/brand/motion-frame-lockup.reconstruction.svg"
    : "/brand/motion-frame-mark.reconstruction.svg";

  return (
    // eslint-disable-next-line @next/next/no-img-element -- static local SVG with a fixed, known ratio
    <img
      src={src}
      alt="Nimia Studio"
      width={Math.round(height * ratio)}
      height={height}
      className={className}
      decoding="async"
    />
  );
}
