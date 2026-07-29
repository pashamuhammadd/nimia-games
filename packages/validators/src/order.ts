import { z } from "zod";

// Mirrors packages/db/migrations/0003_orders_projects.sql `orders` columns
// exactly. Used both as the react-hook-form resolver (client) and to
// re-validate on the server action before insert (never trust client input
// alone, even though RLS also enforces client_id ownership at the DB level).
export const orderFormSchema = z.object({
  service_id: z.string().uuid({ message: "Pilih salah satu layanan." }),
  full_name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter.")
    .max(120, "Nama maksimal 120 karakter."),
  company_name: z
    .string()
    .trim()
    .max(160, "Nama perusahaan maksimal 160 karakter.")
    .optional()
    .or(z.literal("")),
  email: z.string().trim().email("Format email tidak valid."),
  whatsapp: z
    .string()
    .trim()
    .max(32, "Nomor WhatsApp terlalu panjang.")
    .optional()
    .or(z.literal("")),
  country: z
    .string()
    .trim()
    .max(80, "Nama negara terlalu panjang.")
    .optional()
    .or(z.literal("")),
  budget: z
    .string()
    .trim()
    .max(80, "Keterangan budget terlalu panjang.")
    .optional()
    .or(z.literal("")),
  deadline: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .trim()
    .min(20, "Ceritakan detail proyekmu, minimal 20 karakter.")
    .max(4000, "Deskripsi maksimal 4000 karakter."),
  reference_link: z
    .string()
    .trim()
    .url("Format link tidak valid.")
    .optional()
    .or(z.literal("")),
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;
