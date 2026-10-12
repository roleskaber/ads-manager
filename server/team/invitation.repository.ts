import type { PrismaClient, UserRole } from "@/lib/generated/prisma/client";

export type PendingInvitation = {
  id: string;
  email: string;
  role: UserRole;
  companyId: string;
  expiresAt: Date;
  createdAt: Date;
};

export type InvitationWithCompany = PendingInvitation & {
  acceptedAt: Date | null;
  company: { name: string };
};

export type CreateInvitationInput = {
  email: string;
  role: UserRole;
  tokenHash: string;
  companyId: string;
  invitedById: string;
  expiresAt: Date;
};

export type AcceptInvitationInput = {
  invitationId: string;
  user: { name: string; email: string; passwordHash: string; role: UserRole; companyId: string };
};

export interface InvitationRepository {
  create(input: CreateInvitationInput): Promise<void>;
  findById(id: string): Promise<PendingInvitation | null>;
  findByTokenHash(tokenHash: string): Promise<InvitationWithCompany | null>;
  listPending(companyId: string): Promise<PendingInvitation[]>;
  deletePendingForEmail(companyId: string, email: string): Promise<void>;
  delete(id: string): Promise<void>;
  accept(input: AcceptInvitationInput): Promise<void>;
}

const pendingSelect = { id: true, email: true, role: true, companyId: true, expiresAt: true, createdAt: true } as const;

export class PrismaInvitationRepository implements InvitationRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: CreateInvitationInput) {
    await this.db.invitation.create({ data: input });
  }

  findById(id: string) {
    return this.db.invitation.findFirst({ where: { id, acceptedAt: null }, select: pendingSelect });
  }

  findByTokenHash(tokenHash: string) {
    return this.db.invitation.findUnique({
      where: { tokenHash },
      select: { ...pendingSelect, acceptedAt: true, company: { select: { name: true } } },
    });
  }

  listPending(companyId: string) {
    return this.db.invitation.findMany({
      where: { companyId, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: pendingSelect,
      orderBy: { createdAt: "desc" },
    });
  }

  async deletePendingForEmail(companyId: string, email: string) {
    await this.db.invitation.deleteMany({ where: { companyId, email, acceptedAt: null } });
  }

  async delete(id: string) {
    await this.db.invitation.delete({ where: { id } });
  }

  async accept({ invitationId, user }: AcceptInvitationInput) {
    await this.db.$transaction([
      this.db.user.create({ data: user }),
      this.db.invitation.update({ where: { id: invitationId }, data: { acceptedAt: new Date() } }),
    ]);
  }
}
