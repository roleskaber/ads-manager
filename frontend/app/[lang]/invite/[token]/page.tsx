import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AcceptInviteForm } from "@/components/auth/accept-invite-form";
import { AuthCard, AuthCardSkeleton } from "@/components/auth/auth-card";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { interpolate } from "@/i18n/interpolate";
import { resolveRootLocale } from "@/i18n/route-params";
import { invitationAcceptanceService } from "@/server/container";
import { TeamError } from "@/server/team/team-error";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await resolveRootLocale();
  return { title: dict.auth.acceptInvite.metaTitle, robots: { index: false } };
}

export default async function AcceptInvitePage({ params }: PageProps<"/[lang]/invite/[token]">) {
  const { locale, dict } = await resolveRootLocale();
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <Invitation locale={locale} dict={dict} token={params.then((value) => value.token)} />
    </Suspense>
  );
}

type InvitationProps = { locale: Locale; dict: Dictionary; token: Promise<string> };

async function Invitation({ locale, dict, token: tokenPromise }: InvitationProps) {
  const t = dict.auth.acceptInvite;
  const token = await tokenPromise;

  let invitation: Awaited<ReturnType<typeof invitationAcceptanceService.preview>>;
  try {
    invitation = await invitationAcceptanceService.preview(token);
  } catch (error) {
    if (!(error instanceof TeamError)) throw error;
    return (
      <AuthCard
        locale={locale}
        title={t.invalidTitle}
        description={dict.dashboard.team.errors[error.code]}
        footer={<Link href={`/${locale}`} className="font-medium text-slate-900 underline-offset-4 hover:underline">{t.backHome}</Link>}
      >
        {null}
      </AuthCard>
    );
  }

  return (
    <AuthCard
      locale={locale}
      title={interpolate(t.title, { company: invitation.companyName })}
      description={interpolate(t.description, { role: dict.dashboard.team.roles[invitation.role] })}
      footer={<Link href={`/${locale}/login`} className="font-medium text-slate-900 underline-offset-4 hover:underline">{dict.auth.register.haveAccount} {dict.auth.register.signIn}</Link>}
    >
      <AcceptInviteForm locale={locale} token={token} email={invitation.email} t={t} />
    </AuthCard>
  );
}
