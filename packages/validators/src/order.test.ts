import { describe, it, expect } from "vitest";
import { orderFormSchema } from "./order";

// orderFormSchema is used both as the react-hook-form resolver (apps/app's
// /order flow, Project Builder path) and to re-validate on the server
// action before insert — see order.ts's own header comment for why plain
// `.optional()` is used instead of the `.optional().or(z.literal(""))`
// pattern this file used to have. These tests exist to catch exactly the
// kind of regression that pattern swap was fixing: an "optional" field
// that silently starts rejecting empty strings again, or a validation rule
// that's stricter/looser than intended.

const validPayload = {
  service_id: "00000000-0000-4000-8000-000000000001",
  full_name: "Ada Lovelace",
  email: "ada@example.com",
  description: "I need a cozy life-sim prototype built for a game jam demo.",
};

describe("orderFormSchema", () => {
  it("accepts a minimal valid payload with every optional field omitted", () => {
    const result = orderFormSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("accepts empty strings for optional text fields (not just omitted keys)", () => {
    // Regression guard for the exact bug order.ts's header comment
    // describes: switching away from `.optional().or(z.literal(""))"`
    // must not make an empty-string optional field start failing again.
    const result = orderFormSchema.safeParse({
      ...validPayload,
      company_name: "",
      whatsapp: "",
      country: "",
      budget: "",
      deadline: "",
    });
    expect(result.success).toBe(true);
  });

  it("treats an empty reference_link as absent rather than an invalid URL", () => {
    // reference_link is the one field that needs the z.preprocess escape
    // hatch, because .url() rejects "" outright — this is the specific
    // case that preprocess step exists for.
    const result = orderFormSchema.safeParse({ ...validPayload, reference_link: "" });
    expect(result.success).toBe(true);
  });

  it("rejects a reference_link that isn't a valid URL", () => {
    const result = orderFormSchema.safeParse({ ...validPayload, reference_link: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid service_id", () => {
    const result = orderFormSchema.safeParse({ ...validPayload, service_id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = orderFormSchema.safeParse({ ...validPayload, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a description shorter than 20 characters", () => {
    const result = orderFormSchema.safeParse({ ...validPayload, description: "too short" });
    expect(result.success).toBe(false);
  });

  it("rejects a full_name under 2 characters", () => {
    const result = orderFormSchema.safeParse({ ...validPayload, full_name: "A" });
    expect(result.success).toBe(false);
  });
});
