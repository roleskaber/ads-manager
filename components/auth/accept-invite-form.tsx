"use client";

import { ArrowRight } from "lucide-react";
import { useActionState } from "react";
import { acceptInviteAction, type AcceptInviteState } from "@/app/[lang]/invite/[token]/actions";
import { FormAlert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

type AcceptInviteFormProps = {
  locale: Locale;
  token: string;
  email: string;
  t: Dictionary["auth"]["acceptInvite"];
};

export function AcceptInviteForm({ locale, token, email, t }: AcceptInviteFormProps) {
  const [state, formAction, isPending] = useActionState<AcceptInviteState, FormData>(acceptInviteAction, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />
      <TextField label={t.email} name="email" value={email} readOnly disabled />
      <TextField label={t.name} name="name" autoComplete="name" required defaultValue={state.name} error={errors.name} />
      <TextField label={t.password} name="password" type="password" autoComplete="new-password" required error={errors.password} placeholder={t.passwordPlaceholder} />
      <FormAlert message={state.error} />
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? t.submitting : t.submit} {!isPending && <ArrowRight size={16} />}
      </Button>
    </form>
  );
}
