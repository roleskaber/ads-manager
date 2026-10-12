import { slugify } from "@/lib/slugify";
import type { PasswordHasher } from "@/lib/security/password-hasher";
import type { RegisterInput } from "@/lib/validation/auth";
import type { CompanyRepository } from "@/server/companies/company.repository";
import type { UserRepository } from "@/server/users/user.repository";

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("An account with this email already exists.");
  }
}

export class RegistrationService {
  constructor(
    private readonly users: UserRepository,
    private readonly companies: CompanyRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async registerCompanyOwner(input: RegisterInput) {
    if (await this.users.existsByEmail(input.email)) {
      throw new EmailAlreadyRegisteredError();
    }

    return this.companies.createWithOwner({
      company: { name: input.companyName, slug: await this.uniqueSlug(input.companyName) },
      owner: {
        name: input.name,
        email: input.email,
        passwordHash: await this.hasher.hash(input.password),
      },
    });
  }

  private async uniqueSlug(companyName: string) {
    const base = slugify(companyName) || "company";
    let slug = base;
    for (let suffix = 2; await this.companies.slugExists(slug); suffix++) {
      slug = `${base}-${suffix}`;
    }
    return slug;
  }
}
