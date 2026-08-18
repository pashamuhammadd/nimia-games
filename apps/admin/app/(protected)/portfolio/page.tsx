import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { PortfolioList, type PortfolioAdminRow } from "./PortfolioList";
import { buildAdminThumbnailUrl } from "../../lib/portfolio-thumbnail";

export const metadata = { title: "Portfolio" };

const SELECT_COLUMNS = `
  id, slug, title, description, client, project, resource_type, format,
  cloudinary_public_id, cloudinary_thumbnail_public_id, featured, status,
  sort_order, source, created_at,
  category:portfolio_categories ( id, name, slug ),
  portfolio_tag_map ( portfolio_tags ( name ) )
`;

// Curation page for the animation portfolio gallery (spec §31 — kept
// separate from the public portfolio.nimiastudio.com UI entirely, same
// pattern as every other catalog page in this app: page.tsx does the
// server-side fetch, PortfolioList.tsx is the interactive client piece,
// actions.ts holds the server actions). RLS (`portfolio_public_read_
// published`, packages/db/migrations/0052) already lets an admin session
// see draft/archived rows too, so no separate admin query path is needed.
export default async function PortfolioAdminPage() {
  const supabase = createServerClient(await cookies());

  const { data, count } = await supabase
    .from("portfolio")
    .select(SELECT_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(300);

  const { data: categoriesData } = await supabase
    .from("portfolio_categories")
    .select("id, name, slug")
    .order("name", { ascending: true });

  const rows: PortfolioAdminRow[] = ((data as any[]) ?? []).map((row) => {
    const category = Array.isArray(row.category) ? row.category[0] : row.category;
    const tags = (row.portfolio_tag_map ?? [])
      .map((entry: any) => (Array.isArray(entry.portfolio_tags) ? entry.portfolio_tags[0]?.name : entry.portfolio_tags?.name))
      .filter(Boolean);
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      client: row.client,
      project: row.project,
      resourceType: row.resource_type,
      format: row.format,
      thumbnailUrl: row.cloudinary_public_id
        ? buildAdminThumbnailUrl(row.cloudinary_thumbnail_public_id || row.cloudinary_public_id, row.resource_type)
        : "",
      featured: row.featured,
      status: row.status,
      sortOrder: row.sort_order,
      source: row.source,
      createdAt: row.created_at,
      category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
      tags,
    };
  });

  const total = count ?? rows.length;
  const publishedCount = rows.filter((r) => r.status === "published").length;
  const draftCount = rows.filter((r) => r.status === "draft").length;
  const featuredCount = rows.filter((r) => r.featured).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Animation Portfolio</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/45">
          Curate what appears on portfolio.nimiastudio.com — publish/unpublish, feature, reorder, and edit
          metadata. New Cloudinary uploads land here as Draft automatically (or Published, if tagged
          &ldquo;published&rdquo; at upload time); use Sync to pull in anything uploaded before the webhook was
          configured.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total" value={total} />
        <StatCard label="Published" value={publishedCount} tone="text-emerald-300" />
        <StatCard label="Draft" value={draftCount} tone="text-amber-300" />
        <StatCard label="Featured" value={featuredCount} tone="text-[var(--nimia-pink)]" />
      </div>

      <PortfolioList items={rows} categories={categoriesData ?? []} />
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <p className="text-xs font-medium text-white/45">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone ?? "text-white"}`}>{value}</p>
    </div>
  );
}
