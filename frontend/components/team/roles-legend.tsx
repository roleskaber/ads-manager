import { Panel } from "@/components/dashboard/panel";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { RoleBadge } from "./role-badge";
import type { TeamDictionary } from "./types";

const roles: UserRole[] = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];

export function RolesLegend({ t }: { t: TeamDictionary }) {
  return (
    <Panel title={t.rolesTitle} className="p-5">
      <dl className="mt-4 space-y-3">
        {roles.map((role) => (
          <div key={role} className="flex items-start gap-3">
            <dt className="w-28 shrink-0"><RoleBadge role={role} label={t.roles[role]} /></dt>
            <dd className="text-sm leading-6 text-slate-500">{t.roleDescriptions[role]}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
