import type { UserRole } from "@/lib/generated/prisma/enums";
import { assignableRoles, type AssignableRole } from "./roles";

export type Actor = { id: string; role: UserRole; companyId: string };
export type Subject = { id: string; role: UserRole; companyId: string };

const rank: Record<UserRole, number> = { OWNER: 3, ADMIN: 2, MEMBER: 1, VIEWER: 0 };

// Single source of truth for who may do what inside a workspace.
export class TeamPolicy {
  isManager(actor: Actor) {
    return actor.role === "OWNER" || actor.role === "ADMIN";
  }

  /** Roles the actor is allowed to hand out: owners — any, admins — only below admin. */
  grantableRoles(actor: Actor): AssignableRole[] {
    if (!this.isManager(actor)) return [];
    return assignableRoles.filter((role) => rank[role] < rank[actor.role]);
  }

  canInvite(actor: Actor, role: AssignableRole) {
    return this.grantableRoles(actor).includes(role);
  }

  canChangeRole(actor: Actor, subject: Subject, nextRole: AssignableRole) {
    return this.outranks(actor, subject) && this.canInvite(actor, nextRole);
  }

  canRemove(actor: Actor, subject: Subject) {
    return this.outranks(actor, subject);
  }

  canTransferOwnership(actor: Actor, subject: Subject) {
    return actor.role === "OWNER" && actor.companyId === subject.companyId && actor.id !== subject.id;
  }

  canRevokeInvitation(actor: Actor, invitation: Omit<Subject, "id">) {
    return this.isManager(actor) && actor.companyId === invitation.companyId && rank[actor.role] > rank[invitation.role];
  }

  private outranks(actor: Actor, subject: Subject) {
    return (
      this.isManager(actor) &&
      actor.companyId === subject.companyId &&
      actor.id !== subject.id &&
      rank[actor.role] > rank[subject.role]
    );
  }
}
