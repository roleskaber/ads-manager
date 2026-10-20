import { z } from "zod";
import type { Dictionary } from "@/i18n/dictionaries/en";

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});

type RegisterMessages = Dictionary["auth"]["register"]["errors"];

export function createRegisterSchema(messages: RegisterMessages) {
  return z.object({
    name: z.string().trim().min(2, messages.name).max(80),
    companyName: z.string().trim().min(2, messages.companyName).max(80),
    email: z.email(messages.email).trim().toLowerCase(),
    password: z.string().min(8, messages.password).max(128),
  });
}

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<ReturnType<typeof createRegisterSchema>>;
