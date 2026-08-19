"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@nimia/db";
import { cloudinary } from "../../lib/cloudinary";
import {
  mapCloudinaryAssetToPortfolioFields,
  deriveCategoryFolderName,
  slugify,
} from "../../lib/portfolio-sync-map";

export type PortfolioActionResult = { success: true } | { success: false; error: string };

// Every write below relies on `portfolio_admin_write`
// (packages/db/migrations/0006_rls_policies.sql, re-pointed at `status` by
// 0052) which gates on public.is_admin() — same convention as
// apps/admin/app/(protected)/services/actions.ts: this file is
// convenience/UX, not the security boundary itself.

export async function setPortfolioStatusAction(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<PortfolioActionResult> {
  const supabase = createServerClient(await cookies());
  const { error } = await supabase.from("portfolio").update({ status }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/portfolio");
  return { success: true };
}

export async function setPortfolioFeaturedAction(id: string, featured: boolean): Promise<PortfolioActionResult> {
  const supabase = createServerClient(await cookies());
  const { error } = await supabase.from("portfolio").update({ featured }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/portfolio");
  return { success: true };
}

export async function updatePortfolioSortOrderAction(id: string, sortOrder: number): Promise<PortfolioActionResult> {
  if (!Number.isFinite(sortOrder)) return { success: false, error: "Enter a valid number." };
  const supabase = createServerClient(await cookies());
  const { error } = await supabase.from("portfolio").update({ sort_order: Math.round(sortOrder) }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/portfolio");
  return { success: true };
}

export interface PortfolioMetadataInput {
  title: string;
  description: string | null;
  client: string | null;
  project: string | null;
  categoryId: string | null;
  tagNames: string[];
}

export async function updatePortfolioMetadataAction(
  id: string,
  input: PortfolioMetadataInput,
): Promise<PortfolioActionResult> {
  if (!input.title.trim()) return { success: false, error: "Title is required." };
  const supabase = createServerClient(await cookies());

  const { error } = await supabase
    .from("portfolio")
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      client: input.client?.trim() || null,
      project: input.project?.trim() || null,
      category_id: input.categoryId,
    })
    .eq("id", id);
  if (error) return { success: false, error: error.message };

  // Tags go through the normalized portfolio_tags/portfolio_tag_map join
  // (0002) rather than a plain array column — replace-all is simplest and
  // safe here since a single item's tag list is small.
  const tagNames = Array.from(new Set(input.tagNames.map((t) => t.trim()).filter(Boolean)));
  await supabase.from("portfolio_tag_map").delete().eq("portfolio_id", id);
  if (tagNames.length > 0) {
    const tagIds: string[] = [];
    for (const name of tagNames) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "tag";
      const { data: existingTag } = await supabase
        .from("portfolio_tags")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (existingTag) {
        tagIds.push(existingTag.id);
      } else {
        const { data: newTag } = await supabase
          .from("portfolio_tags")
          .insert({ name, slug })
          .select("id")
          .single();
        if (newTag) tagIds.push(newTag.id);
      }
    }
    if (tagIds.length > 0) {
      await supabase.from("portfolio_tag_map").insert(tagIds.map((tagId) => ({ portfolio_id: id, tag_id: tagId })));
    }
  }

  revalidatePath("/portfolio");
  return { success: true };
}

export async function deletePortfolioItemAction(id: string): Promise<PortfolioActionResult> {
  const supabase = createServerClient(await cookies());
  const { error } = await supabase.from("portfolio").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/portfolio");
  return { success: true };
}

// ------------------------------------------------------------------
// Sync from Cloudinary — manual bulk backfill (spec §15), complementing
// apps/portfolio's real-time webhook. Lists every asset under
// CLOUDINARY_PORTFOLIO_ROOT_FOLDER and upserts each one, using the exact
// same mapping rules as the webhook (see
// mapCloudinaryAssetToPortfolioFields's shared logic). Safe to re-run
// any time — every write is an upsert keyed on cloudinary_public_id,
// and editorial fields on a previously hand-edited row are left
// untouched (same rule as the webhook).
//
// Uses the Search API (cloudinary.search), NOT cloudinary.api.resources
// with a `prefix` filter (added 18 Agustus 2026, fixed a real "0
// scanned" bug). `prefix` matches against the asset's public_id, which
// only lines up with its visible folder path under Cloudinary's legacy
// "Fixed Folder Mode". Accounts on the newer "Dynamic Asset Folders"
// mode (the default for accounts created after Cloudinary's ~2023
// folder revamp — this account included) decouple the folder shown in
// Media Library from the public_id, so a prefix search silently finds
// nothing even when the folder clearly has assets in it. The Search
// API's `folder:` expression matches the asset's actual folder
// location and works correctly under both modes.
//
// Known limitation: this runs inside a single server action invocation,
// so a truly huge library (many thousands of assets) could hit a
// serverless function time limit before finishing. It's safe to just
// click "Sync from Cloudinary" again — already-synced assets are cheap
// upserts, so a re-run picks up wherever the previous one left off.
// ------------------------------------------------------------------

interface CloudinaryResource {
  public_id: string;
  resource_type: "image" | "video";
  format?: string;
  width?: number;
  height?: number;
  duration?: number;
  folder?: string;
  tags?: string[];
  context?: { custom?: Record<string, string> };
}

const ROOT_FOLDER = process.env.CLOUDINARY_PORTFOLIO_ROOT_FOLDER || "nimia-studio";
const MAX_SEARCH_PAGES = 20; // 500/page -> up to 10,000 assets per click
const SYNC_CONCURRENCY = 8;

async function listAllCloudinaryResources(): Promise<CloudinaryResource[]> {
  const all: CloudinaryResource[] = [];
  // Matches assets placed directly in the root folder AND anything
  // nested under it (any depth) — covers both "loose" uploads and the
  // 1x1 / 16:9 / <client-name> subfolder layout this studio actually
  // uses.
  const expression = `folder:${ROOT_FOLDER} OR folder:${ROOT_FOLDER}/*`;
  let cursor: string | undefined;
  let pages = 0;
  do {
    let query = cloudinary.search
      .expression(expression)
      .with_field("context")
      .with_field("tags")
      .max_results(500);
    if (cursor) query = query.next_cursor(cursor);
    const response = await query.execute();
    all.push(...(response.resources ?? []));
    cursor = response.next_cursor;
    pages += 1;
  } while (cursor && pages < MAX_SEARCH_PAGES);
  return all;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export type SyncResult =
  | { success: true; scanned: number; created: number; updated: number }
  | { success: false; error: string };

export async function syncFromCloudinaryAction(): Promise<SyncResult> {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return { success: false, error: "Cloudinary isn't configured (missing env vars)." };
  }

  const supabase = createServerClient(await cookies());

  let resources: CloudinaryResource[];
  try {
    resources = await listAllCloudinaryResources();
  } catch {
    return { success: false, error: "Couldn't reach Cloudinary. Please try again." };
  }

  const { data: categories } = await supabase.from("portfolio_categories").select("id, name, slug");
  let allCategories = categories ?? [];

  // Auto-create every portfolio category implied by a Cloudinary folder
  // name that doesn't have a matching row yet — one bulk pre-pass across
  // every scanned resource (not per-resource, to avoid N concurrent
  // inserts racing each other for the same brand-new category name),
  // before the per-resource mapping loop below. Mirrors what
  // apps/portfolio's real-time webhook does per-asset, so a folder
  // created in Cloudinary shows up as a category on both
  // portfolio.nimiastudio.com and this page's own Category dropdown
  // whichever sync path notices it first — no manual admin step either
  // way.
  const newCategoryRows = new Map<string, string>(); // slug -> name
  for (const resource of resources) {
    const name = deriveCategoryFolderName(resource.folder ?? null, ROOT_FOLDER, allCategories);
    if (!name) continue;
    const slug = slugify(name);
    if (!newCategoryRows.has(slug)) newCategoryRows.set(slug, name);
  }
  if (newCategoryRows.size > 0) {
    await supabase
      .from("portfolio_categories")
      .upsert(
        Array.from(newCategoryRows, ([slug, name]) => ({ slug, name })),
        { onConflict: "slug", ignoreDuplicates: true },
      );
    const { data: refreshedCategories } = await supabase.from("portfolio_categories").select("id, name, slug");
    if (refreshedCategories) allCategories = refreshedCategories;
  }

  const outcomes = await mapWithConcurrency(resources, SYNC_CONCURRENCY, async (resource) => {
    const asset = {
      publicId: resource.public_id,
      resourceType: resource.resource_type ?? "image",
      format: resource.format ?? null,
      width: resource.width ?? null,
      height: resource.height ?? null,
      duration: resource.duration ?? null,
      folder: resource.folder ?? null,
      tags: resource.tags ?? [],
      context: resource.context?.custom ?? {},
    };
    const mapped = mapCloudinaryAssetToPortfolioFields(asset, allCategories, ROOT_FOLDER);

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
      cloudinary_metadata: { tags: asset.tags, context: asset.context, notification_type: "manual_sync" },
      source: "cloudinary_sync" as const,
    };

    if (existing) {
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
      return "updated" as const;
    }

    let slug = mapped.slugBase;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data: slugTaken } = await supabase.from("portfolio").select("id").eq("slug", slug).maybeSingle();
      if (!slugTaken) break;
      slug = `${mapped.slugBase}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const { error } = await supabase.from("portfolio").insert({
      ...technicalFields,
      slug,
      title: mapped.title,
      description: mapped.description,
      client: mapped.client,
      project: mapped.project,
      category_id: mapped.categoryId,
      featured: mapped.featured,
      status: mapped.status,
    });
    return error ? ("failed" as const) : ("created" as const);
  });

  revalidatePath("/portfolio");
  return {
    success: true,
    scanned: resources.length,
    created: outcomes.filter((o) => o === "created").length,
    updated: outcomes.filter((o) => o === "updated").length,
  };
}
