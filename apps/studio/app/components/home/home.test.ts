import { afterEach, describe, expect, it, vi } from "vitest";
import { contrastRatio } from "./contrast";
import { resolveTelegramHelpUrl } from "./links";
import { getSelectedWork, mapPortfolioRows, type PortfolioRow } from "./selected-work";

// Orchid Pulse tokens — must match .studio-orchid in app/globals.css.
const BG = "#100B1B";
const SURFACE = "#1B1430";
const TEXT = "#FFF5FC";
const MUTED = "#C4B5D4";
const PINK = "#FF39C8";
const VIOLET = "#A26BFF";
const VIOLET_SOFT = "#C3A3FF";
const ERROR = "#FF9A7A";
const SUCCESS = "#5EE6A8";

describe("Orchid Pulse contrast (WCAG AA)", () => {
  it.each([
    ["body text on background", TEXT, BG, 4.5],
    ["body text on surface", TEXT, SURFACE, 4.5],
    ["muted text on background", MUTED, BG, 4.5],
    ["muted text on surface", MUTED, SURFACE, 4.5],
    ["soft violet eyebrow on background", VIOLET_SOFT, BG, 4.5],
    ["pink link text on background", PINK, BG, 4.5],
    ["violet heading on surface", VIOLET, SURFACE, 3],
    ["dark label on pink button", BG, PINK, 4.5],
    ["error text on background", ERROR, BG, 4.5],
    ["success text on background", SUCCESS, BG, 4.5],
  ])("%s", (_label, foreground, background, minimum) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(minimum);
  });

  it("keeps white text off pink buttons (fails AA)", () => {
    expect(contrastRatio(TEXT, PINK)).toBeLessThan(4.5);
  });

  it("rejects malformed colors", () => {
    expect(() => contrastRatio("#fff", BG)).toThrow();
  });
});

describe("resolveTelegramHelpUrl", () => {
  it("returns null when unset, so the link stays hidden", () => {
    expect(resolveTelegramHelpUrl(undefined)).toBeNull();
    expect(resolveTelegramHelpUrl("")).toBeNull();
  });

  it("accepts https t.me links", () => {
    expect(resolveTelegramHelpUrl(" https://t.me/example_studio ")).toBe("https://t.me/example_studio");
  });

  it("rejects non-Telegram, insecure, or bare-host URLs", () => {
    expect(resolveTelegramHelpUrl("http://t.me/example")).toBeNull();
    expect(resolveTelegramHelpUrl("https://example.com/t.me/x")).toBeNull();
    expect(resolveTelegramHelpUrl("https://t.me/")).toBeNull();
    expect(resolveTelegramHelpUrl("not a url")).toBeNull();
  });
});

function row(overrides: Partial<PortfolioRow>): PortfolioRow {
  return {
    id: "id-1",
    slug: "neon-run",
    title: "Neon Run",
    cloudinary_public_id: "portfolio/neon-run",
    cloudinary_thumbnail_public_id: null,
    resource_type: "video",
    width: 1920,
    height: 1080,
    category: { name: "Character Animation" },
    ...overrides,
  };
}

describe("mapPortfolioRows", () => {
  it("builds a poster-frame URL for videos and a deep link to the portfolio item", () => {
    const [item] = mapPortfolioRows([row({})], "democloud");
    expect(item.imageSrc).toBe(
      "https://res.cloudinary.com/democloud/video/upload/so_0,f_auto,q_auto,w_960,dpr_auto/portfolio/neon-run.jpg",
    );
    expect(item.imageSrcSet.split(", ")).toHaveLength(4);
    expect(item.href).toBe("https://portfolio.nimiastudio.com/?work=neon-run");
    expect(item.category).toBe("Character Animation");
  });

  it("prefers a curated thumbnail image over the video frame", () => {
    const [item] = mapPortfolioRows([row({ cloudinary_thumbnail_public_id: "thumbs/neon" })], "democloud");
    expect(item.imageSrc).toBe("https://res.cloudinary.com/democloud/image/upload/f_auto,q_auto,w_960,dpr_auto/thumbs/neon");
  });

  it("handles array-shaped joins and missing categories", () => {
    const [a, b] = mapPortfolioRows(
      [row({ id: "a", category: [{ name: "Motion" }] }), row({ id: "b", category: null })],
      "democloud",
    );
    expect(a.category).toBe("Motion");
    expect(b.category).toBeNull();
  });

  it("skips rows without any Cloudinary asset instead of rendering a broken image", () => {
    expect(
      mapPortfolioRows([row({ cloudinary_public_id: null, cloudinary_thumbnail_public_id: null })], "democloud"),
    ).toEqual([]);
  });

  it("encodes slugs in the deep link", () => {
    const [item] = mapPortfolioRows([row({ slug: "a b&c" })], "democloud");
    expect(item.href).toBe("https://portfolio.nimiastudio.com/?work=a%20b%26c");
  });
});

describe("getSelectedWork", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports unavailable (no network call) when configuration is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "");
    await expect(getSelectedWork()).resolves.toEqual({ status: "unavailable" });
  });
});
