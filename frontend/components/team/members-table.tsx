import { Panel } from "@/components/dashboard/panel";
import { interpolate } from "@/i18n/interpolate";
import { MemberActions } from "./member-actions";
import { RoleBadge } from "./role-badge";
import type { TeamDictionary, TeamMemberView } from "./types";

export function MembersTable({ members, t }: { members: TeamMemberView[]; t: TeamDictionary }) {
  return (
    <Panel
      title={t.members.title}
      description={interpolate(t.members.description, { count: members.length })}
      headerClassName="border-b border-slate-100 p-5"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">{t.members.columns.member}</th>
              <th className="px-5 py-3 font-medium">{t.members.columns.role}</th>
              <th className="px-5 py-3 font-medium">{t.members.columns.joined}</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50/70">
                <td className="px-5 py-4">
                  <p className="font-medium text-slate-800">
                    {member.name}
                    {member.isYou && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{t.members.you}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{member.email}</p>
                </td>
                <td className="px-5 py-4"><RoleBadge role={member.role} label={t.roles[member.role]} /></td>
                <td className="px-5 py-4 text-slate-500">{member.joined}</td>
                <td className="px-5 py-4"><MemberActions member={member} t={t} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
