import { DAY_MS, addDays, isoDate, minDate, startOfUtcDay } from "../../lib/dates.js";
import type { CampaignSnapshot } from "./campaign-snapshot.js";
import { scaleDelivery, simulateDay, type Delivery } from "./delivery-model.js";
import { servableAdGroups, servingWindow } from "./eligibility.js";

export type DaySlice = { date: Date; start: Date; end: Date; fraction: number };

/** Splits [start, end) into UTC-day slices. */
export function sliceByUtcDay(start: Date, end: Date): DaySlice[] {
  const slices: DaySlice[] = [];
  let cursor = start;
  while (cursor < end) {
    const date = startOfUtcDay(cursor);
    const sliceEnd = minDate(end, addDays(date, 1));
    slices.push({ date, start: cursor, end: sliceEnd, fraction: (sliceEnd.getTime() - cursor.getTime()) / DAY_MS });
    cursor = sliceEnd;
  }
  return slices;
}

export type AccrualInput = {
  now: Date;
  balanceMicros: bigint;
  campaigns: CampaignSnapshot[];
  /** Cost already recorded for a campaign on a UTC day (YYYY-MM-DD). */
  spentMicros: (campaignId: bigint, date: string) => number;
};

export type MetricIncrement = { campaignId: bigint; adGroupId: bigint; date: Date; delivery: Delivery };

export type AccrualPlan = {
  increments: MetricIncrement[];
  /** Whole micros to debit from the wallet per UTC day. */
  charges: { date: Date; amountMicros: bigint }[];
};

/**
 * Simulated delivery of all campaigns of an account since their last accrual. Each campaign is
 * capped by what is left of its daily budget; together they are capped by the wallet balance,
 * shared proportionally day by day so that a depleted wallet stops every campaign at once.
 */
export function planAccrual({ now, balanceMicros, campaigns, spentMicros }: AccrualInput): AccrualPlan {
  const byDay = new Map<string, { campaign: CampaignSnapshot; slice: DaySlice }[]>();
  for (const campaign of campaigns) {
    const window = servingWindow(campaign, campaign.accruedAt, now);
    if (!window) continue;
    for (const slice of sliceByUtcDay(window.start, window.end)) {
      const key = isoDate(slice.date);
      byDay.set(key, [...(byDay.get(key) ?? []), { campaign, slice }]);
    }
  }

  const plan: AccrualPlan = { increments: [], charges: [] };
  let balance = balanceMicros;

  for (const key of [...byDay.keys()].sort()) {
    const dayIncrements: MetricIncrement[] = [];
    for (const { campaign, slice } of byDay.get(key)!) {
      const groups = servableAdGroups(campaign, slice.end);
      const slices = simulateDay(campaign, groups, slice.date).map(({ adGroupId, delivery }) => ({
        campaignId: campaign.id,
        adGroupId,
        date: slice.date,
        delivery: scaleDelivery(delivery, slice.fraction),
      }));
      const cost = sumCost(slices);
      const budgetLeft = Math.max(0, Number(campaign.budgetMicros) - spentMicros(campaign.id, key));
      const factor = cost > budgetLeft ? budgetLeft / cost : 1;
      dayIncrements.push(...slices.map((inc) => ({ ...inc, delivery: scaleDelivery(inc.delivery, factor) })));
    }

    const dayCost = sumCost(dayIncrements);
    const available = Number(balance > 0n ? balance : 0n);
    const factor = dayCost > available ? available / dayCost : 1;
    const increments = dayIncrements
      .map((inc) => ({ ...inc, delivery: scaleDelivery(inc.delivery, factor) }))
      .filter((inc) => inc.delivery.impressions > 0 || inc.delivery.costMicros > 0);

    const charge = BigInt(Math.min(Math.round(dayCost * factor), available));
    plan.increments.push(...increments);
    if (charge > 0n) plan.charges.push({ date: increments[0]?.date ?? new Date(key), amountMicros: charge });
    balance -= charge;
  }

  return plan;
}

function sumCost(increments: MetricIncrement[]): number {
  return increments.reduce((sum, inc) => sum + inc.delivery.costMicros, 0);
}
