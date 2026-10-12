import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { resolveLocale } from "@/i18n/route-params";

export async function generateMetadata({ params }: PageProps<"/[lang]/register">): Promise<Metadata> {
  const { dict } = await resolveLocale(params);
  return { title: dict.auth.register.metaTitle };
}

export default async function RegisterPage({ params }: PageProps<"/[lang]/register">) {
  const { locale, dict } = await resolveLocale(params);
  const t = dict.auth.register;

  return (
    <AuthCard
      locale={locale}
      title={t.title}
      description={t.description}
      footer={<>{t.haveAccount} <Link href={`/${locale}/login`} className="font-medium text-slate-900 underline-offset-4 hover:underline">{t.signIn}</Link></>}
    >
      <RegisterForm locale={locale} t={t} />
    </AuthCard>
  );
}
