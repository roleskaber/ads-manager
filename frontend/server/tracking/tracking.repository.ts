import type { PrismaClient, TrafficChannel } from "@/lib/generated/prisma/client";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { Touch } from "./touch/touch";

export type TrackedCompany = { id: string; slug: string };
export type VisitorRecord = { id: string; externalId: string | null };
export type TouchRecord = Touch & { id: string; occurredAt: Date };

export type CreateEventInput = {
  companyId: string;
  visitorId: string;
  touchpointId: string | null;
  name: string;
  url: string | null;
  properties: Record<string, unknown> | null;
  occurredAt: Date;
};

export interface TrackingRepository {
  findCompanyByTrackingKey(key: string): Promise<TrackedCompany | null>;
  findVisitorByAnonymousId(companyId: string, anonymousId: string): Promise<VisitorRecord | null>;
  findVisitorByExternalId(companyId: string, externalId: string): Promise<VisitorRecord | null>;
  createVisitor(companyId: string, anonymousId: string, externalId: string | null, seenAt: Date): Promise<VisitorRecord>;
  touchVisitor(visitorId: string, seenAt: Date, externalId?: string): Promise<void>;
  findTouches(visitorId: string, since: Date): Promise<TouchRecord[]>;
  createTouch(companyId: string, visitorId: string, touch: Touch, meta: { referrer: string | null; landingUrl: string | null; occurredAt: Date }): Promise<TouchRecord>;
  createEvent(input: CreateEventInput): Promise<void>;
}

const touchSelect = {
  id: true, channel: true, source: true, medium: true, campaign: true, content: true,
  term: true, clickId: true, clickIdType: true, occurredAt: true,
} as const;

export class PrismaTrackingRepository implements TrackingRepository {
  constructor(private readonly db: PrismaClient) {}

  findCompanyByTrackingKey(trackingKey: string) {
    return this.db.company.findUnique({ where: { trackingKey }, select: { id: true, slug: true } });
  }

  findVisitorByAnonymousId(companyId: string, anonymousId: string) {
    return this.db.visitor.findUnique({
      where: { companyId_anonymousId: { companyId, anonymousId } },
      select: { id: true, externalId: true },
    });
  }

  findVisitorByExternalId(companyId: string, externalId: string) {
    return this.db.visitor.findFirst({
      where: { companyId, externalId },
      orderBy: { lastSeenAt: "desc" },
      select: { id: true, externalId: true },
    });
  }

  createVisitor(companyId: string, anonymousId: string, externalId: string | null, seenAt: Date) {
    return this.db.visitor.upsert({
      where: { companyId_anonymousId: { companyId, anonymousId } },
      update: { lastSeenAt: seenAt },
      create: { companyId, anonymousId, externalId, firstSeenAt: seenAt, lastSeenAt: seenAt },
      select: { id: true, externalId: true },
    });
  }

  async touchVisitor(visitorId: string, seenAt: Date, externalId?: string) {
    await this.db.visitor.update({
      where: { id: visitorId },
      data: { lastSeenAt: seenAt, ...(externalId ? { externalId } : {}) },
    });
  }

  findTouches(visitorId: string, since: Date) {
    return this.db.touchpoint.findMany({
      where: { visitorId, occurredAt: { gte: since } },
      orderBy: { occurredAt: "asc" },
      select: touchSelect,
    });
  }

  createTouch(companyId: string, visitorId: string, touch: Touch, meta: { referrer: string | null; landingUrl: string | null; occurredAt: Date }) {
    return this.db.touchpoint.create({
      data: { companyId, visitorId, ...touch, channel: touch.channel as TrafficChannel, ...meta },
      select: touchSelect,
    });
  }

  async createEvent({ properties, ...input }: CreateEventInput) {
    await this.db.trackedEvent.create({
      data: { ...input, properties: (properties ?? undefined) as Prisma.InputJsonValue | undefined },
    });
  }
}
