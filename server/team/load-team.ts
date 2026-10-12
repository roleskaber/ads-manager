import "server-only";
import { format } from "date-fns";
import { cache } from "react";
import type { InvitationView, TeamMemberView } from "@/components/team/types";
import type { Locale } from "@/i18n/config";
import { dateLocales } from "@/i18n/date-locale";
import { getCurrentUser } from "@/server/auth/current-user";
import { teamService } from "@/server/container";

// Per-request team snapshot shaped for the UI; cached so sibling boundaries share one query.
export const loadTeam = cache(async (locale: Locale) => {
  const user = await getCurrentUser(locale);
  const team = await teamService.getTeam(user.id);
  const formatDate = (date: Date) => format(date, "d MMM yyyy", { locale: dateLocales[locale] });

  const members: TeamMemberView[] = team.members.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    joined: formatDate(member.createdAt),
    isYou: member.id === user.id,
    permissions: member.permissions,
  }));

  const invitations: InvitationView[] = team.invitations.map((invitation) => ({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    expires: formatDate(invitation.expiresAt),
    canRevoke: invitation.canRevoke,
  }));

  return { members, invitations, grantableRoles: team.grantableRoles };
});
