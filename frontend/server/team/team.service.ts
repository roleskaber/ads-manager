import type { TokenService } from "@/lib/security/token";
import type { UserRepository } from "@/server/users/user.repository";
import type { InvitationRepository } from "./invitation.repository";
import type { Member, MemberRepository } from "./member.repository";
import type { AssignableRole } from "./roles";
import { TeamError } from "./team-error";
import type { TeamPolicy } from "./team-policy";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type MemberPermissions = {
  roles: AssignableRole[];
  canRemove: boolean;
  canTransferOwnership: boolean;
};

export class TeamService {
  constructor(
    private readonly members: MemberRepository,
    private readonly invitations: InvitationRepository,
    private readonly users: UserRepository,
    private readonly tokens: TokenService,
    private readonly policy: TeamPolicy,
  ) {}

  async getTeam(actorId: string) {
    const actor = await this.loadActor(actorId);
    const isManager = this.policy.isManager(actor);
    const [members, invitations] = await Promise.all([
      this.members.listByCompany(actor.companyId),
      isManager ? this.invitations.listPending(actor.companyId) : Promise.resolve([]),
    ]);

    return {
      actor,
      grantableRoles: this.policy.grantableRoles(actor),
      members: members.map((member) => ({ ...member, permissions: this.permissionsFor(actor, member) })),
      invitations: invitations.map((invitation) => ({
        ...invitation,
        canRevoke: this.policy.canRevokeInvitation(actor, invitation),
      })),
    };
  }

  async invite(actorId: string, email: string, role: AssignableRole) {
    const actor = await this.loadActor(actorId);
    if (!this.policy.canInvite(actor, role)) throw new TeamError("forbidden");
    if (await this.users.existsByEmail(email)) throw new TeamError("alreadyMember");

    const token = this.tokens.generate();
    await this.invitations.deletePendingForEmail(actor.companyId, email);
    await this.invitations.create({
      email,
      role,
      tokenHash: this.tokens.hash(token),
      companyId: actor.companyId,
      invitedById: actor.id,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    });
    return token;
  }

  async changeRole(actorId: string, memberId: string, role: AssignableRole) {
    const [actor, member] = await this.loadPair(actorId, memberId);
    if (!this.policy.canChangeRole(actor, member, role)) throw new TeamError("forbidden");
    await this.members.updateRole(member.id, role);
  }

  async remove(actorId: string, memberId: string) {
    const [actor, member] = await this.loadPair(actorId, memberId);
    if (!this.policy.canRemove(actor, member)) throw new TeamError("forbidden");
    await this.members.remove(member.id);
  }

  async transferOwnership(actorId: string, memberId: string) {
    const [actor, member] = await this.loadPair(actorId, memberId);
    if (!this.policy.canTransferOwnership(actor, member)) throw new TeamError("forbidden");
    await this.members.transferOwnership(actor.id, member.id);
  }

  async revokeInvitation(actorId: string, invitationId: string) {
    const actor = await this.loadActor(actorId);
    const invitation = await this.invitations.findById(invitationId);
    if (!invitation) throw new TeamError("notFound");
    if (!this.policy.canRevokeInvitation(actor, invitation)) throw new TeamError("forbidden");
    await this.invitations.delete(invitation.id);
  }

  private permissionsFor(actor: Member, member: Member): MemberPermissions {
    return {
      roles: this.policy.canRemove(actor, member) ? this.policy.grantableRoles(actor) : [],
      canRemove: this.policy.canRemove(actor, member),
      canTransferOwnership: this.policy.canTransferOwnership(actor, member),
    };
  }

  private async loadActor(actorId: string) {
    const actor = await this.members.findById(actorId);
    if (!actor) throw new TeamError("forbidden");
    return actor;
  }

  private async loadPair(actorId: string, memberId: string) {
    const [actor, member] = await Promise.all([this.loadActor(actorId), this.members.findById(memberId)]);
    if (!member || member.companyId !== actor.companyId) throw new TeamError("notFound");
    return [actor, member] as const;
  }
}
