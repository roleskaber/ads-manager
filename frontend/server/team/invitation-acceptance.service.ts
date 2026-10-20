import type { PasswordHasher } from "@/lib/security/password-hasher";
import type { TokenService } from "@/lib/security/token";
import type { UserRepository } from "@/server/users/user.repository";
import type { InvitationRepository } from "./invitation.repository";
import { TeamError } from "./team-error";

export class InvitationAcceptanceService {
  constructor(
    private readonly invitations: InvitationRepository,
    private readonly users: UserRepository,
    private readonly tokens: TokenService,
    private readonly hasher: PasswordHasher,
  ) {}

  async preview(token: string) {
    const invitation = await this.findValid(token);
    return { email: invitation.email, role: invitation.role, companyName: invitation.company.name };
  }

  async accept(token: string, input: { name: string; password: string }) {
    const invitation = await this.findValid(token);
    if (await this.users.existsByEmail(invitation.email)) throw new TeamError("alreadyMember");

    await this.invitations.accept({
      invitationId: invitation.id,
      user: {
        name: input.name,
        email: invitation.email,
        passwordHash: await this.hasher.hash(input.password),
        role: invitation.role,
        companyId: invitation.companyId,
      },
    });
    return { email: invitation.email };
  }

  private async findValid(token: string) {
    const invitation = await this.invitations.findByTokenHash(this.tokens.hash(token));
    if (!invitation || invitation.acceptedAt) throw new TeamError("invitationInvalid");
    if (invitation.expiresAt < new Date()) throw new TeamError("invitationExpired");
    return invitation;
  }
}
