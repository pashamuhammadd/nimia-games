import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { createServiceRoleClient } from "@nimia/db";
import {
  mapCloudinaryAssetToPortfolioFields,
  deriveCategoryFolderName,
  slugify,
} from "../../../../lib/cloudinary-sync-map";

// Cloudinary Notification URL target (spec §15) — configure this in the
// Cloudinary console under Settings -> Notifications -> "Notification URL",
// e.g.:
//   https://portfolio.nimiastudio.com/api/cloudinary/webhook?token=<CLOUDINARY_WEBHOOK_TOKEN>
// Enable it for the "Upload" (and optionally "Delete") event types.
//
// No signed-in user ever reaches this route — Cloudinary's own servers
// call it directly — so RLS can't gate it the way every other write in
// this codebase is gated. This is exactly the documented exception in
// packages/db/src/service.ts's own header comment (that file's example is
// Discord's inbound webhook; this is the same shape of problem for
// Cloudinary), so createServiceRoleClient is the right call here
// specifically, not a shortcut.
//
// Two independent layers of verification, both required:
//   1. `?token=` query param — a fast, cheap first reject for anything
//      that isn't even trying to look like Cloudinary.
//   2. The request body's HMAC-style signature (`X-Cld-Signature` +
//      `X-Cld-Timestamp` headers, verified against CLOUDINARY_API_SECRET
//      per Cloudinary's own webhook-signature spec) — the REAL boundary;
//      (1) alone would leak into browser history/logs/a misconfigured
//      proxy far more easily than a secret only Cloudinary's backend and
//      ours ever see.
function verifySignature(rawBody: string, timestamp: string, signature: string): boolean {
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!secret) return false;
  const expected = crypto.createHash("sha1").update(rawBody + timestamp + secret).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");
  if (expectedBuffer.length !== signatureBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

interface CloudinaryUploadNotification {
  notification_type: string;
  public_id: string;
  resource_type?: "image" | "video";
  format?: string;
  width?: number;
  height?: number;
  duration?: number;
  folder?: string;
  tags?: string[];
  context?: { custom?: Record<string, string> };
  resources?: Record<string, unknown>;
  public_ids?: string[];
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!process.env.CLOUDINARY_WEBHOOK_TOKEN || token !== process.env.CLOUDINARY_WEBHOOK_TOKEN) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const signature = request.headers.get("x-cld-signature");
  const timestamp = request.headers.get("x-cld-timestamp");
  // Signature is computed over the exact raw bytes — read as text before
  // any JSON.parse, or the signature will never match.
  const rawBody = await request.text();

  if (!signature || !timestamp || !verifySignature(rawBody, timestamp, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: CloudinaryUploadNotification;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const supabase = createServiceRoleClient();

  if (payload.notification_type === "delete") {
    const publicIds = payload.resources ? Object.keys(payload.resources) : (payload.public_ids ?? []);
    if (publicIds.length > 0) {
      // Archived, not hard-deleted — an admin can still see/restore it from
      // the curation page (spec §31) rather than the row silently
      // vanishing the moment someone deletes the wrong asset in Cloudinary.
      await supabase.from("portfolio").update({ status: "archived" }).in("cloudinary_public_id", publicIds);
    }
    return NextResponse.json({ ok: true });
  }

  if (payload.notification_type !== "upload") {
    return NextResponse.json({ ok: true, skipped: payload.notification_type });
  }

  const rootFolder = process.env.CLOUDINARY_PORTFOLIO_ROOT_FOLDER || "nimia-studio";
  if (!payload.folder || !payload.folder.startsWith(rootFolder)) {
    // Not a portfolio asset. If this Cloudinary account's webhook is ever
    // shared account-wide with other uploaders (Creative Agent client
    // attachments, order deliverables), this keeps those from creating
    // stray portfolio rows instead of erroring the whole notification.
    return NextResponse.json({ ok: true, skipped: "outside portfolio root folder" });
  }

  let { data: categories } = await supabase.from("portfolio_categories").select("id, name, slug");

  // Auto-create the portfolio category implied by this asset's Cloudinary
  // folder if it doesn't exist yet (spec: "jika saya membuat folder baru
  // [di Cloudinary] harus otomatis ada kategori baru di
  // portfolio.nimiastudio.com dan di hub.nimiastudio.com") — done BEFORE
  // mapCloudinaryAssetToPortfolioFields below so its existing
  // folder->category matching picks the freshly-created row up exactly
  // like any pre-existing category. Best-effort: if the insert somehow
  // fails, the asset still syncs, it just lands without a category this
  // run (same as today) rather than failing the whole webhook.
  const newCategoryName = deriveCategoryFolderName(payload.folder, rootFolder, categories ?? []);
  if (newCategoryName) {
    await supabase
      .from("portfolio_categories")
      .upsert({ name: newCategoryName, slug: slugify(newCategoryName) }, { onConflict: "slug", ignoreDuplicates: true });
    const { data: refreshedCategories } = await supabase.from("portfolio_categories").select("id, name, slug");
    if (refreshedCategories) categories = refreshedCategories;
  }

  const asset = {
    publicId: payload.public_id,
    resourceType: payload.resource_type ?? "image",
    format: payload.format ?? null,
    width: payload.width ?? null,
    height: payload.height ?? null,
    duration: payload.duration ?? null,
    folder: payload.folder,
    tags: payload.tags ?? [],
    context: payload.context?.custom ?? {},
  };

  const mapped = mapCloudinaryAssetToPortfolioFields(asset, categories ?? [], rootFolder);

  const { data: existing } = await supabase
    .from("portfolio")
    .select("id, source")
    .eq("cloudinary_public_id", asset.publicId)
    .maybeSingle();

  const technicalFields = {
    cloudinary_public_id: asset.publicId,
    resource_type: asset.resourceType,
    format: mapped.format,
    width: asset.width,
    height: asset.height,
    duration_seconds: asset.resourceType === "video" && asset.duration ? Math.round(asset.duration) : null,
    cloudinary_folder: asset.folder,
    cloudinary_metadata: { tags: asset.tags, context: asset.context, notification_type: payload.notification_type },
    source: "cloudinary_sync" as const,
  };

  if (existing) {
    // Only overwrite editorial fields (title/description/category/etc.) if
    // THIS sync originally created the row — an admin who hand-edited a
    // synced item's metadata (or a fully manual row that happens to share
    // a public_id, unlikely but possible) never gets silently clobbered by
    // a re-upload notification. See packages/db/migrations/0052's `source`
    // column comment.
    const editorialFields =
      existing.source === "cloudinary_sync"
        ? {
            title: mapped.title,
            description: mapped.description,
            client: mapped.client,
            project: mapped.project,
            category_id: mapped.categoryId,
            featured: mapped.featured,
            status: mapped.status,
          }
        : {};
    await supabase
      .from("portfolio")
      .update({ ...technicalFields, ...editorialFields })
      .eq("id", existing.id);
    return NextResponse.json({ ok: true, id: existing.id, action: "updated" });
  }

  const slug = await uniqueSlug(supabase, mapped.slugBase);
  const { data: inserted, error } = await supabase
    .from("portfolio")
    .insert({
      ...technicalFields,
      slug,
      title: mapped.title,
      description: mapped.description,
      client: mapped.client,
      project: mapped.project,
      category_id: mapped.categoryId,
      featured: mapped.featured,
      status: mapped.status,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: inserted?.id, action: "created" });
}

async function uniqueSlug(supabase: ReturnType<typeof createServiceRoleClient>, base: string): Promise<string> {
  let candidate = base;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data } = await supabase.from("portfolio").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}
