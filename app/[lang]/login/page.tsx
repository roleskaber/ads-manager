import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { resolveLocale } from "@/i18n/route-params";

export async function generateMetadata({ params }: PageProps<"/[lang]/login">): Promise<Metadata> {
  const { dict } = await resolveLocale(params);
  return { title: dict.auth.login.metaTitle };
}

export default async function LoginPage({ params }: PageProps<"/[lang]/login">) {
  const { locale, dict } = await resolveLocale(params);
  const t = dict.auth.login;

  return (
    <AuthCard
      locale={locale}
      title={t.title}
      description={t.description}
      footer={<>{t.noAccount} <Link href={`/${locale}/register`} className="font-medium text-slate-900 underline-offset-4 hover:underline">{t.createWorkspace}</Link></>}
    >
      <LoginForm locale={locale} t={t} />
    </AuthCard>
  );
}
