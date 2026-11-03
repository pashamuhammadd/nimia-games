import { describe, expect, it } from "vitest";
import { buildBriefSchema, isOwnCloudinaryUpload, PROJECT_TYPES } from "./schema";
import {
  buildBriefBudgetText,
  buildBriefDescription,
  buildBriefDisplayName,
  buildTelegramHelpUrl,
  formatOrderCode,
} from "./format";

const TODAY = new Date("2026-11-03T05:00:00Z");
const schema = buildBriefSchema(TODAY);

function valid(overrides: Record<string, unknown> = {}) {
  return {
    serviceLine: "animation",
    projectType: "music-video",
    title: "Memecoin anthem MV",
    description: "A 90 second music video for our community anthem, playful 2D style.",
    budget: "1500-5000",
    deadline: "",
    referenceLink: "",
    files: [],
    agreedToTerms: true,
    ...overrides,
  };
}

describe("brief schema", () => {
  it("accepts a complete animation brief", () => {
    expect(schema.safeParse(valid()).success).toBe(true);
  });

  it("only offers Animation and Development (no digital assets)", () => {
    expect(Object.keys(PROJECT_TYPES)).toEqual(["animation", "development"]);
    expect(schema.safeParse(valid({ serviceLine: "digital_assets" })).success).toBe(false);
  });

  it("rejects a project type from the other service line", () => {
    const result = schema.safeParse(valid({ serviceLine: "development", projectType: "music-video" }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["projectType"]);
  });

  it("requires a budget range but allows 'not sure yet'", () => {
    expect(schema.safeParse(valid({ budget: "" })).success).toBe(false);
    expect(schema.safeParse(valid({ budget: "not-sure" })).success).toBe(true);
  });

  it("requires a meaningful description", () => {
    expect(schema.safeParse(valid({ description: "too short" })).success).toBe(false);
  });

  it("requires agreeing to the terms, with a readable message", () => {
    const result = schema.safeParse(valid({ agreedToTerms: false }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Agree to the project terms to send your brief.");
  });

  it("explains a missing service line in plain words", () => {
    const result = schema.safeParse(valid({ serviceLine: "" }));
    expect(result.error?.issues.find((i) => i.path[0] === "serviceLine")?.message).toBe("Choose Animation or Development.");
  });

  it("accepts today or a future deadline, rejects past or malformed dates", () => {
    expect(schema.safeParse(valid({ deadline: "2026-11-03" })).success).toBe(true);
    expect(schema.safeParse(valid({ deadline: "2027-01-15" })).success).toBe(true);
    expect(schema.safeParse(valid({ deadline: "2026-11-02" })).success).toBe(false);
    expect(schema.safeParse(valid({ deadline: "2026-02-30" })).success).toBe(false);
  });

  it("only accepts http(s) reference links", () => {
    expect(schema.safeParse(valid({ referenceLink: "https://example.com/board" })).success).toBe(true);
    expect(schema.safeParse(valid({ referenceLink: "javascript:alert(1)" })).success).toBe(false);
    expect(schema.safeParse(valid({ referenceLink: "example.com" })).success).toBe(false);
  });

  it("limits attachments to 8", () => {
    const files = Array.from({ length: 9 }, (_, i) => ({ name: `f${i}.png`, url: `https://res.cloudinary.com/x/f${i}` }));
    expect(schema.safeParse(valid({ files })).success).toBe(false);
  });
});

describe("isOwnCloudinaryUpload", () => {
  const userId = "11111111-2222-3333-4444-555555555555";
  it("accepts files in the user's own signed upload folder", () => {
    expect(isOwnCloudinaryUpload(`https://res.cloudinary.com/demo/image/upload/v1/orders/${userId}/ref.png`, userId)).toBe(true);
  });
  it("rejects other users' folders, other hosts, and plain http", () => {
    expect(isOwnCloudinaryUpload("https://res.cloudinary.com/demo/image/upload/v1/orders/someone-else/ref.png", userId)).toBe(false);
    expect(isOwnCloudinaryUpload(`https://evil.example/orders/${userId}/ref.png`, userId)).toBe(false);
    expect(isOwnCloudinaryUpload(`http://res.cloudinary.com/demo/orders/${userId}/ref.png`, userId)).toBe(false);
    expect(isOwnCloudinaryUpload("not a url", userId)).toBe(false);
  });
});

describe("brief formatting", () => {
  const brief = schema.parse(valid());

  it("labels the order for lists, receipts and notifications", () => {
    expect(buildBriefDisplayName(brief)).toBe("Animation brief: Memecoin anthem MV");
  });

  it("stores the budget as a non-binding range", () => {
    expect(buildBriefBudgetText("1500-5000")).toBe("$1,500 – $5,000 (client's starting budget, not a final price)");
    expect(buildBriefBudgetText("not-sure")).toContain("Not sure yet");
  });

  it("puts service and project type at the top of the description", () => {
    expect(buildBriefDescription(brief).split("\n").slice(0, 2)).toEqual([
      "Service: Animation — Music video",
      "Project: Memecoin anthem MV",
    ]);
  });

  it("formats order codes like the rest of the platform", () => {
    expect(formatOrderCode("abcdef12-3456-7890-abcd-ef1234567890")).toBe("ORD-ABCDEF12");
  });
});

describe("buildTelegramHelpUrl", () => {
  it("is hidden until a studio Telegram URL is configured", () => {
    expect(buildTelegramHelpUrl(undefined, "ORD-ABCDEF12", "animation", "X")).toBeNull();
    expect(buildTelegramHelpUrl("", "ORD-ABCDEF12", "animation", "X")).toBeNull();
  });

  it("prefills only the order code and project name", () => {
    const url = buildTelegramHelpUrl("https://t.me/nimia_studio_help", "ORD-ABCDEF12", "development", "Launch site");
    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.origin + parsed.pathname).toBe("https://t.me/nimia_studio_help");
    const text = parsed.searchParams.get("text")!;
    expect(text).toContain("ORD-ABCDEF12");
    expect(text).toContain("Development: Launch site");
    expect(text).not.toMatch(/\$/);
  });

  it("rejects non-Telegram or malformed URLs", () => {
    expect(buildTelegramHelpUrl("https://example.com/nimia", "ORD-1", "animation", "X")).toBeNull();
    expect(buildTelegramHelpUrl("http://t.me/nimia_studio", "ORD-1", "animation", "X")).toBeNull();
    expect(buildTelegramHelpUrl("https://t.me/", "ORD-1", "animation", "X")).toBeNull();
    expect(buildTelegramHelpUrl("https://t.me/a/b", "ORD-1", "animation", "X")).toBeNull();
  });
});
