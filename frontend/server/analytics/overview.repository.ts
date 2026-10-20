import type { PrismaClient } from "@/lib/generated/prisma/client";

export type Period = { from: Date; to: Date };

export type ConversionTotals = { conversions: number; revenue: number; currency: string | null };
export type DailyPoint = { day: Date; visitors: number; conversions: number };
export type ChannelRow = { channel: string; visitors: number };
export type SourceRow = {
  campaign: string | null;
  source: string;
  medium: string | null;
  channel: string;
  visitors: number;
  conversions: number;
  revenue: number;
};

/** Read-side aggregations for the overview dashboard. All counts are distinct visitors. */
export interface OverviewRepository {
  countVisitors(companyId: string, period: Period): Promise<number>;
  conversionTotals(companyId: string, event: string, period: Period): Promise<ConversionTotals>;
  daily(companyId: string, event: string, period: Period): Promise<DailyPoint[]>;
  channels(companyId: string, period: Period): Promise<ChannelRow[]>;
  sources(companyId: string, event: string, period: Period, limit: number): Promise<SourceRow[]>;
  adSpend(companyId: string, period: Period): Promise<number | null>;
  trackingKey(companyId: string): Promise<string>;
}

export class PrismaOverviewRepository implements OverviewRepository {
  constructor(private readonly db: PrismaClient) {}

  async countVisitors(companyId: string, { from, to }: Period) {
    const [row] = await this.db.$queryRaw<[{ visitors: number }]>`
      SELECT COUNT(DISTINCT "visitorId")::int AS visitors
      FROM tracked_events
      WHERE "companyId" = ${companyId} AND "occurredAt" >= ${from} AND "occurredAt" < ${to}`;
    return row.visitors;
  }

  async conversionTotals(companyId: string, event: string, { from, to }: Period) {
    const [row] = await this.db.$queryRaw<[ConversionTotals]>`
      SELECT
        COUNT(DISTINCT "visitorId")::int AS conversions,
        COALESCE(SUM(CASE WHEN properties->>'amount' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (properties->>'amount')::numeric END), 0)::float AS revenue,
        MODE() WITHIN GROUP (ORDER BY properties->>'currency') AS currency
      FROM tracked_events
      WHERE "companyId" = ${companyId} AND name = ${event} AND "occurredAt" >= ${from} AND "occurredAt" < ${to}`;
    return row;
  }

  daily(companyId: string, event: string, { from, to }: Period) {
    return this.db.$queryRaw<DailyPoint[]>`
      SELECT
        date_trunc('day', "occurredAt") AS day,
        COUNT(DISTINCT "visitorId")::int AS visitors,
        COUNT(DISTINCT "visitorId") FILTER (WHERE name = ${event})::int AS conversions
      FROM tracked_events
      WHERE "companyId" = ${companyId} AND "occurredAt" >= ${from} AND "occurredAt" < ${to}
      GROUP BY 1
      ORDER BY 1`;
  }

  channels(companyId: string, { from, to }: Period) {
    return this.db.$queryRaw<ChannelRow[]>`
      SELECT COALESCE(t.channel::text, 'NONE') AS channel, COUNT(DISTINCT e."visitorId")::int AS visitors
      FROM tracked_events e
      LEFT JOIN touchpoints t ON t.id = e."touchpointId"
      WHERE e."companyId" = ${companyId} AND e."occurredAt" >= ${from} AND e."occurredAt" < ${to}
      GROUP BY 1
      ORDER BY 2 DESC`;
  }

  sources(companyId: string, event: string, { from, to }: Period, limit: number) {
    return this.db.$queryRaw<SourceRow[]>`
      SELECT
        t.campaign, t.source, t.medium, t.channel::text AS channel,
        COUNT(DISTINCT e."visitorId")::int AS visitors,
        COUNT(DISTINCT e."visitorId") FILTER (WHERE e.name = ${event})::int AS conversions,
        COALESCE(SUM(CASE WHEN e.name = ${event} AND e.properties->>'amount' ~ '^-?[0-9]+(\\.[0-9]+)?$'
          THEN (e.properties->>'amount')::numeric END), 0)::float AS revenue
      FROM tracked_events e
      JOIN touchpoints t ON t.id = e."touchpointId"
      WHERE e."companyId" = ${companyId} AND e."occurredAt" >= ${from} AND e."occurredAt" < ${to}
      GROUP BY 1, 2, 3, 4
      ORDER BY visitors DESC, conversions DESC
      LIMIT ${limit}`;
  }

  /** Total ad cost in the period, or null when the company has no ad accounts connected. */
  async adSpend(companyId: string, { from, to }: Period) {
    const accounts = await this.db.adAccount.count({ where: { companyId } });
    if (accounts === 0) return null;
    const [row] = await this.db.$queryRaw<[{ micros: bigint }]>`
      SELECT COALESCE(SUM(m."costMicros"), 0)::bigint AS micros
      FROM campaign_metrics m
      JOIN campaigns c ON c.id = m."campaignId"
      WHERE c."companyId" = ${companyId} AND m.date >= ${from}::date AND m.date < ${to}::date`;
    return Number(row.micros) / 1_000_000;
  }

  async trackingKey(companyId: string) {
    const company = await this.db.company.findUniqueOrThrow({ where: { id: companyId }, select: { trackingKey: true } });
    return company.trackingKey;
  }
}
