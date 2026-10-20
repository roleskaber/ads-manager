"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { defaultLocale, isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { createRegisterSchema } from "@/lib/validation/auth";
import { EmailAlreadyRegisteredError } from "@/server/auth/registration.service";
import { registrationService } from "@/server/container";

type RegisterField = "name" | "companyName" | "email" | "password";

export type RegisterState = {
  error?: string;
  fieldErrors?: Partial<Record<RegisterField, string>>;
  values?: { name?: string; companyName?: string; email?: string };
};

export async function registerAction(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const raw = Object.fromEntries(formData);
  const locale = typeof raw.locale === "string" && isLocale(raw.locale) ? raw.locale : defaultLocale;
  const { errors: messages } = (await getDictionary(locale)).auth.register;
  const values = {
    name: String(raw.name ?? ""),
    companyName: String(raw.companyName ?? ""),
    email: String(raw.email ?? ""),
  };

  const parsed = createRegisterSchema(messages).safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: RegisterState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path[0] as RegisterField] ??= issue.message;
    }
    return { fieldErrors, values };
  }

  try {
    await registrationService.registerCompanyOwner(parsed.data);
  } catch (error) {
    if (error instanceof EmailAlreadyRegisteredError) {
      return { fieldErrors: { email: messages.emailTaken }, values };
    }
    throw error;
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: `/${locale}/dashboard`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: messages.signInFailed, values };
    }
    throw error; // Next.js redirect
  }

  return {};
}
