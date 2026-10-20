import type { UserRole } from "@/lib/generated/prisma/enums";

export const assignableRoles = ["ADMIN", "MEMBER", "VIEWER"] as const satisfies readonly UserRole[];
export type AssignableRole = (typeof assignableRoles)[number];

export function isAssignableRole(value: unknown): value is AssignableRole {
  return assignableRoles.includes(value as AssignableRole);
}
