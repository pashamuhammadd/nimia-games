// Home page redesign (10 Agustus 2026, per user brief) — replaces the old
// "Trusted by innovative studios & brands" placeholder section (which
// rendered 5 dashed boxes literally labeled "Partner") with a real
// technology/tool showcase. Renamed on purpose: these are software tools
// Nimia Studio actually works with, not clients or sponsors — using the
// word "Trusted by" here would misrepresent these companies as
// endorsing/partnering with Nimia, which the user explicitly flagged.
// "Powered by the Tools We Trust" makes no such claim.
//
// Logo note: this sandbox's web-fetch tool refuses to download SVG/image
// files at all (a hard technical limitation, not a policy choice — every
// attempt at pulling the real vector marks from simple-icons/GitHub came
// back "image content not supported"). Per the user's explicit decision
// (10 Agustus 2026, asked directly rather than guessing), these 9 icons
// are hand-authored best-effort recreations from memory, not pixel-exact
// brand files — colors are accurate to each brand's real palette, but
// exact geometry may drift from the current official mark. Swap in real
// SVG/PNG brand assets under apps/studio/public/logos/ whenever you have
// them; this file is the only place that would need to change.

import type { ReactNode } from "react";

interface Tool {
  name: string;
  Icon: () => ReactNode;
}

function NextJsLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#000000" />
      <path
        d="M9.6 8.1h1.7l6 7.9c.24-.5.35-1.05.35-1.66V8.1h1.5v9.9c-.4 0-.8-.06-1.15-.2L9.9 9.75v8.15H8.4V8.1c.4 0 .8.03 1.2 0Z"
        fill="#ffffff"
      />
    </svg>
  );
}

function GitHubLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <path
        d="M12 .8C5.9.8 1 5.7 1 11.8c0 4.9 3.15 9 7.55 10.46.55.1.75-.24.75-.53l-.01-2.06c-3.07.67-3.72-1.3-3.72-1.3-.5-1.28-1.23-1.63-1.23-1.63-1-.7.08-.68.08-.68 1.11.08 1.7 1.15 1.7 1.15.99 1.7 2.6 1.21 3.23.92.1-.72.39-1.21.7-1.49-2.45-.28-5.03-1.23-5.03-5.48 0-1.21.43-2.2 1.14-2.98-.11-.28-.49-1.4.11-2.93 0 0 .93-.3 3.05 1.14a10.5 10.5 0 0 1 5.56 0c2.12-1.44 3.05-1.14 3.05-1.14.6 1.53.22 2.65.11 2.93.71.78 1.14 1.77 1.14 2.98 0 4.26-2.59 5.2-5.05 5.47.4.35.75 1.02.75 2.06l-.01 3.05c0 .29.2.64.76.53C19.86 20.78 23 16.68 23 11.8 23 5.7 18.1.8 12 .8Z"
        fill="#ffffff"
      />
    </svg>
  );
}

function FigmaLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <path d="M9 1h3v6H9a3 3 0 1 1 0-6Z" fill="#F24E1E" />
      <circle cx="15" cy="4" r="3" fill="#FF7262" />
      <path d="M9 7h3v6H9a3 3 0 1 1 0-6Z" fill="#A259FF" />
      <circle cx="9" cy="16" r="3" fill="#1ABCFE" />
      <circle cx="15" cy="16" r="3" fill="#0ACF83" />
    </svg>
  );
}

function UnityLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <rect x="0.5" y="0.5" width="23" height="23" rx="5" fill="#000000" />
      <path
        d="M12 4.2 17.3 7v10L12 19.8 6.7 17V7L12 4.2Zm0 2.3-3.3 1.9v6.2L12 16.5l3.3-1.9V8.4L12 6.5Z"
        fill="#ffffff"
      />
      <path d="M12 6.5v10l3.3-1.9V8.4L12 6.5Z" fill="#ffffff" opacity="0.55" />
    </svg>
  );
}

function GodotLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <ellipse cx="12" cy="12.5" rx="10.5" ry="8.5" fill="#478CBF" />
      <circle cx="4.5" cy="8" r="2.1" fill="#478CBF" />
      <circle cx="19.5" cy="8" r="2.1" fill="#478CBF" />
      <ellipse cx="8.2" cy="12" rx="2.6" ry="3.2" fill="#ffffff" transform="rotate(-8 8.2 12)" />
      <ellipse cx="15.8" cy="12" rx="2.6" ry="3.2" fill="#ffffff" transform="rotate(8 15.8 12)" />
      <circle cx="8.6" cy="12.6" r="1" fill="#414042" />
      <circle cx="15.4" cy="12.6" r="1" fill="#414042" />
    </svg>
  );
}

function BlenderLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <circle cx="12" cy="10.5" r="8.5" fill="#EA7600" />
      <path d="M12 5.2a5.3 5.3 0 1 1 0 10.6 5.3 5.3 0 0 1 0-10.6Zm0 2.6a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4Z" fill="#0a0407" />
      <path d="M8.4 17.5 12 21.2l3.6-3.7-1.9-.8L12 18.4l-1.7-1.7-1.9.8Z" fill="#EA7600" />
    </svg>
  );
}

function AfterEffectsLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="ae-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00005B" />
          <stop offset="100%" stopColor="#9999FF" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="23" height="23" rx="4.5" fill="url(#ae-grad)" />
      <text
        x="12"
        y="15.5"
        textAnchor="middle"
        fontSize="9.5"
        fontWeight="700"
        fontFamily="Arial, sans-serif"
        fill="#ffffff"
      >
        Ae
      </text>
    </svg>
  );
}

function ProcreateLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <defs>
        <radialGradient id="pc-grad" cx="35%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffd23f" />
          <stop offset="35%" stopColor="#ff7a3d" />
          <stop offset="65%" stopColor="#ff3d7a" />
          <stop offset="100%" stopColor="#7a3dff" />
        </radialGradient>
      </defs>
      <rect x="0.5" y="0.5" width="23" height="23" rx="5.5" fill="#0a0407" />
      <circle cx="12" cy="12" r="6.5" fill="url(#pc-grad)" />
    </svg>
  );
}

// Corrected 10 Agustus 2026 — the user posted the real Toon Boom Harmony
// mark (a mint/teal "H" whose left leg is short and whose crossbar melts
// into a dripping tail with two trailing droplets) and confirmed the
// other 8 icons in this file were already fine. The first pass here was a
// generic colored-badge "TB" monogram (an honest placeholder given this
// sandbox can't download real brand SVGs — see this file's header note),
// which the reference image shows is NOT what the real mark looks like.
// Replaced with a hand-traced approximation of the actual logo: no
// background chip (the real mark has none), single mint-teal fill, short
// rounded left stroke + full-height rounded right stroke + a curved
// connector that tapers into a drip with two shrinking droplets — same
// "best effort from memory/reference, not a pixel-exact brand file"
// caveat as the rest of this file.
function ToonBoomLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <rect x="4" y="1.5" width="5.5" height="8.5" rx="2.75" fill="#7BC8AC" />
      <rect x="14.5" y="1.5" width="6" height="21" rx="3" fill="#7BC8AC" />
      <path
        d="M7 9.5c-.3.5-.4 1.2-.4 2.1 0 1.7.7 3.4 2.6 4.1 1.5.6 3.3.9 5.3 1.1v-3.7c-1-.1-2.2-.2-3.5-.3-2.3-.2-4-1.5-4-3.3Z"
        fill="#7BC8AC"
      />
      <circle cx="6.6" cy="19.6" r="1.15" fill="#7BC8AC" />
      <circle cx="6" cy="22.1" r="0.65" fill="#7BC8AC" />
    </svg>
  );
}

// Spans the full creative + production pipeline the rest of the homepage
// copy describes (2D animation, digital painting, 3D, game engines,
// motion/VFX, and the actual dev/design stack this very site is built
// with) — not an exhaustive list of every tool Nimia touches, just enough
// to read as a real, varied ecosystem rather than a wall of logos.
const TOOLS: Tool[] = [
  { name: "Toon Boom Harmony", Icon: ToonBoomLogo },
  { name: "Procreate", Icon: ProcreateLogo },
  { name: "After Effects", Icon: AfterEffectsLogo },
  { name: "Blender", Icon: BlenderLogo },
  { name: "Unity", Icon: UnityLogo },
  { name: "Godot", Icon: GodotLogo },
  { name: "Figma", Icon: FigmaLogo },
  { name: "Next.js", Icon: NextJsLogo },
  { name: "GitHub", Icon: GitHubLogo },
];

export function ToolsSection() {
  return (
    <section className="border-t border-[var(--nimia-border)] px-4 py-10 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--nimia-muted)]">
          Powered by the Tools We Trust
        </p>

        <div className="mt-7 grid grid-cols-3 gap-x-4 gap-y-7 sm:grid-cols-5 sm:gap-x-6 lg:grid-cols-9 lg:gap-x-5">
          {TOOLS.map(({ name, Icon }) => (
            <div key={name} className="group flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl transition-all duration-300 ease-out group-hover:scale-110 group-hover:drop-shadow-[0_0_14px_rgba(255,77,141,0.45)] sm:h-14 sm:w-14">
                <Icon />
              </div>
              <span className="text-[11px] font-medium text-[var(--nimia-muted)] opacity-80 transition-all duration-300 ease-out group-hover:text-[var(--nimia-pink)] group-hover:opacity-100">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
