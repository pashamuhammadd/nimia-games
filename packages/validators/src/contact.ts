import { z } from "zod";

// Schema for the public /contact form (apps/studio) — added 29 Juli 2026
// alongside the navbar expansion to 5 items. Used both as the
// react-hook-form resolver (client) and to re-validate on the server
// action before sending anything through Resend (never trust client
// input alone).
export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(120, "Name must be at most 120 characters."),
  email: z.string().trim().email("Invalid email format."),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters.")
    .max(4000, "Message must be at most 4000 characters."),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
