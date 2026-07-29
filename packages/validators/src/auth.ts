import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().email("Invalid email format."),
  password: z.string().min(1, "Password is required."),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    full_name: z.string().trim().min(2, "Name must be at least 2 characters."),
    email: z.string().trim().email("Invalid email format."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm_password: z.string().min(8, "Password confirmation must be at least 8 characters."),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match.",
    path: ["confirm_password"],
  });
export type SignUpValues = z.infer<typeof signUpSchema>;
