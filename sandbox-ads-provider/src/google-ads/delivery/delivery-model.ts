import { isoDate } from "../../lib/dates.js";
import { createRng, jitter, type Rng } from "../../lib/prng.js";
import { audienceOf } from "../../domain/geo-targets.js";
import { toMicros } from "../../domain/money.js";
import type { AdvertisingChannelType, KeywordMatchType } from "../../generated/prisma/enums.js";
import { activeKeywords, isServableAd, type AdGroupSnapshot, type CampaignSnapshot } from "./campaign-snapshot.js";

/** Unrounded delivery totals; money in micros. */
export type Delivery = {
  impressions: number;
  clicks: number;
  costMicros: number;
  conversions: number;
  conversionsValueMicros: number;
};

export const EMPTY_DELIVERY: Delivery = Object.freeze({
  impressions: 0,
  clicks: 0,
  costMicros: 0,
  conversions: 0,
  conversionsValueMicros: 0,
});

export type AdGroupDelivery = { adGroupId: bigint; delivery: Delivery };

type ChannelProfile = {
  /** Daily impressions available to one ad group in the US; search derives demand from keywords. */
  baseImpressions: number;
  ctr: number;
  marketCpc: number;
  conversionRate: number;
};

const CHANNELS: Record<AdvertisingChannelType, ChannelProfile> = {
  SEARCH: { baseImpressions: 0, ctr: 0.045, marketCpc: 1.2, conversionRate: 0.04 },
  DISPLAY: { baseImpressions: 40_000, ctr: 0.006, marketCpc: 0.45, conversionRate: 0.008 },
  SHOPPING: { baseImpressions: 6_000, ctr: 0.015, marketCpc: 0.7, conversionRate: 0.025 },
  VIDEO: { baseImpressions: 25_000, ctr: 0.008, marketCpc: 0.12, conversionRate: 0.004 },
};

/** Daily US searches a keyword matches; broader match types catch more queries. */
const KEYWORD_VOLUME: Record<KeywordMatchType, number> = { EXACT: 250, PHRASE: 700, BROAD: 1800 };

export function marketCpcMicros(channel: AdvertisingChannelType): number {
  return toMicros(CHANNELS[channel].marketCpc);
}

/** Stable popularity of a search term in [0.3, 1.7]. */
export function keywordPopularity(text: string): number {
  return 0.3 + createRng(`keyword:${text.toLowerCase()}`)() * 1.4;
}

/**
 * Full-day delivery of a campaign serving all day with the given ad groups, split per ad group.
 * Deterministic: noise is seeded by campaign and date, so every slice of a day sees the same rates.
 */
export function simulateDay(campaign: CampaignSnapshot, groups: AdGroupSnapshot[], date: Date): AdGroupDelivery[] {
  if (!groups.length) return [];

  const profile = CHANNELS[campaign.channel];
  const day = createRng(`${campaign.id}:${isoDate(date)}`);
  const stable = createRng(String(campaign.id));

  const weekday = date.getUTCDay();
  const weekdayFactor = weekday === 0 || weekday === 6 ? 0.8 : 1;
  const reach = audienceOf(campaign.locations) * weekdayFactor * restrictedReach(groups);
  const weights = groups.map((group) => groupDemand(campaign.channel, group, profile));
  const demand = weights.reduce((sum, weight) => sum + weight, 0) * reach;

  const auction = runAuction(campaign, groups, profile, day);
  const impressions = demand * auction.impressionShare * jitter(day, 0.15);
  const clicks = impressions * profile.ctr * adQuality(groups) * jitter(day, 0.2);
  const conversions = campaign.tracksConversions ? clicks * auction.conversionRate * jitter(day, 0.3) : 0;
  const averageOrderValue = toMicros(40 + stable() * 120);

  const total = capToBudget(
    {
      impressions,
      clicks,
      costMicros: clicks * auction.cpcMicros,
      conversions,
      conversionsValueMicros: conversions * averageOrderValue * jitter(day, 0.2),
    },
    Number(campaign.budgetMicros),
  );

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  return groups.map((group, i) => ({
    adGroupId: group.id,
    delivery: scaleDelivery(total, totalWeight > 0 ? weights[i]! / totalWeight : 1 / groups.length),
  }));
}

function groupDemand(channel: AdvertisingChannelType, group: AdGroupSnapshot, profile: ChannelProfile): number {
  if (channel !== "SEARCH") return profile.baseImpressions;
  return activeKeywords(group).reduce(
    (sum, keyword) => sum + KEYWORD_VOLUME[keyword.matchType] * keywordPopularity(keyword.text),
    0,
  );
}

/** Ads approved with limitations (restricted topics) only reach part of the audience. */
function restrictedReach(groups: AdGroupSnapshot[]): number {
  const ads = groups.flatMap((group) => group.ads.filter(isServableAd));
  return ads.some((ad) => ad.approvalStatus === "APPROVED") ? 1 : 0.5;
}

/** More headline variants let the network find better combinations: 3 → 0.85, 15 → 1.10. */
export function adQuality(groups: AdGroupSnapshot[]): number {
  const ads = groups.flatMap((group) => group.ads.filter(isServableAd));
  if (!ads.length) return 0;
  const headlines = ads.reduce((sum, ad) => sum + Math.min(ad.headlines.length, 15), 0) / ads.length;
  return 0.85 + (0.25 * (Math.max(headlines, 3) - 3)) / 12;
}

type Auction = { impressionShare: number; cpcMicros: number; conversionRate: number };

function runAuction(campaign: CampaignSnapshot, groups: AdGroupSnapshot[], profile: ChannelProfile, day: Rng): Auction {
  const marketCpc = toMicros(profile.marketCpc) * jitter(day, 0.1);
  const conversionRate = profile.conversionRate;

  switch (campaign.biddingStrategy) {
    case "MANUAL_CPC": {
      // Bidding below the market loses auctions; winners pay less than their max bid.
      const maxBid = groups.reduce((sum, group) => sum + Number(group.cpcBidMicros), 0) / groups.length;
      const impressionShare = clamp((maxBid / marketCpc) ** 0.8, 0.05, 1);
      return { impressionShare, cpcMicros: Math.min(maxBid, marketCpc * (0.6 + 0.3 * impressionShare)), conversionRate };
    }
    case "MAXIMIZE_CLICKS":
      return { impressionShare: 0.9, cpcMicros: marketCpc * 0.85, conversionRate };
    case "MAXIMIZE_CONVERSIONS":
      return { impressionShare: 0.85, cpcMicros: marketCpc * 1.1, conversionRate: conversionRate * 1.25 };
    case "TARGET_CPA": {
      // Bids so that cost per conversion lands near the target; a tight target wins few auctions.
      const boosted = conversionRate * 1.15;
      const cpcMicros = Math.min(marketCpc * 1.1, Number(campaign.targetCpaMicros ?? 0) * boosted);
      return { impressionShare: clamp((cpcMicros / marketCpc) ** 2, 0.02, 0.9), cpcMicros, conversionRate: boosted };
    }
  }
}

/** Standard delivery: when demand exceeds the budget, the network spreads the budget over the day. */
function capToBudget(delivery: Delivery, budgetMicros: number): Delivery {
  return delivery.costMicros > budgetMicros ? scaleDelivery(delivery, budgetMicros / delivery.costMicros) : delivery;
}

export function scaleDelivery(delivery: Delivery, factor: number): Delivery {
  return {
    impressions: delivery.impressions * factor,
    clicks: delivery.clicks * factor,
    costMicros: delivery.costMicros * factor,
    conversions: delivery.conversions * factor,
    conversionsValueMicros: delivery.conversionsValueMicros * factor,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
