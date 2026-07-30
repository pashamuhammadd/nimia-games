// Server-only Cloudinary lookup table backing the /api/video/[id] proxy
// route (added 30 Juli 2026, portfolio video-security brief). This file is
// NEVER imported by a "use client" component — only by route.ts, which
// only ever runs on the server. That's what actually keeps the real
// res.cloudinary.com/<cloud name>/... paths out of the browser: client
// code (see ../../../portfolio/data.ts) only ever references the opaque
// "/api/video/<id>" path, never the Cloudinary URL itself, so the real
// origin never ships in the HTML, the JS bundle, or a page-source view.
//
// This does NOT make the underlying video file undownloadable — a
// determined visitor can still find the streamed .mp4 bytes via the
// browser's Network tab, since a browser must always be able to fetch
// video bytes to play them at all. The bar here is "don't make it trivial
// for a casual visitor to right-click / view-source their way to a
// downloadable Cloudinary link," per the brief.
interface VideoSource {
  /** Cloudinary delivery URL for the actual video, with f_auto,q_auto
   *  (format + quality auto-negotiation) already applied. */
  video: string;
  /** Cloudinary-derived still-frame JPG (so_0 = frame at 0s), used as the
   *  Featured Showcase's click-to-play poster image. */
  poster: string;
}

function optimizeCloudinaryUrl(url: string): string {
  return url.replace("/video/upload/", "/video/upload/f_auto,q_auto/");
}

function cloudinaryPosterUrl(url: string): string {
  return url
    .replace("/video/upload/", "/video/upload/so_0,f_auto,q_auto/")
    .replace(/\.mp4$/i, ".jpg");
}

function source(rawUrl: string): VideoSource {
  return {
    video: optimizeCloudinaryUrl(rawUrl),
    poster: cloudinaryPosterUrl(rawUrl),
  };
}

// Keys here are the same stable ids used in portfolio/data.ts's TICKER_ROW_1
// / TICKER_ROW_2 / FEATURED_SHOWCASE arrays — that's the only thing the
// client ever sends us (as the [id] route param), so the two files must be
// kept in sync when a clip is added, removed, or replaced.
const VIDEO_SOURCES: Record<string, VideoSource> = {
  "ticker-1-a": source(
    "https://res.cloudinary.com/wudw6mex/video/upload/v1785258898/VID_20250617_003641_288_ks1kzf.mp4",
  ),
  "ticker-1-b": source(
    "https://res.cloudinary.com/wudw6mex/video/upload/v1785258890/jeet_sacrifice_ritual_V1_q1hv7g.mp4",
  ),
  "ticker-1-c": source(
    "https://res.cloudinary.com/wudw6mex/video/upload/v1785258901/VID_20250918_144032_442.mp4_nwezsu.mp4",
  ),
  "ticker-1-d": source(
    "https://res.cloudinary.com/wudw6mex/video/upload/v1785258898/VID_20250521_185254_752_ef0myz.mp4",
  ),
  "ticker-1-e": source(
    "https://res.cloudinary.com/wudw6mex/video/upload/v1785258895/VID_20250508_182212_817_hcz6zi.mp4",
  ),
  "ticker-2-a": source(
    "https://res.cloudinary.com/wudw6mex/video/upload/v1785385121/Apustaja_In_Bedroom_1_dlznsb.mp4",
  ),
  "ticker-2-b": source(
    "https://res.cloudinary.com/wudw6mex/video/upload/v1785385121/Peepo_Smoke_qsyen6.mp4",
  ),
  "ticker-2-c": source(
    "https://res.cloudinary.com/wudw6mex/video/upload/v1785385122/VID-20250516-WA0000_hi06rs.mp4",
  ),
  "ticker-2-d": source(
    "https://res.cloudinary.com/wudw6mex/video/upload/v1785385122/Apustaja_hk8cru.mp4",
  ),
  "ticker-2-e": source(
    "https://res.cloudinary.com/wudw6mex/video/upload/v1785385124/VID-20250524-WA0000_aqvkgj.mp4",
  ),
  "showcase-1": source(
    "https://res.cloudinary.com/wudw6mex/video/upload/v1785385218/VID-20240926-WA0000_ilapsv.mp4",
  ),
  "showcase-2": source(
    "https://res.cloudinary.com/wudw6mex/video/upload/v1785385217/Mouse_Zombie_yutlhv.mp4",
  ),
  "showcase-3": source(
    "https://res.cloudinary.com/wudw6mex/video/upload/v1785385223/To_the_Moon_or_Not_-1_j8ctpi.mp4",
  ),
};

export function getVideoSource(id: string): VideoSource | undefined {
  return VIDEO_SOURCES[id];
}
