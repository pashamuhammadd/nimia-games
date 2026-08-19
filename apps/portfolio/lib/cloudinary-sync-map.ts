// Pure mapping logic: a Cloudinary asset's own data (tags, context/
// structured metadata, folder path, dimensions) -> the `portfolio` table's
// editorial fields (spec §16). No Cloudinary SDK, no Supabase client, no
// env vars — deliberately dependency-free so it's trivially testable and
// safe to duplicate into apps/admin's own bulk-sync action (see that
// file's own header comment for why duplication over a shared package
// here) without dragging in this app's other server-only modules.
export type PortfolioFormat = "1:1" | "16:9" | "9:16" | "gif";
export type PortfolioStatus = "draft" | "published" | "archived";

export interface CloudinaryAssetInput {
  publicId: string;
  resourceType: "image" | "video";
  /** Cloudinary's own format field, e.g. "mp4", "gif", "jpg" — distinct
   *  from our `format` (aspect-ratio bucket) below. */
  format: string | null;
  width: number | null;
  height: number | null;
  /** Seconds, video only. */
  duration: number | null;
  folder: string | null;
  tags: string[];
  /** Flattened `context.custom` key/value pairs Cloudinary sends. */
  context: Record<string, string>;
}

export interface PortfolioCategoryLookup {
  id: string;
  slug: string;
  name: string;
}

export interface MappedPortfolioFields {
  title: string;
  description: string | null;
  client: string | null;
  project: string | null;
  categoryId: string | null;
  featured: boolean;
  status: PortfolioStatus;
  format: PortfolioFormat | null;
  slugBase: string;
}

function humanizeFromPublicId(publicId: string): string {
  const tail = publicId.split("/").pop() ?? publicId;
  // Cloudinary appends a random suffix to auto-generated public_ids
  // (e.g. "sunset_village_q1hv7g") — strip it so the fallback title reads
  // like a real name instead of gibberish, best-effort only.
  const withoutRandomSuffix = tail.replace(/[_-][a-z0-9]{6,}$/i, "");
  const spaced = withoutRandomSuffix.replace(/[_-]+/g, " ").trim();
  const title = spaced
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return title || tail;
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "work";
}

function detectFormat(asset: CloudinaryAssetInput): PortfolioFormat | null {
  if (asset.format?.toLowerCase() === "gif") return "gif";
  if (!asset.width || !asset.height) return null;
  const ratio = asset.width / asset.height;
  if (ratio > 1.3) return "16:9";
  if (ratio < 0.8) return "9:16";
  return "1:1";
}

// Tag-based publish convention (documented in .env.example and this app's
// README-equivalent comments): a newly-synced asset lands as `draft` by
// default — an admin has to review and publish it — UNLESS the upload
// itself was tagged "published" (many upload pipelines/presets can attach
// a fixed tag automatically), which lets a power user opt into true
// zero-touch publishing per spec §2/§15 without giving up curation control
// by default.
function detectStatus(tagsLower: string[]): PortfolioStatus {
  if (tagsLower.includes("archived")) return "archived";
  if (tagsLower.includes("published")) return "published";
  return "draft";
}

// Folder-name-as-metadata (added 18 Agustus 2026, per user's actual
// Cloudinary layout: nimia-studio/1x1, nimia-studio/16:9,
// nimia-studio/Fren — mixing format-labeled folders with a client-name
// folder at the same nesting depth). Recognized format tokens are treated
// as pure organization and are IGNORED for category/client purposes
// (`format` itself always comes from real pixel dimensions via
// detectFormat above, never from a folder name — a file dropped in the
// wrong folder by mistake still gets tagged correctly). Any OTHER folder
// segment is assumed to be a client name, and the segment after that (if
// any) a project name — e.g. "nimia-studio/Fren/Sunset Village/clip.mp4"
// -> client "Fren", project "Sunset Village".
const FORMAT_FOLDER_TOKENS = new Set([
  "1x1",
  "1:1",
  "square",
  "16x9",
  "16:9",
  "landscape",
  "widescreen",
  "9x16",
  "9:16",
  "portrait",
  "vertical",
  "gif",
  "gifs",
  "loop",
  "loops",
]);

function isFormatFolderSegment(segment: string): boolean {
  return FORMAT_FOLDER_TOKENS.has(segment.toLowerCase().trim());
}

// Added 19 Agustus 2026 — auto-create-category support (brief: "setiap
// nama kategorinya harus bisa dibuat otomatis sesuai nama folder di
// cloudinary ... jika saya membuat folder baru harus otomatis ada
// kategori baru"). Pure/no-DB, like the rest of this file: this only
// tells a caller (the webhook, the admin bulk sync action) WHICH category
// name it should ensure exists in `portfolio_categories` before calling
// mapCloudinaryAssetToPortfolioFields below — it never writes anything
// itself. Mirrors deriveFolderHints' own matching walk exactly (same
// slug/name comparison, same format-token skip) so the two never
// disagree: if some segment further down the path ALREADY matches a
// known category (e.g. ".../Fren/Motion Graphics/clip.mp4" where "Motion
// Graphics" already exists), this returns null — deriveFolderHints will
// resolve that match on its own, so there's nothing new to create. Only
// when NO segment matches anything yet does this propose the first
// non-format segment as a brand-new category to create — same segment
// deriveFolderHints will itself pick up as the category once the caller
// has actually inserted it.
export function deriveCategoryFolderName(
  folder: string | null,
  rootFolder: string,
  categories: PortfolioCategoryLookup[],
): string | null {
  if (!folder) return null;

  const relative = folder.startsWith(rootFolder) ? folder.slice(rootFolder.length) : folder;
  const segments = relative
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => !isFormatFolderSegment(segment));

  if (segments.length === 0) return null;

  const alreadyResolves = segments.some((segment) =>
    categories.some((c) => c.slug === slugify(segment) || c.name.toLowerCase() === segment.toLowerCase()),
  );
  if (alreadyResolves) return null;

  return segments[0];
}

interface FolderHints {
  categoryId: string | null;
  client: string | null;
  project: string | null;
}

function deriveFolderHints(
  folder: string | null,
  rootFolder: string,
  categories: PortfolioCategoryLookup[],
): FolderHints {
  if (!folder) return { categoryId: null, client: null, project: null };

  const relative = folder.startsWith(rootFolder) ? folder.slice(rootFolder.length) : folder;
  const segments = relative
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => !isFormatFolderSegment(segment));

  let categoryId: string | null = null;
  const remaining: string[] = [];
  for (const segment of segments) {
    if (!categoryId) {
      const match = categories.find(
        (c) => c.slug === slugify(segment) || c.name.toLowerCase() === segment.toLowerCase(),
      );
      if (match) {
        categoryId = match.id;
        continue; // matched as category — don't also use it as client/project
      }
    }
    remaining.push(segment);
  }

  return {
    categoryId,
    client: remaining[0] ?? null,
    project: remaining[1] ?? null,
  };
}

export function mapCloudinaryAssetToPortfolioFields(
  asset: CloudinaryAssetInput,
  categories: PortfolioCategoryLookup[],
  rootFolder: string,
): MappedPortfolioFields {
  const tagsLower = asset.tags.map((tag) => tag.toLowerCase());
  const title = asset.context.title || asset.context.caption || humanizeFromPublicId(asset.publicId);
  const folderHints = deriveFolderHints(asset.folder, rootFolder, categories);

  const categoryHint = (asset.context.category || "").toLowerCase().trim();
  const categoryFromContext = categoryHint
    ? categories.find((c) => c.slug === categoryHint || c.name.toLowerCase() === categoryHint)
    : undefined;

  return {
    title,
    description: asset.context.description || (asset.context.caption ?? null),
    // Explicit Contextual Metadata always wins over a folder-name guess —
    // the folder is a convenience default, not a hard rule.
    client: asset.context.client || folderHints.client,
    project: asset.context.project || folderHints.project,
    categoryId: categoryFromContext?.id ?? folderHints.categoryId,
    featured: tagsLower.includes("featured"),
    status: detectStatus(tagsLower),
    format: detectFormat(asset),
    slugBase: slugify(title),
  };
}
