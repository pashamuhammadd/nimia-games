import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().email("Format email tidak valid."),
  password: z.string().min(1, "Password wajib diisi."),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    full_name: z.string().trim().min(2, "Nama minimal 2 karakter."),
    email: z.string().trim().email("Format email tidak valid."),
    password: z.string().min(8, "Password minimal 8 karakter."),
    confirm_password: z.string().min(8, "Konfirmasi password minimal 8 karakter."),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Konfirmasi password tidak cocok.",
    path: ["confirm_password"],
  });
export type SignUpValues = z.infer<typeof signUpSchema>;
