import type { FunnelRepository } from "@/server/tracking/funnel/funnel.repository";
import type { OverviewRepository, Period } from "./overview.repository";
import { eachDay, resolvePeriod, type PeriodOption } from "@/lib/period";

export type Metric = { value: number | null; previous: number | null };

const SOURCES_LIMIT = 50;

export class OverviewService {
  constructor(
    private readonly overview: OverviewRepository,
    private readonly funnels: FunnelRepository,
  ) {}

  async build(companyId: string, option: PeriodOption) {
    const { current, previous } = resolvePeriod(option);
    const conversionEvent = await this.conversionEvent(companyId);
    const event = conversionEvent ?? "";

    const [visitors, prevVisitors, totals, prevTotals, spend, prevSpend, daily, channels, sources] = await Promise.all([
      this.overview.countVisitors(companyId, current),
      this.overview.countVisitors(companyId, previous),
      this.overview.conversionTotals(companyId, event, current),
      this.overview.conversionTotals(companyId, event, previous),
      this.overview.adSpend(companyId, current),
      this.overview.adSpend(companyId, previous),
      this.overview.daily(companyId, event, current),
      this.overview.channels(companyId, current),
      this.overview.sources(companyId, event, current, SOURCES_LIMIT),
    ]);

    const trackingKey = visitors === 0 && prevVisitors === 0 ? await this.overview.trackingKey(companyId) : null;

    return {
      period: option,
      conversionEvent,
      currency: totals.currency ?? prevTotals.currency,
      hasAdAccounts: spend !== null,
      trackingKey,
      metrics: {
        visitors: { value: visitors, previous: prevVisitors },
        conversions: { value: totals.conversions, previous: prevTotals.conversions },
        revenue: { value: totals.revenue, previous: prevTotals.revenue },
        roas: { value: roas(totals.revenue, spend), previous: roas(prevTotals.revenue, prevSpend) },
      } satisfies Record<string, Metric>,
      series: this.fillDays(current, daily),
      channels,
      sources,
    };
  }

  /** The conversion goal is the last step of the company's first funnel. */
  private async conversionEvent(companyId: string) {
    const [primary] = await this.funnels.listByCompany(companyId);
    return primary?.steps.at(-1) ?? null;
  }

  private fillDays(period: Period, points: Array<{ day: Date; visitors: number; conversions: number }>) {
    const byDay = new Map(points.map((point) => [point.day.getTime(), point]));
    return eachDay(period.from, period.to).map((day) => ({
      day: day.toISOString(),
      visitors: byDay.get(day.getTime())?.visitors ?? 0,
      conversions: byDay.get(day.getTime())?.conversions ?? 0,
    }));
  }
}

function roas(revenue: number, spend: number | null) {
  return spend ? revenue / spend : null;
}

export type Overview = Awaited<ReturnType<OverviewService["build"]>>;
