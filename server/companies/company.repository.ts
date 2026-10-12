import type { PrismaClient } from "@/lib/generated/prisma/client";

export type CreateCompanyWithOwnerInput = {
  company: { name: string; slug: string };
  owner: { name: string; email: string; passwordHash: string };
};

export interface CompanyRepository {
  slugExists(slug: string): Promise<boolean>;
  createWithOwner(input: CreateCompanyWithOwnerInput): Promise<{ companyId: string; userId: string }>;
}

export class PrismaCompanyRepository implements CompanyRepository {
  constructor(private readonly db: PrismaClient) {}

  async slugExists(slug: string) {
    const count = await this.db.company.count({ where: { slug } });
    return count > 0;
  }

  async createWithOwner({ company, owner }: CreateCompanyWithOwnerInput) {
    const created = await this.db.company.create({
      data: {
        ...company,
        users: { create: { ...owner, role: "OWNER" } },
      },
      select: { id: true, users: { select: { id: true } } },
    });

    return { companyId: created.id, userId: created.users[0].id };
  }
}
