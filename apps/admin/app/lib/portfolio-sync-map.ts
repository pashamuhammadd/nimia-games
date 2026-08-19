// Duplicate of apps/portfolio/lib/cloudinary-sync-map.ts, on purpose — same
// "duplication over cross-app coupling" convention this codebase already
// uses for near-identical modules (see e.g.
// apps/studio/modules/creative-agent/state/upload-to-cloudinary.ts's own
// header comment). Used by this app's "Sync from Cloudinary" bulk-backfill
// action (../(protected)/portfolio/actions.ts); the real-time webhook
// counterpart lives in apps/portfolio and is the one other caller of this
// exact logic. Keep the two in sync by hand if the mapping rules ever
// change — there are only these two call sites.
export type PortfolioFormat = "1:1" | "16:9" | "9:16" | "gif";
export type PortfolioStatus = "draft" | "published" | "archived";

export interface CloudinaryAssetInput {
  publicId: string;
  resourceType: "image" | "video";
  format: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  folder: string | null;
  tags: string[];
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

// Added 19 Agustus 2026 — auto-create-category support, kept in sync by
// hand with apps/portfolio/lib/cloudinary-sync-map.ts's copy of this same
// function (see that file's header comment for why this whole module is
// duplicated rather than shared). See that copy's comment for the full
// rationale — short version: pure/no-DB, tells the caller (this app's
// "Sync from Cloudinary" bulk action) which category name to ensure
// exists in `portfolio_categories` before calling
// mapCloudinaryAssetToPortfolioFields, without ever writing anything
// itself, and only proposes a NEW category when no segment in the folder
// path already resolves to an existing one via deriveFolderHints' own
// matching rule.
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
        continue;
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
    client: asset.context.client || folderHints.client,
    project: asset.context.project || folderHints.project,
    categoryId: categoryFromContext?.id ?? folderHints.categoryId,
    featured: tagsLower.includes("featured"),
    status: detectStatus(tagsLower),
    format: detectFormat(asset),
    slugBase: slugify(title),
  };
}
