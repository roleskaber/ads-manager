import { createHash } from "node:crypto";
import type { Db } from "../../db.js";
import type { Clock } from "../../domain/clock.js";
import { countryCodeOf } from "../../domain/geo-targets.js";
import { newGclid } from "../../lib/ids.js";
import { startOfUtcDay } from "../../lib/dates.js";
import { signToken, verifyToken } from "../../lib/signed-token.js";
import { campaignTreeInclude, chargeWallet, toSnapshot, type AccountSync, type CampaignTree, type Tx } from "../delivery/account-sync.js";
import { campaignHealth } from "../delivery/eligibility.js";
import { runSearchAuction, type AdCreative, type AuctionEntrant, type AuctionWinner } from "./ad-auction.js";

const CLICK_TOKEN_TTL_MS = 30 * 60_000;
const DUPLICATE_CLICK_WINDOW_MS = 60_000;

type ClickToken = Omit<AuctionWinner, "campaignId" | "adGroupId" | "criterionId" | "adId" | "qualityScore" | "position"> & {
  campaignId: string;
  adGroupId: string;
  criterionId: string;
  adId: string;
  query: string;
  issuedAt: number;
};

export type SearchResultAd = { creative: AdCreative; position: number; clickToken: string };

export function visitorHash(ip: string, userAgent: string): string {
  return createHash("sha256").update(`${ip}|${userAgent}`).digest("hex").slice(0, 32);
}

/** Sandbox search results page: runs the ad auction, logs impressions and charges real clicks. */
export class SerpService {
  constructor(
    private readonly db: Db,
    private readonly sync: AccountSync,
    private readonly clock: Clock,
    private readonly secret: string,
  ) {}

  async search(query: string, countryCode: string | undefined): Promise<SearchResultAd[]> {
    if (!query.trim()) return [];
    const now = this.clock.now();
    const today = startOfUtcDay(now);

    const campaigns = await this.db.campaign.findMany({
      where: { status: "ENABLED", advertisingChannelType: "SEARCH", customer: { balanceMicros: { gt: 0 } } },
      include: { ...campaignTreeInclude, customer: true },
    });
    const spent = await this.spentToday(this.db, campaigns.map((c) => c.id), today);

    const entrants: AuctionEntrant[] = [];
    const creatives = new Map<bigint, AdCreative>();
    for (const campaign of campaigns) {
      if (!targets(campaign, countryCode)) continue;
      const snapshot = toSnapshot(campaign, false);
      const health = campaignHealth(snapshot, now, { spentTodayMicros: spent.get(campaign.id) ?? 0, balanceMicros: campaign.customer.balanceMicros });
      if (health.primaryStatus !== "ELIGIBLE") continue;
      entrants.push({ customerId: campaign.customerId, campaign: snapshot });
      for (const ad of campaign.adGroups.flatMap((group) => group.ads)) creatives.set(ad.id, creativeOf(ad));
    }

    const winners = runSearchAuction(query, entrants, creatives);
    await Promise.all(winners.map((winner) => this.logImpression(winner, today)));

    return winners.map((winner) => ({
      creative: creatives.get(winner.adId)!,
      position: winner.position,
      clickToken: signToken(
        {
          customerId: winner.customerId,
          campaignId: String(winner.campaignId),
          adGroupId: String(winner.adGroupId),
          criterionId: String(winner.criterionId),
          adId: String(winner.adId),
          cpcMicros: winner.cpcMicros,
          query,
          issuedAt: now.getTime(),
        } satisfies ClickToken,
        this.secret,
      ),
    }));
  }

  /**
   * Resolves an ad click to the landing URL. A valid click is charged and gets a gclid; a repeat
   * click by the same visitor within a minute is recorded as invalid and not charged.
   */
  async click(token: string, visitor: string): Promise<string | null> {
    const payload = verifyToken<ClickToken>(token, this.secret);
    const now = this.clock.now();
    if (!payload || now.getTime() - payload.issuedAt > CLICK_TOKEN_TTL_MS) return null;

    return this.db.$transaction(async (tx) => {
      if (!(await this.sync.sync(tx, payload.customerId))) return null;
      const ad = await tx.adGroupAd.findUnique({ where: { id: BigInt(payload.adId) } });
      const landing = ad?.finalUrls[0];
      if (!ad || !landing) return null;

      const campaign = await tx.campaign.findUnique({ where: { id: BigInt(payload.campaignId) }, include: { ...campaignTreeInclude, customer: true } });
      if (!campaign) return landing;
      const today = startOfUtcDay(now);
      const spentToday = (await this.spentToday(tx, [campaign.id], today)).get(campaign.id) ?? 0;
      const health = campaignHealth(toSnapshot(campaign, false), now, { spentTodayMicros: spentToday, balanceMicros: campaign.customer.balanceMicros });
      // The campaign ran out of budget or money after the page was shown: the visitor still lands, free.
      if (health.primaryStatus !== "ELIGIBLE") return landing;

      const duplicate = await tx.click.count({
        where: { adId: ad.id, visitorHash: visitor, invalid: false, clickedAt: { gte: new Date(now.getTime() - DUPLICATE_CLICK_WINDOW_MS) } },
      });
      const invalid = duplicate > 0;
      const budgetLeft = Number(campaign.budget.amountMicros) - spentToday;
      const cost = invalid ? 0n : BigInt(Math.max(0, Math.min(payload.cpcMicros, budgetLeft, Number(campaign.customer.balanceMicros))));

      const gclid = newGclid();
      await tx.click.create({
        data: {
          gclid,
          customerId: payload.customerId,
          campaignId: campaign.id,
          adGroupId: BigInt(payload.adGroupId),
          adId: ad.id,
          criterionId: BigInt(payload.criterionId),
          query: payload.query,
          costMicros: cost,
          invalid,
          visitorHash: visitor,
          clickedAt: now,
        },
      });
      if (!invalid) {
        await tx.adGroupMetric.upsert({
          where: { adGroupId_date: { adGroupId: BigInt(payload.adGroupId), date: today } },
          create: { customerId: payload.customerId, campaignId: campaign.id, adGroupId: BigInt(payload.adGroupId), date: today, clicks: 1, costMicros: Number(cost) },
          update: { clicks: { increment: 1 }, costMicros: { increment: Number(cost) } },
        });
        await chargeWallet(tx, payload.customerId, today, cost);
      }

      const url = new URL(landing);
      url.searchParams.set("gclid", gclid);
      return url.toString();
    });
  }

  private async logImpression(winner: AuctionWinner, date: Date) {
    await this.db.adGroupMetric.upsert({
      where: { adGroupId_date: { adGroupId: winner.adGroupId, date } },
      create: { customerId: winner.customerId, campaignId: winner.campaignId, adGroupId: winner.adGroupId, date, impressions: 1 },
      update: { impressions: { increment: 1 } },
    });
  }

  private async spentToday(db: Db | Tx, campaignIds: bigint[], date: Date): Promise<Map<bigint, number>> {
    if (!campaignIds.length) return new Map();
    const rows = await db.adGroupMetric.groupBy({ by: ["campaignId"], where: { campaignId: { in: campaignIds }, date }, _sum: { costMicros: true } });
    return new Map(rows.map((row) => [row.campaignId, row._sum.costMicros ?? 0]));
  }
}

/** Location targeting: no positive locations means everywhere; negative locations exclude. */
function targets(campaign: CampaignTree, countryCode: string | undefined): boolean {
  if (!countryCode) return true;
  const code = countryCode.toUpperCase();
  const of = (negative: boolean) => campaign.criteria.filter((c) => c.negative === negative).map((c) => countryCodeOf(c.geoTargetConstant));
  if (of(true).includes(code)) return false;
  const positive = of(false);
  return !positive.length || positive.includes(code);
}

function creativeOf(ad: CampaignTree["adGroups"][number]["ads"][number]): AdCreative {
  return { id: ad.id, headlines: ad.headlines, descriptions: ad.descriptions, finalUrl: ad.finalUrls[0] ?? "", path1: ad.path1, path2: ad.path2 };
}
