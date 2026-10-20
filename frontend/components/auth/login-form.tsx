"use client";

import { ArrowRight } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { FormAlert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

type LoginFormProps = { locale: Locale; t: Dictionary["auth"]["login"] };

export function LoginForm({ locale, t }: LoginFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setError(t.error);
      setIsSubmitting(false);
      return;
    }

    router.push(`/${locale}/dashboard`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextField label={t.email} name="email" type="email" autoComplete="email" required placeholder="you@company.com" />
      <TextField label={t.password} name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
      <FormAlert message={error} />
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? t.submitting : t.submit} {!isSubmitting && <ArrowRight size={16} />}
      </Button>
    </form>
  );
}
