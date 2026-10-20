import { createRng } from "../../lib/prng.js";
import { MICROS_PER_UNIT } from "../../domain/money.js";
import { activeKeywords, isServableAd, type AdGroupSnapshot, type CampaignSnapshot } from "../delivery/campaign-snapshot.js";
import { marketCpcMicros } from "../delivery/delivery-model.js";
import { keywordMatches } from "../resources/keyword-rules.js";

export type AuctionEntrant = { customerId: string; campaign: CampaignSnapshot };

export type AdCreative = { id: bigint; headlines: string[]; descriptions: string[]; finalUrl: string; path1: string | null; path2: string | null };

export type AuctionWinner = {
  customerId: string;
  campaignId: bigint;
  adGroupId: bigint;
  criterionId: bigint;
  adId: bigint;
  position: number;
  qualityScore: number;
  cpcMicros: number;
};

type Bid = Omit<AuctionWinner, "position" | "cpcMicros"> & { maxCpcMicros: number; adRank: number };

const MAX_TOP_ADS = 4;
const MIN_INCREMENT_MICROS = 10_000;
const RESERVE_FRACTION = 0.3;

/**
 * Second-price auction for one search query, like Google Ads: ad rank = max CPC × quality score,
 * one ad per account, and each winner pays just enough to beat the next ad rank.
 */
export function runSearchAuction(query: string, entrants: AuctionEntrant[], creatives: Map<bigint, AdCreative>): AuctionWinner[] {
  const bestPerAccount = new Map<string, Bid>();

  for (const { customerId, campaign } of entrants) {
    for (const group of campaign.adGroups) {
      const bid = bidFor(query, customerId, campaign, group, creatives);
      const current = bestPerAccount.get(customerId);
      if (bid && (!current || bid.adRank > current.adRank)) bestPerAccount.set(customerId, bid);
    }
  }

  const ranked = [...bestPerAccount.values()].sort((a, b) => b.adRank - a.adRank).slice(0, MAX_TOP_ADS);
  return ranked.map((bid, i) => {
    const next = ranked[i + 1];
    const reserve = marketCpcMicros("SEARCH") * RESERVE_FRACTION;
    const price = next ? next.adRank / bid.qualityScore + MIN_INCREMENT_MICROS : reserve;
    const { adRank: _, maxCpcMicros, ...winner } = bid;
    return { ...winner, position: i + 1, cpcMicros: Math.round(Math.min(maxCpcMicros, price)) };
  });
}

function bidFor(
  query: string,
  customerId: string,
  campaign: CampaignSnapshot,
  group: AdGroupSnapshot,
  creatives: Map<bigint, AdCreative>,
): Bid | null {
  const blocked = group.keywords.some((k) => k.negative && k.status === "ENABLED" && keywordMatches(query, k.text, k.matchType));
  if (blocked) return null;

  const keyword = activeKeywords(group).find((k) => keywordMatches(query, k.text, k.matchType));
  const ad = group.ads.find((candidate) => isServableAd(candidate) && creatives.has(candidate.id));
  if (!keyword || !ad) return null;

  const creative = creatives.get(ad.id)!;
  const qualityScore = qualityScoreOf(keyword.text, creative);
  const maxCpcMicros = maxCpc(campaign, Number(keyword.cpcBidMicros ?? group.cpcBidMicros));
  if (maxCpcMicros <= 0) return null;

  return {
    customerId,
    campaignId: campaign.id,
    adGroupId: group.id,
    criterionId: keyword.id,
    adId: ad.id,
    qualityScore,
    maxCpcMicros,
    adRank: maxCpcMicros * qualityScore,
  };
}

/** Automated strategies bid on the advertiser's behalf; manual CPC uses the keyword/ad group bid. */
function maxCpc(campaign: CampaignSnapshot, manualBidMicros: number): number {
  const market = marketCpcMicros("SEARCH");
  switch (campaign.biddingStrategy) {
    case "MANUAL_CPC":
      return manualBidMicros;
    case "MAXIMIZE_CLICKS":
      return market;
    case "MAXIMIZE_CONVERSIONS":
      return market * 1.2;
    case "TARGET_CPA":
      return Math.min(market * 1.5, Number(campaign.targetCpaMicros ?? 0) * 0.046);
  }
}

/**
 * 1–10 like Google's quality score: a stable base per keyword, plus ad relevance (the keyword
 * appears in a headline) and more headline variants.
 */
export function qualityScoreOf(keyword: string, creative: AdCreative): number {
  const base = 3 + Math.floor(createRng(`qs:${keyword}`)() * 4);
  const relevant = creative.headlines.some((headline) => headline.toLowerCase().includes(keyword.toLowerCase())) ? 2 : 0;
  const variety = creative.headlines.length >= 8 ? 1 : 0;
  return Math.min(10, base + relevant + variety);
}

export function formatMoney(micros: number, currencyCode: string): string {
  return `${(micros / MICROS_PER_UNIT).toFixed(2)} ${currencyCode}`;
}
