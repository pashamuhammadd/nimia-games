import { z } from "zod";

// Mirrors packages/db/migrations/0003_orders_projects.sql `orders` columns
// exactly. Used both as the react-hook-form resolver (client) and to
// re-validate on the server action before insert (never trust client input
// alone, even though RLS also enforces client_id ownership at the DB level).
//
// NOTE: optional text fields below use plain `.optional()` rather than the
// previous `.optional().or(z.literal(""))` pattern. That union-per-field
// pattern (6 of them, stacked on one object) made @hookform/resolvers'
// zodResolver<> generic instantiation blow up TypeScript's recursion limit
// ("Type instantiation is excessively deep and possibly infinite" at build
// time). Plain `.optional()` is enough here because none of these fields
// have a `.min()`/format check that would reject an empty string — so an
// empty input just passes through as "". Only `reference_link` needs
// special handling (see below), since `.url()` DOES reject "".
export const orderFormSchema = z.object({
  service_id: z.string().uuid({ message: "Please select a service." }),
  full_name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(120, "Name must be at most 120 characters."),
  company_name: z
    .string()
    .trim()
    .max(160, "Company name must be at most 160 characters.")
    .optional(),
  email: z.string().trim().email("Invalid email format."),
  whatsapp: z
    .string()
    .trim()
    .max(32, "WhatsApp number is too long.")
    .optional(),
  country: z
    .string()
    .trim()
    .max(80, "Country name is too long.")
    .optional(),
  budget: z
    .string()
    .trim()
    .max(80, "Budget note is too long.")
    .optional(),
  deadline: z.string().trim().optional(),
  description: z
    .string()
    .trim()
    .min(20, "Tell us about your project, at least 20 characters.")
    .max(4000, "Description must be at most 4000 characters."),
  // z.preprocess instead of `.optional().or(z.literal(""))` — converts ""
  // to undefined BEFORE the .url() check runs, so an empty field passes
  // without needing a second union branch in the schema's type.
  reference_link: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().trim().url("Invalid link format.").optional(),
  ),
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;
