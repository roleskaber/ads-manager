import type { PrismaClient, UserRole } from "@/lib/generated/prisma/client";

export type Member = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  createdAt: Date;
};

export interface MemberRepository {
  findById(id: string): Promise<Member | null>;
  listByCompany(companyId: string): Promise<Member[]>;
  updateRole(id: string, role: UserRole): Promise<void>;
  remove(id: string): Promise<void>;
  transferOwnership(fromId: string, toId: string): Promise<void>;
}

const memberSelect = { id: true, name: true, email: true, role: true, companyId: true, createdAt: true } as const;
const roleOrder: UserRole[] = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];

export class PrismaMemberRepository implements MemberRepository {
  constructor(private readonly db: PrismaClient) {}

  findById(id: string) {
    return this.db.user.findUnique({ where: { id }, select: memberSelect });
  }

  async listByCompany(companyId: string) {
    const members = await this.db.user.findMany({ where: { companyId }, select: memberSelect, orderBy: { createdAt: "asc" } });
    return members.sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role));
  }

  async updateRole(id: string, role: UserRole) {
    await this.db.user.update({ where: { id }, data: { role } });
  }

  async remove(id: string) {
    await this.db.user.delete({ where: { id } });
  }

  async transferOwnership(fromId: string, toId: string) {
    await this.db.$transaction([
      this.db.user.update({ where: { id: fromId }, data: { role: "ADMIN" } }),
      this.db.user.update({ where: { id: toId }, data: { role: "OWNER" } }),
    ]);
  }
}
