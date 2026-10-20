import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { FunnelEvent } from "./compute-funnel";

export type FunnelDefinition = { id: string; companyId: string; name: string; steps: string[]; conversionWindowDays: number };

export interface FunnelRepository {
  listByCompany(companyId: string): Promise<FunnelDefinition[]>;
  findById(id: string): Promise<FunnelDefinition | null>;
  create(input: Omit<FunnelDefinition, "id">): Promise<FunnelDefinition>;
  findEvents(companyId: string, names: string[], from: Date, to: Date): Promise<FunnelEvent[]>;
}

const funnelSelect = { id: true, companyId: true, name: true, steps: true, conversionWindowDays: true } as const;

export class PrismaFunnelRepository implements FunnelRepository {
  constructor(private readonly db: PrismaClient) {}

  listByCompany(companyId: string) {
    return this.db.funnel.findMany({ where: { companyId }, select: funnelSelect, orderBy: { createdAt: "asc" } });
  }

  findById(id: string) {
    return this.db.funnel.findUnique({ where: { id }, select: funnelSelect });
  }

  create(input: Omit<FunnelDefinition, "id">) {
    return this.db.funnel.create({ data: input, select: funnelSelect });
  }

  findEvents(companyId: string, names: string[], from: Date, to: Date) {
    return this.db.trackedEvent.findMany({
      where: { companyId, name: { in: names }, occurredAt: { gte: from, lte: to } },
      select: {
        visitorId: true,
        name: true,
        occurredAt: true,
        touchpoint: { select: { channel: true, source: true, campaign: true } },
      },
      orderBy: { occurredAt: "asc" },
    }).then((rows) => rows.map(({ touchpoint, ...row }) => ({ ...row, touch: touchpoint })));
  }
}
