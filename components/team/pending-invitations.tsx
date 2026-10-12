"use client";

import { Mail, X } from "lucide-react";
import { revokeInvitationAction } from "@/app/[lang]/dashboard/team/actions";
import { Panel } from "@/components/dashboard/panel";
import { interpolate } from "@/i18n/interpolate";
import { RoleBadge } from "./role-badge";
import type { InvitationView, TeamDictionary } from "./types";
import { useTeamAction } from "./use-team-action";

export function PendingInvitations({ invitations, t }: { invitations: InvitationView[]; t: TeamDictionary }) {
  const { isPending, run } = useTeamAction(t);

  return (
    <Panel title={t.pending.title} className="p-5">
      {invitations.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">{t.pending.empty}</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {invitations.map((invitation) => (
            <li key={invitation.id} className="flex items-center gap-3 py-3">
              <Mail size={16} className="shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{invitation.email}</p>
                <p className="mt-0.5 text-xs text-slate-400">{interpolate(t.pending.expires, { date: invitation.expires })}</p>
              </div>
              <RoleBadge role={invitation.role} label={t.roles[invitation.role]} />
              {invitation.canRevoke && (
                <button
                  type="button"
                  title={t.pending.revoke}
                  aria-label={t.pending.revoke}
                  disabled={isPending}
                  onClick={() => run(() => revokeInvitationAction(invitation.id), t.success.revoked)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 disabled:opacity-50"
                >
                  <X size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
