import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { buildThumbnailUrl, buildVideoSourceUrl } from "../../../../lib/cloudinary-url";

// Secure video proxy — generalized, DB-driven version of the pattern
// apps/studio already shipped for its Portfolio Preview page
// (apps/studio/app/api/video/[id]/route.ts + sources.ts, 30 Juli 2026
// video-security brief). Same posture, same honest limits documented
// there: the client never sees a res.cloudinary.com URL (no visible link
// in page source, the JS bundle, or a right-click "Copy video address"),
// but this is NOT "undownloadable" — a visitor's browser has to be able to
// fetch the actual video bytes to play them, so anyone determined can still
// find them via DevTools' Network tab. The bar is "remove the trivial
// paths for a casual visitor," per that same brief, carried over here
// rather than reinvented.
//
// What's different from the original: `[id]` here is a `portfolio.slug`
// resolved against the database (RLS via createServerClient — a public,
// unauthenticated request only ever resolves `status = 'published'` rows;
// an authenticated admin session can also resolve `draft`/`archived` rows
// for in-admin previewing, for free, because that's exactly what the
// `portfolio_public_read_published` RLS policy already allows), not a
// hardcoded lookup table — so a new Cloudinary-synced item is playable the
// moment its row exists, with zero code changes.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params;
  const isPoster = request.nextUrl.searchParams.get("poster") === "1";

  const supabase = createServerClient(await cookies());
  const { data: item } = await supabase
    .from("portfolio")
    .select("cloudinary_public_id, cloudinary_thumbnail_public_id, resource_type")
    .eq("slug", slug)
    .maybeSingle();

  if (!item || !item.cloudinary_public_id || item.resource_type !== "video") {
    return new NextResponse("Not found", { status: 404 });
  }

  const upstreamUrl = isPoster
    ? buildThumbnailUrl(item.cloudinary_thumbnail_public_id || item.cloudinary_public_id, "video", 1280)
    : buildVideoSourceUrl(item.cloudinary_public_id);

  const upstreamRequestHeaders: HeadersInit = {};
  const rangeHeader = request.headers.get("range");
  if (rangeHeader && !isPoster) {
    upstreamRequestHeaders["range"] = rangeHeader;
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      headers: upstreamRequestHeaders,
      // Never let a partial (Range) response get cached under the same key
      // as a full one — caching for real visitors comes from the
      // Cache-Control header set below, at the browser/CDN layer instead.
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
  // Long-lived cache: Cloudinary public_ids are content-addressed by
  // upload (a re-upload/replace gets a new version or a new id), so this
  // origin's response for a given slug+poster combo is effectively
  // immutable.
  headers.set("cache-control", "public, max-age=31536000, immutable");
  // "inline" (not "attachment") keeps normal playback working — this is
  // about not exposing the Cloudinary origin, not about blocking playback.
  headers.set("content-disposition", "inline");

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers,
  });
}
