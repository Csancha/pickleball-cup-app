import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email no válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export type LoginSchema = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    full_name: z
      .string()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(80, "El nombre no puede superar 80 caracteres"),
    email: z.string().email("Email no válido"),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirm_password: z.string(),
    role: z.enum(["admin", "jugador"]).default("jugador"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Las contraseñas no coinciden",
    path: ["confirm_password"],
  });

export type RegisterSchema = z.infer<typeof registerSchema>;
