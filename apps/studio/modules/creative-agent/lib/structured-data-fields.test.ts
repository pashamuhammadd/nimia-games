import { describe, expect, it } from "vitest";
import { STRUCTURED_DATA_FIELD_LABELS, formatStructuredDataValue, structuredDataRows } from "./structured-data-fields";
import type { StructuredProjectData } from "../types";

// Fase 12 (Testing) of the 16 Agustus 2026 refactor. This file's own
// header comment explains why it exists: UnderstandingPreviewCard and
// CreativeBriefCard both render from structuredDataRows() so the two never
// drift on field order/labels — a regression here would show up as the
// pre-confirm preview and the post-confirm brief disagreeing about what
// the client said, which is exactly the kind of silent UI drift a
// refactor later on could reintroduce without anyone noticing by eye.

describe("formatStructuredDataValue", () => {
  it("returns null for null/undefined", () => {
    expect(formatStructuredDataValue(null)).toBeNull();
    expect(formatStructuredDataValue(undefined)).toBeNull();
  });

  it("joins a non-empty array with ', '", () => {
    expect(formatStructuredDataValue(["2D", "hand-drawn"])).toBe("2D, hand-drawn");
  });

  it("returns null for an empty array — not an empty string", () => {
    expect(formatStructuredDataValue([])).toBeNull();
  });

  it("passes a plain string through unchanged", () => {
    expect(formatStructuredDataValue("60 seconds")).toBe("60 seconds");
  });

  it("returns null for a non-string, non-array value (e.g. a number or object) — not stringified", () => {
    expect(formatStructuredDataValue(42)).toBeNull();
    expect(formatStructuredDataValue({ nested: true })).toBeNull();
  });
});

describe("structuredDataRows", () => {
  it("includes only fields with a non-null formatted value, in STRUCTURED_DATA_FIELD_LABELS order", () => {
    const understanding = {
      service: "Animation",
      duration: "60 seconds",
      characters: ["Hero", "Villain"],
      // Every other field intentionally omitted/undefined.
    } as Partial<StructuredProjectData> as StructuredProjectData;

    const rows = structuredDataRows(understanding);

    expect(rows).toEqual([
      { label: "Service", value: "Animation" },
      { label: "Duration", value: "60 seconds" },
      { label: "Characters", value: "Hero, Villain" },
    ]);
  });

  it("returns an empty array when nothing is filled in yet", () => {
    expect(structuredDataRows({} as StructuredProjectData)).toEqual([]);
  });

  it("never emits more rows than STRUCTURED_DATA_FIELD_LABELS has entries", () => {
    const everythingFilled = Object.fromEntries(
      STRUCTURED_DATA_FIELD_LABELS.map(({ key }) => [key, "value"]),
    ) as unknown as StructuredProjectData;
    expect(structuredDataRows(everythingFilled).length).toBe(STRUCTURED_DATA_FIELD_LABELS.length);
  });
});
