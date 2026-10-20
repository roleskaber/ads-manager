import type { PrismaClient, UserRole } from "@/lib/generated/prisma/client";

export type UserWithCompany = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  company: { id: string; name: string; slug: string };
};

export interface UserRepository {
  findByEmail(email: string): Promise<UserWithCompany | null>;
  findById(id: string): Promise<UserWithCompany | null>;
  existsByEmail(email: string): Promise<boolean>;
}

const userWithCompanySelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  passwordHash: true,
  company: { select: { id: true, name: true, slug: true } },
} as const;

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: PrismaClient) {}

  findByEmail(email: string) {
    return this.db.user.findUnique({ where: { email }, select: userWithCompanySelect });
  }

  findById(id: string) {
    return this.db.user.findUnique({ where: { id }, select: userWithCompanySelect });
  }

  async existsByEmail(email: string) {
    const count = await this.db.user.count({ where: { email } });
    return count > 0;
  }
}
