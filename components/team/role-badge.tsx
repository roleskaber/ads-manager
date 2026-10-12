import type { UserRole } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/cn";

const roleStyles: Record<UserRole, string> = {
  OWNER: "bg-slate-950 text-white",
  ADMIN: "bg-blue-50 text-blue-700",
  MEMBER: "bg-emerald-50 text-emerald-700",
  VIEWER: "bg-slate-100 text-slate-600",
};

export function RoleBadge({ role, label }: { role: UserRole; label: string }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", roleStyles[role])}>{label}</span>;
}
