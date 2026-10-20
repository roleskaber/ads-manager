import type {
  AdvertisingChannelType,
  BiddingStrategyType,
  EntityStatus,
  KeywordMatchType,
  PolicyApprovalStatus,
} from "../../generated/prisma/enums.js";

/** Everything the simulation needs to know about a campaign, independent of storage. */
export type CampaignSnapshot = {
  id: bigint;
  status: EntityStatus;
  channel: AdvertisingChannelType;
  biddingStrategy: BiddingStrategyType;
  budgetMicros: bigint;
  targetCpaMicros: bigint | null;
  startDate: Date;
  /** Inclusive, like in Google Ads. */
  endDate: Date | null;
  /** Positive location criteria; empty means all countries. */
  locations: string[];
  accruedAt: Date;
  /** Simulated conversions only exist when the account tracks conversions. */
  tracksConversions: boolean;
  adGroups: AdGroupSnapshot[];
};

export type AdGroupSnapshot = {
  id: bigint;
  status: EntityStatus;
  cpcBidMicros: bigint;
  keywords: KeywordSnapshot[];
  ads: AdSnapshot[];
};

export type KeywordSnapshot = {
  id: bigint;
  text: string;
  matchType: KeywordMatchType;
  negative: boolean;
  status: EntityStatus;
  cpcBidMicros: bigint | null;
};

export type AdSnapshot = {
  id: bigint;
  headlines: string[];
  status: EntityStatus;
  approvalStatus: PolicyApprovalStatus;
  reviewedAt: Date | null;
};

export function isServableAd(ad: AdSnapshot): boolean {
  return ad.status === "ENABLED" && (ad.approvalStatus === "APPROVED" || ad.approvalStatus === "APPROVED_LIMITED");
}

export function activeKeywords(group: AdGroupSnapshot): KeywordSnapshot[] {
  return group.keywords.filter((keyword) => keyword.status === "ENABLED" && !keyword.negative);
}
