import type { Prisma } from "../../generated/prisma/client.js";
import type { Clock } from "../../domain/clock.js";
import { isoDate, startOfUtcDay } from "../../lib/dates.js";
import { reviewAd } from "../policy/ad-policy.js";
import { planAccrual } from "./accrual-planner.js";
import type { CampaignSnapshot } from "./campaign-snapshot.js";

export type Tx = Prisma.TransactionClient;

export const campaignTreeInclude = {
  budget: true,
  criteria: true,
  adGroups: { include: { criteria: true, ads: true } },
} satisfies Prisma.CampaignInclude;

export type CampaignTree = Prisma.CampaignGetPayload<{ include: typeof campaignTreeInclude }>;

export function toSnapshot(campaign: CampaignTree, tracksConversions: boolean): CampaignSnapshot {
  return {
    id: campaign.id,
    status: campaign.status,
    channel: campaign.advertisingChannelType,
    // Maximize conversions with a target CPA behaves like target CPA bidding.
    biddingStrategy:
      campaign.biddingStrategyType === "MAXIMIZE_CONVERSIONS" && campaign.targetCpaMicros ? "TARGET_CPA" : campaign.biddingStrategyType,
    budgetMicros: campaign.budget.amountMicros,
    targetCpaMicros: campaign.targetCpaMicros,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    locations: campaign.criteria.filter((c) => !c.negative).map((c) => c.geoTargetConstant),
    accruedAt: campaign.accruedAt,
    tracksConversions,
    adGroups: campaign.adGroups.map((group) => ({
      id: group.id,
      status: group.status,
      cpcBidMicros: group.cpcBidMicros,
      keywords: group.criteria.map((c) => ({
        id: c.id,
        text: c.keywordText,
        matchType: c.matchType,
        negative: c.negative,
        status: c.status,
        cpcBidMicros: c.cpcBidMicros,
      })),
      ads: group.ads.map((ad) => ({
        id: ad.id,
        headlines: ad.headlines,
        status: ad.status,
        approvalStatus: ad.approvalStatus,
        reviewedAt: ad.reviewedAt,
      })),
    })),
  };
}

/**
 * Brings an account up to date: settles bank transfers, finishes due ad reviews and accrues
 * simulated delivery. Runs inside the caller's transaction and holds the account row lock, so
 * every mutation sees — and changes — a consistent state.
 */
export class AccountSync {
  constructor(
    private readonly clock: Clock,
    private readonly adReviewDelayMs: number,
    private readonly deliverySpeed = 1,
  ) {}

  async lock(tx: Tx, customerId: string): Promise<boolean> {
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM customers WHERE id = ${customerId} FOR UPDATE`;
    return rows.length > 0;
  }

  /** Locks the account and syncs it. Returns false if the account does not exist. */
  async sync(tx: Tx, customerId: string): Promise<boolean> {
    if (!(await this.lock(tx, customerId))) return false;
    const now = this.clock.now();
    await this.settlePayments(tx, customerId, now);
    await this.finishReviews(tx, customerId, now);
    await this.accrue(tx, customerId, now);
    return true;
  }

  private async settlePayments(tx: Tx, customerId: string, now: Date) {
    const due = await tx.payment.findMany({ where: { customerId, status: "PENDING", settlesAt: { lte: now } } });
    for (const payment of due) {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED", settledAt: payment.settlesAt } });
      await tx.customer.update({ where: { id: customerId }, data: { balanceMicros: { increment: payment.amountMicros } } });
    }
  }

  /** Ads under review get their policy decision once the review delay has passed. */
  private async finishReviews(tx: Tx, customerId: string, now: Date) {
    const due = await tx.adGroupAd.findMany({
      where: {
        reviewStatus: "REVIEW_IN_PROGRESS",
        submittedAt: { lte: new Date(now.getTime() - this.adReviewDelayMs) },
        adGroup: { campaign: { customerId } },
      },
    });
    for (const ad of due) {
      const decision = reviewAd(ad);
      await tx.adGroupAd.update({
        where: { id: ad.id },
        data: {
          reviewStatus: "REVIEWED",
          approvalStatus: decision.approvalStatus,
          policyTopics: decision.policyTopics,
          reviewedAt: new Date(ad.submittedAt.getTime() + this.adReviewDelayMs),
        },
      });
    }
  }

  private async accrue(tx: Tx, customerId: string, now: Date) {
    const [customer, campaigns, tracked] = await Promise.all([
      tx.customer.findUniqueOrThrow({ where: { id: customerId } }),
      tx.campaign.findMany({ where: { customerId, status: "ENABLED" }, include: campaignTreeInclude }),
      tx.conversionAction.count({ where: { customerId, status: "ENABLED" } }),
    ]);

    if (campaigns.length) {
      const since = startOfUtcDay(new Date(Math.min(...campaigns.map((c) => c.accruedAt.getTime()))));
      const spent = await tx.adGroupMetric.groupBy({
        by: ["campaignId", "date"],
        where: { customerId, date: { gte: since } },
        _sum: { costMicros: true },
      });
      const spentByKey = new Map(spent.map((row) => [`${row.campaignId}:${isoDate(row.date)}`, row._sum.costMicros ?? 0]));

      const plan = planAccrual({
        now,
        balanceMicros: customer.balanceMicros,
        campaigns: campaigns.map((campaign) => toSnapshot(campaign, tracked > 0)),
        spentMicros: (campaignId, date) => spentByKey.get(`${campaignId}:${date}`) ?? 0,
        speed: this.deliverySpeed,
      });

      for (const { campaignId, adGroupId, date, delivery } of plan.increments) {
        await tx.adGroupMetric.upsert({
          where: { adGroupId_date: { adGroupId, date } },
          create: { customerId, campaignId, adGroupId, date, ...delivery },
          update: {
            impressions: { increment: delivery.impressions },
            clicks: { increment: delivery.clicks },
            costMicros: { increment: delivery.costMicros },
            conversions: { increment: delivery.conversions },
            conversionsValueMicros: { increment: delivery.conversionsValueMicros },
          },
        });
      }
      for (const { date, amountMicros } of plan.charges) {
        await chargeWallet(tx, customerId, date, amountMicros);
      }
    }

    await tx.campaign.updateMany({ where: { customerId, status: { not: "REMOVED" } }, data: { accruedAt: now } });
  }
}

/** Debits ad spend from the wallet and records it on the day's charge. */
export async function chargeWallet(tx: Tx, customerId: string, date: Date, amountMicros: bigint) {
  if (amountMicros <= 0n) return;
  await tx.dailyCharge.upsert({
    where: { customerId_date: { customerId, date } },
    create: { customerId, date, amountMicros },
    update: { amountMicros: { increment: amountMicros } },
  });
  await tx.customer.update({ where: { id: customerId }, data: { balanceMicros: { decrement: amountMicros } } });
}
