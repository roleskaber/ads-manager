"use client";

import { ArrowRight } from "lucide-react";
import { useActionState } from "react";
import { registerAction, type RegisterState } from "@/app/[lang]/register/actions";
import { FormAlert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

type RegisterFormProps = { locale: Locale; t: Dictionary["auth"]["register"] };

export function RegisterForm({ locale, t }: RegisterFormProps) {
  const [state, formAction, isPending] = useActionState<RegisterState, FormData>(registerAction, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <TextField label={t.name} name="name" autoComplete="name" required defaultValue={state.values?.name} error={errors.name} placeholder={t.namePlaceholder} />
      <TextField label={t.company} name="companyName" autoComplete="organization" required defaultValue={state.values?.companyName} error={errors.companyName} placeholder={t.companyPlaceholder} />
      <TextField label={t.email} name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} error={errors.email} placeholder="you@company.com" />
      <TextField label={t.password} name="password" type="password" autoComplete="new-password" required error={errors.password} placeholder={t.passwordPlaceholder} />
      <FormAlert message={state.error} />
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? t.submitting : t.submit} {!isPending && <ArrowRight size={16} />}
      </Button>
    </form>
  );
}
