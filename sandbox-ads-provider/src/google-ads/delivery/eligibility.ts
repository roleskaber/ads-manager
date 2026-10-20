import { addDays, maxDate, minDate } from "../../lib/dates.js";
import { activeKeywords, isServableAd, type AdGroupSnapshot, type CampaignSnapshot } from "./campaign-snapshot.js";

/** Mirrors Google Ads campaign primary status reasons. */
export type PrimaryStatusReason =
  | "CAMPAIGN_PAUSED"
  | "CAMPAIGN_REMOVED"
  | "CAMPAIGN_PENDING"
  | "CAMPAIGN_ENDED"
  | "AD_GROUPS_PAUSED"
  | "HAS_ADS_PENDING_REVIEW"
  | "HAS_ADS_DISAPPROVED"
  | "NO_ADS"
  | "NO_KEYWORDS"
  | "BUDGET_CONSTRAINED"
  | "ACCOUNT_BALANCE_DEPLETED";

export type PrimaryStatus = "ELIGIBLE" | "PAUSED" | "REMOVED" | "ENDED" | "PENDING" | "NOT_ELIGIBLE" | "LIMITED";

export type CampaignHealth = { primaryStatus: PrimaryStatus; reasons: PrimaryStatusReason[] };

/**
 * Moment an ad group became able to serve: it is enabled, has an enabled approved ad and, on
 * search, an active keyword. Null if it cannot serve.
 */
export function adGroupServableSince(group: AdGroupSnapshot, channel: CampaignSnapshot["channel"]): Date | null {
  if (group.status !== "ENABLED") return null;
  if (channel === "SEARCH" && activeKeywords(group).length === 0) return null;
  const approvals = group.ads.filter((ad) => isServableAd(ad) && ad.reviewedAt).map((ad) => ad.reviewedAt as Date);
  return approvals.length ? minDate(...approvals) : null;
}

export function servableAdGroups(campaign: CampaignSnapshot, at: Date): AdGroupSnapshot[] {
  return campaign.adGroups.filter((group) => {
    const since = adGroupServableSince(group, campaign.channel);
    return since !== null && since <= at;
  });
}

/**
 * Part of [from, to) during which the campaign could serve. Status and the ad group tree only
 * change through the API, which accrues delivery first, so they are constant within one accrual
 * window. What changes with time is the flight dates and ads finishing review — both only move
 * the campaign towards serving, so the result is a single interval.
 */
export function servingWindow(campaign: CampaignSnapshot, from: Date, to: Date): { start: Date; end: Date } | null {
  if (campaign.status !== "ENABLED") return null;

  const servableSince = campaign.adGroups
    .map((group) => adGroupServableSince(group, campaign.channel))
    .filter((since): since is Date => since !== null);
  if (!servableSince.length) return null;

  const start = maxDate(from, campaign.startDate, minDate(...servableSince));
  const end = campaign.endDate ? minDate(to, addDays(campaign.endDate, 1)) : to;
  return start < end ? { start, end } : null;
}

/** Campaign primary status at `at`, given today's spend and the wallet balance. */
export function campaignHealth(
  campaign: CampaignSnapshot,
  at: Date,
  { spentTodayMicros, balanceMicros }: { spentTodayMicros: number; balanceMicros: bigint },
): CampaignHealth {
  if (campaign.status === "REMOVED") return { primaryStatus: "REMOVED", reasons: ["CAMPAIGN_REMOVED"] };
  if (campaign.status === "PAUSED") return { primaryStatus: "PAUSED", reasons: ["CAMPAIGN_PAUSED"] };
  if (campaign.endDate && at >= addDays(campaign.endDate, 1)) return { primaryStatus: "ENDED", reasons: ["CAMPAIGN_ENDED"] };

  const blockers = new Set<PrimaryStatusReason>();
  const activeGroups = campaign.adGroups.filter((group) => group.status === "ENABLED");
  if (!activeGroups.length) blockers.add("AD_GROUPS_PAUSED");
  else if (!servableAdGroups(campaign, at).length) {
    // Every active group is blocked by something; report the union of what blocks them.
    for (const group of activeGroups) {
      if (campaign.channel === "SEARCH" && activeKeywords(group).length === 0) blockers.add("NO_KEYWORDS");
      const ads = group.ads.filter((ad) => ad.status === "ENABLED");
      if (ads.some(isServableAd)) continue;
      if (!ads.length) blockers.add("NO_ADS");
      else if (ads.some((ad) => ad.approvalStatus === "UNKNOWN")) blockers.add("HAS_ADS_PENDING_REVIEW");
      else blockers.add("HAS_ADS_DISAPPROVED");
    }
  }
  if (balanceMicros <= 0n) blockers.add("ACCOUNT_BALANCE_DEPLETED");
  if (blockers.size) return { primaryStatus: "NOT_ELIGIBLE", reasons: [...blockers] };

  if (at < campaign.startDate) return { primaryStatus: "PENDING", reasons: ["CAMPAIGN_PENDING"] };
  if (spentTodayMicros >= Number(campaign.budgetMicros)) return { primaryStatus: "LIMITED", reasons: ["BUDGET_CONSTRAINED"] };
  return { primaryStatus: "ELIGIBLE", reasons: [] };
}

/** Google Ads campaign.serving_status derived from the primary status. */
export function servingStatusOf(health: CampaignHealth): "SERVING" | "NONE" | "ENDED" | "PENDING" | "SUSPENDED" {
  switch (health.primaryStatus) {
    case "ELIGIBLE":
    case "LIMITED":
      return "SERVING";
    case "ENDED":
      return "ENDED";
    case "PENDING":
      return "PENDING";
    case "NOT_ELIGIBLE":
      return health.reasons.includes("ACCOUNT_BALANCE_DEPLETED") ? "SUSPENDED" : "NONE";
    default:
      return "NONE";
  }
}
