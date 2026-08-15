import { describe, it, expect } from "vitest";
import { signInSchema, signUpSchema } from "./auth";

describe("signInSchema", () => {
  it("accepts a valid email + non-empty password", () => {
    const result = signInSchema.safeParse({ email: "client@example.com", password: "hunter2" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty password", () => {
    const result = signInSchema.safeParse({ email: "client@example.com", password: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = signInSchema.safeParse({ email: "not-an-email", password: "hunter2" });
    expect(result.success).toBe(false);
  });
});

describe("signUpSchema", () => {
  const base = {
    full_name: "Grace Hopper",
    email: "grace@example.com",
    password: "supersecret1",
    confirm_password: "supersecret1",
  };

  it("accepts a valid signup with matching passwords", () => {
    const result = signUpSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("rejects mismatched password/confirm_password, flagging confirm_password", () => {
    const result = signUpSchema.safeParse({ ...base, confirm_password: "different1" });
    expect(result.success).toBe(false);
    if (!result.success) {
      // Regression guard: the .refine()'s `path` must stay pointed at
      // confirm_password, or the client-side form (react-hook-form
      // resolver) would attach the "don't match" error to the wrong
      // field and the password field itself would look invalid instead.
      expect(result.error.issues[0]?.path).toEqual(["confirm_password"]);
    }
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = signUpSchema.safeParse({ ...base, password: "short1", confirm_password: "short1" });
    expect(result.success).toBe(false);
  });

  it("rejects a full_name under 2 characters", () => {
    const result = signUpSchema.safeParse({ ...base, full_name: "G" });
    expect(result.success).toBe(false);
  });
});
