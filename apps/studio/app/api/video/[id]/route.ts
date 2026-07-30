import { NextResponse, type NextRequest } from "next/server";
import { getVideoSource } from "./sources";

// Proxy route for portfolio videos (30 Juli 2026, video-security brief).
// The client never talks to Cloudinary directly — TickerRow.tsx and
// FeaturedShowcase.tsx only ever render `src="/api/video/<id>"` (see
// portfolio/data.ts), so `res.cloudinary.com/<cloud name>/...` never shows
// up in page source, the JS bundle, or a right-click "Copy video address."
// This route resolves the id server-side (sources.ts, never imported by
// client code) and streams the bytes back through our own origin.
//
// Range-request passthrough is required, not optional: without it, browsers
// can't seek and Chrome/Safari's own "give me metadata first" range probe on
// <video preload="metadata"> would fail, breaking the exact autoplay/loop
// experience this change is supposed to preserve.
//
// This intentionally does NOT try to block the request itself — a visitor
// who opens DevTools' Network tab can still find the streamed video bytes,
// because a browser has to be able to fetch them to play the clip at all.
// The goal (per the brief) is just to remove the trivial paths: no visible
// Cloudinary link in the HTML, no right-click "Save video as," no native
// download button.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const isPoster = request.nextUrl.searchParams.get("poster") === "1";

  const videoSource = getVideoSource(id);
  if (!videoSource) {
    return new NextResponse("Not found", { status: 404 });
  }

  const upstreamUrl = isPoster ? videoSource.poster : videoSource.video;

  const upstreamRequestHeaders: HeadersInit = {};
  const rangeHeader = request.headers.get("range");
  if (rangeHeader && !isPoster) {
    upstreamRequestHeaders["range"] = rangeHeader;
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      headers: upstreamRequestHeaders,
      // Never let Next's fetch cache key a partial (Range) response under
      // the same cache entry as a full one — that would corrupt playback.
      // Caching for real visitors instead comes from the Cache-Control
      // header we pass through / set below, at the browser/CDN layer.
      cache: "no-store",
    });
  } catch {
    return new NextResponse("Upstream fetch failed", { status: 502 });
  }

  if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
    return new NextResponse("Upstream error", { status: upstreamResponse.status });
  }

  const headers = new Headers();
  const passthroughHeaders = [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified",
  ];
  for (const name of passthroughHeaders) {
    const value = upstreamResponse.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has("accept-ranges")) {
    headers.set("accept-ranges", "bytes");
  }
  // Long-lived cache: these are static showreel clips, not user content —
  // Cloudinary URLs already carry content hashes, so a new upload is a new
  // id/URL rather than a mutation of this one.
  headers.set("cache-control", "public, max-age=31536000, immutable");
  // "inline" (not "attachment") keeps normal playback working — this is
  // about not exposing the Cloudinary origin, not about blocking playback.
  headers.set("content-disposition", "inline");

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers,
  });
}
