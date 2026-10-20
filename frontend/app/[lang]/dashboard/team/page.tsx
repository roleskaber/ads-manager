import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { InviteMemberForm } from "@/components/team/invite-member-form";
import { MembersTable } from "@/components/team/members-table";
import { PendingInvitations } from "@/components/team/pending-invitations";
import { RolesLegend } from "@/components/team/roles-legend";
import { InviteFormSkeleton, MembersSkeleton } from "@/components/team/team-skeletons";
import type { TeamDictionary } from "@/components/team/types";
import type { Locale } from "@/i18n/config";
import { resolveLocale } from "@/i18n/route-params";
import { loadTeam } from "@/server/team/load-team";

export async function generateMetadata({ params }: PageProps<"/[lang]/dashboard/team">): Promise<Metadata> {
  const { dict } = await resolveLocale(params);
  return { title: dict.dashboard.team.metaTitle };
}

export default async function TeamPage({ params }: PageProps<"/[lang]/dashboard/team">) {
  const { locale, dict } = await resolveLocale(params);
  const t = dict.dashboard.team;

  return (
    <>
      <PageHeader eyebrow={dict.dashboard.nav.team} title={t.title} description={t.subtitle} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <Suspense fallback={<MembersSkeleton />}>
          <TeamMembers locale={locale} t={t} />
        </Suspense>
        <div className="space-y-6">
          <Suspense fallback={<InviteFormSkeleton />}>
            <TeamInvite locale={locale} t={t} />
          </Suspense>
          <RolesLegend t={t} />
        </div>
      </div>
    </>
  );
}

type SectionProps = { locale: Locale; t: TeamDictionary };

async function TeamMembers({ locale, t }: SectionProps) {
  const { members, invitations, grantableRoles } = await loadTeam(locale);
  return (
    <div className="space-y-6">
      <MembersTable members={members} t={t} />
      {grantableRoles.length > 0 && <PendingInvitations invitations={invitations} t={t} />}
    </div>
  );
}

async function TeamInvite({ locale, t }: SectionProps) {
  const { grantableRoles } = await loadTeam(locale);
  return <InviteMemberForm locale={locale} t={t} roles={grantableRoles} />;
}
