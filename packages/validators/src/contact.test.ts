import { describe, it, expect } from "vitest";
import { contactFormSchema } from "./contact";

describe("contactFormSchema", () => {
  const valid = {
    name: "Satoshi",
    email: "satoshi@example.com",
    message: "I'd like to discuss a potential collaboration on a new game.",
  };

  it("accepts a valid contact submission", () => {
    expect(contactFormSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a message shorter than 10 characters", () => {
    const result = contactFormSchema.safeParse({ ...valid, message: "too short" });
    expect(result.success).toBe(false);
  });

  it("rejects a name shorter than 2 characters", () => {
    const result = contactFormSchema.safeParse({ ...valid, name: "S" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = contactFormSchema.safeParse({ ...valid, email: "nope" });
    expect(result.success).toBe(false);
  });

  it("trims surrounding whitespace from name and message", () => {
    const result = contactFormSchema.safeParse({
      ...valid,
      name: "  Satoshi  ",
      message: "  I'd like to discuss a potential collaboration.  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Satoshi");
      expect(result.data.message).toBe("I'd like to discuss a potential collaboration.");
    }
  });
});
