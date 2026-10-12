"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/auth";
import { defaultLocale, isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { invitationAcceptanceService } from "@/server/container";
import { TeamError } from "@/server/team/team-error";

export type AcceptInviteState = {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "password", string>>;
  name?: string;
};

export async function acceptInviteAction(_prev: AcceptInviteState, formData: FormData): Promise<AcceptInviteState> {
  const raw = Object.fromEntries(formData);
  const locale = typeof raw.locale === "string" && isLocale(raw.locale) ? raw.locale : defaultLocale;
  const dict = await getDictionary(locale);
  const messages = dict.auth.register.errors;
  const name = String(raw.name ?? "");

  const parsed = z
    .object({
      token: z.string().min(1),
      name: z.string().trim().min(2, messages.name).max(80),
      password: z.string().min(8, messages.password).max(128),
    })
    .safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: AcceptInviteState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "name" || field === "password") fieldErrors[field] ??= issue.message;
    }
    return { fieldErrors, name };
  }

  let email: string;
  try {
    ({ email } = await invitationAcceptanceService.accept(parsed.data.token, parsed.data));
  } catch (error) {
    if (error instanceof TeamError) return { error: dict.dashboard.team.errors[error.code], name };
    throw error;
  }

  try {
    await signIn("credentials", { email, password: parsed.data.password, redirectTo: `/${locale}/dashboard` });
  } catch (error) {
    if (error instanceof AuthError) return { error: messages.signInFailed, name };
    throw error; // Next.js redirect
  }
  return {};
}
