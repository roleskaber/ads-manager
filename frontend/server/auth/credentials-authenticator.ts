import type { PasswordHasher } from "@/lib/security/password-hasher";
import type { UserRepository } from "@/server/users/user.repository";
import type { SessionUser } from "./session-user";

export class CredentialsAuthenticator {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async authenticate(email: string, password: string): Promise<SessionUser | null> {
    const user = await this.users.findByEmail(email);
    if (!user) return null;

    const valid = await this.hasher.verify(password, user.passwordHash);
    if (!valid) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.company.id,
      companyName: user.company.name,
    };
  }
}
