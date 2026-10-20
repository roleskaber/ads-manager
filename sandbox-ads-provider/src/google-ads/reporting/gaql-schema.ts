import type {
  AdGroup,
  AdGroupAd,
  AdGroupCriterion,
  CampaignBudget,
  Click,
  ConversionAction,
  Customer,
} from "../../generated/prisma/client.js";
import { MICROS_PER_UNIT } from "../../domain/money.js";
import { isoDate } from "../../lib/dates.js";
import type { CampaignTree } from "../delivery/account-sync.js";
import { servingStatusOf, type CampaignHealth } from "../delivery/eligibility.js";
import { resourceName } from "../resource-names.js";
import { tagSnippets } from "./tag-snippets.js";

/** Unrounded delivery sums joined onto a row. */
export type MetricSums = {
  impressions: number;
  clicks: number;
  costMicros: number;
  conversions: number;
  conversionsValueMicros: number;
};

/** Everything a result row may expose; which parts are set depends on the FROM resource. */
export type RowContext = {
  publicUrl: string;
  customer: Customer;
  campaign?: CampaignTree;
  health?: CampaignHealth;
  budget?: CampaignBudget;
  location?: CampaignTree["criteria"][number];
  adGroup?: AdGroup;
  criterion?: AdGroupCriterion;
  ad?: AdGroupAd;
  conversionAction?: ConversionAction;
  click?: Click;
  metrics?: MetricSums;
  date?: string;
};

export type FieldType = "STRING" | "INT64" | "DOUBLE" | "ENUM" | "DATE" | "BOOLEAN" | "STRING_LIST" | "MESSAGE" | "RESOURCE_NAME";

export type FieldDef = { type: FieldType; get: (row: RowContext) => unknown };

/** Metric level: which ad group metric rows are summed for an entity. */
export type MetricsKey = "customer" | "campaign" | "ad_group" | "click";

export type ResourceDef = {
  /** Other resources whose fields may be selected alongside (implicit joins). */
  attributed: string[];
  metrics: MetricsKey | null;
  /** click_view only works for a single day. */
  requiresSingleDay?: boolean;
};

export const RESOURCES: Record<string, ResourceDef> = {
  customer: { attributed: [], metrics: "customer" },
  campaign_budget: { attributed: ["customer"], metrics: null },
  campaign: { attributed: ["customer", "campaign_budget"], metrics: "campaign" },
  campaign_criterion: { attributed: ["customer", "campaign"], metrics: null },
  ad_group: { attributed: ["customer", "campaign"], metrics: "ad_group" },
  ad_group_criterion: { attributed: ["customer", "campaign", "ad_group"], metrics: null },
  ad_group_ad: { attributed: ["customer", "campaign", "ad_group"], metrics: null },
  conversion_action: { attributed: ["customer"], metrics: null },
  click_view: { attributed: ["customer", "campaign", "ad_group"], metrics: "click", requiresSingleDay: true },
};

const need = <T>(value: T | undefined, what: string): T => {
  if (value === undefined) throw new Error(`Row has no ${what}`);
  return value;
};

const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);
const sums = (row: RowContext) => row.metrics ?? { impressions: 0, clicks: 0, costMicros: 0, conversions: 0, conversionsValueMicros: 0 };

/** Supported GAQL fields, keyed by their snake_case name. */
export const FIELDS: Record<string, FieldDef> = {
  "customer.resource_name": { type: "RESOURCE_NAME", get: (r) => resourceName.customer(r.customer.id) },
  "customer.id": { type: "INT64", get: (r) => BigInt(r.customer.id) },
  "customer.descriptive_name": { type: "STRING", get: (r) => r.customer.descriptiveName },
  "customer.currency_code": { type: "STRING", get: (r) => r.customer.currencyCode },
  "customer.time_zone": { type: "STRING", get: (r) => r.customer.timeZone },

  "campaign_budget.resource_name": { type: "RESOURCE_NAME", get: (r) => resourceName.campaignBudget(r.customer.id, budgetOf(r).id) },
  "campaign_budget.id": { type: "INT64", get: (r) => budgetOf(r).id },
  "campaign_budget.name": { type: "STRING", get: (r) => budgetOf(r).name },
  "campaign_budget.amount_micros": { type: "INT64", get: (r) => budgetOf(r).amountMicros },
  "campaign_budget.status": { type: "ENUM", get: (r) => budgetOf(r).status },
  "campaign_budget.delivery_method": { type: "ENUM", get: () => "STANDARD" },
  "campaign_budget.explicitly_shared": { type: "BOOLEAN", get: () => false },

  "campaign.resource_name": { type: "RESOURCE_NAME", get: (r) => resourceName.campaign(r.customer.id, campaignOf(r).id) },
  "campaign.id": { type: "INT64", get: (r) => campaignOf(r).id },
  "campaign.name": { type: "STRING", get: (r) => campaignOf(r).name },
  "campaign.status": { type: "ENUM", get: (r) => campaignOf(r).status },
  "campaign.advertising_channel_type": { type: "ENUM", get: (r) => campaignOf(r).advertisingChannelType },
  "campaign.bidding_strategy_type": { type: "ENUM", get: (r) => campaignOf(r).biddingStrategyType },
  "campaign.target_cpa.target_cpa_micros": { type: "INT64", get: (r) => campaignOf(r).targetCpaMicros },
  "campaign.maximize_conversions.target_cpa_micros": { type: "INT64", get: (r) => campaignOf(r).targetCpaMicros },
  "campaign.start_date": { type: "DATE", get: (r) => isoDate(campaignOf(r).startDate) },
  "campaign.end_date": { type: "DATE", get: (r) => (campaignOf(r).endDate ? isoDate(campaignOf(r).endDate!) : null) },
  "campaign.campaign_budget": { type: "RESOURCE_NAME", get: (r) => resourceName.campaignBudget(r.customer.id, campaignOf(r).campaignBudgetId) },
  "campaign.serving_status": { type: "ENUM", get: (r) => servingStatusOf(need(r.health, "health")) },
  "campaign.primary_status": { type: "ENUM", get: (r) => need(r.health, "health").primaryStatus },
  "campaign.primary_status_reasons": { type: "STRING_LIST", get: (r) => need(r.health, "health").reasons },

  "campaign_criterion.resource_name": {
    type: "RESOURCE_NAME",
    get: (r) => {
      const criterion = locationOf(r);
      return resourceName.campaignCriterion(r.customer.id, criterion.campaignId, criterion.id);
    },
  },
  "campaign_criterion.criterion_id": { type: "INT64", get: (r) => locationOf(r).id },
  "campaign_criterion.type": { type: "ENUM", get: () => "LOCATION" },
  "campaign_criterion.negative": { type: "BOOLEAN", get: (r) => locationOf(r).negative },
  "campaign_criterion.location.geo_target_constant": { type: "STRING", get: (r) => locationOf(r).geoTargetConstant },

  "ad_group.resource_name": { type: "RESOURCE_NAME", get: (r) => resourceName.adGroup(r.customer.id, adGroupOf(r).id) },
  "ad_group.id": { type: "INT64", get: (r) => adGroupOf(r).id },
  "ad_group.name": { type: "STRING", get: (r) => adGroupOf(r).name },
  "ad_group.status": { type: "ENUM", get: (r) => adGroupOf(r).status },
  "ad_group.cpc_bid_micros": { type: "INT64", get: (r) => adGroupOf(r).cpcBidMicros },
  "ad_group.campaign": { type: "RESOURCE_NAME", get: (r) => resourceName.campaign(r.customer.id, adGroupOf(r).campaignId) },

  "ad_group_criterion.resource_name": {
    type: "RESOURCE_NAME",
    get: (r) => resourceName.adGroupCriterion(r.customer.id, criterionOf(r).adGroupId, criterionOf(r).id),
  },
  "ad_group_criterion.criterion_id": { type: "INT64", get: (r) => criterionOf(r).id },
  "ad_group_criterion.type": { type: "ENUM", get: () => "KEYWORD" },
  "ad_group_criterion.status": { type: "ENUM", get: (r) => criterionOf(r).status },
  "ad_group_criterion.negative": { type: "BOOLEAN", get: (r) => criterionOf(r).negative },
  "ad_group_criterion.keyword.text": { type: "STRING", get: (r) => criterionOf(r).keywordText },
  "ad_group_criterion.keyword.match_type": { type: "ENUM", get: (r) => criterionOf(r).matchType },
  "ad_group_criterion.cpc_bid_micros": { type: "INT64", get: (r) => criterionOf(r).cpcBidMicros },
  "ad_group_criterion.effective_cpc_bid_micros": {
    type: "INT64",
    get: (r) => criterionOf(r).cpcBidMicros ?? need(r.adGroup, "ad group").cpcBidMicros,
  },
  "ad_group_criterion.ad_group": { type: "RESOURCE_NAME", get: (r) => resourceName.adGroup(r.customer.id, criterionOf(r).adGroupId) },

  "ad_group_ad.resource_name": { type: "RESOURCE_NAME", get: (r) => resourceName.adGroupAd(r.customer.id, adOf(r).adGroupId, adOf(r).id) },
  "ad_group_ad.status": { type: "ENUM", get: (r) => adOf(r).status },
  "ad_group_ad.ad_group": { type: "RESOURCE_NAME", get: (r) => resourceName.adGroup(r.customer.id, adOf(r).adGroupId) },
  "ad_group_ad.ad.resource_name": { type: "RESOURCE_NAME", get: (r) => resourceName.ad(r.customer.id, adOf(r).id) },
  "ad_group_ad.ad.id": { type: "INT64", get: (r) => adOf(r).id },
  "ad_group_ad.ad.type": { type: "ENUM", get: () => "RESPONSIVE_SEARCH_AD" },
  "ad_group_ad.ad.final_urls": { type: "STRING_LIST", get: (r) => adOf(r).finalUrls },
  "ad_group_ad.ad.responsive_search_ad.headlines": { type: "MESSAGE", get: (r) => adOf(r).headlines.map((text) => ({ text })) },
  "ad_group_ad.ad.responsive_search_ad.descriptions": { type: "MESSAGE", get: (r) => adOf(r).descriptions.map((text) => ({ text })) },
  "ad_group_ad.ad.responsive_search_ad.path1": { type: "STRING", get: (r) => adOf(r).path1 },
  "ad_group_ad.ad.responsive_search_ad.path2": { type: "STRING", get: (r) => adOf(r).path2 },
  "ad_group_ad.policy_summary.review_status": { type: "ENUM", get: (r) => adOf(r).reviewStatus },
  "ad_group_ad.policy_summary.approval_status": { type: "ENUM", get: (r) => adOf(r).approvalStatus },
  "ad_group_ad.policy_summary.policy_topic_entries": {
    type: "MESSAGE",
    get: (r) => adOf(r).policyTopics.map((topic) => ({ topic, type: topic === "ALCOHOL" || topic.startsWith("HEALTHCARE") ? "LIMITED" : "PROHIBITED" })),
  },

  "conversion_action.resource_name": { type: "RESOURCE_NAME", get: (r) => resourceName.conversionAction(r.customer.id, actionOf(r).id) },
  "conversion_action.id": { type: "INT64", get: (r) => actionOf(r).id },
  "conversion_action.name": { type: "STRING", get: (r) => actionOf(r).name },
  "conversion_action.status": { type: "ENUM", get: (r) => actionOf(r).status },
  "conversion_action.type": { type: "ENUM", get: (r) => actionOf(r).type },
  "conversion_action.category": { type: "ENUM", get: (r) => actionOf(r).category },
  "conversion_action.counting_type": { type: "ENUM", get: (r) => actionOf(r).countingType },
  "conversion_action.click_through_lookback_window_days": { type: "INT64", get: (r) => BigInt(actionOf(r).clickThroughLookbackWindowDays) },
  "conversion_action.value_settings.default_value": {
    type: "DOUBLE",
    get: (r) => Number(actionOf(r).defaultValueMicros ?? 0n) / MICROS_PER_UNIT,
  },
  "conversion_action.value_settings.default_currency_code": { type: "STRING", get: (r) => actionOf(r).defaultCurrencyCode },
  "conversion_action.value_settings.always_use_default_value": { type: "BOOLEAN", get: (r) => actionOf(r).alwaysUseDefaultValue },
  "conversion_action.tag_snippets": { type: "MESSAGE", get: (r) => tagSnippets(r.publicUrl, r.customer.id, actionOf(r)) },

  "click_view.resource_name": { type: "RESOURCE_NAME", get: (r) => resourceName.clickView(r.customer.id, isoDate(clickOf(r).clickedAt), clickOf(r).gclid) },
  "click_view.gclid": { type: "STRING", get: (r) => clickOf(r).gclid },
  "click_view.ad_group_ad": { type: "RESOURCE_NAME", get: (r) => resourceName.adGroupAd(r.customer.id, clickOf(r).adGroupId, clickOf(r).adId) },
  "click_view.keyword": {
    type: "RESOURCE_NAME",
    get: (r) => (clickOf(r).criterionId ? resourceName.adGroupCriterion(r.customer.id, clickOf(r).adGroupId, clickOf(r).criterionId!) : null),
  },
  "click_view.keyword_info.text": { type: "STRING", get: (r) => r.criterion?.keywordText ?? null },
  "click_view.keyword_info.match_type": { type: "ENUM", get: (r) => r.criterion?.matchType ?? null },
  "click_view.search_query": { type: "STRING", get: (r) => clickOf(r).query },
  "click_view.invalid": { type: "BOOLEAN", get: (r) => clickOf(r).invalid },

  "metrics.impressions": { type: "INT64", get: (r) => BigInt(Math.round(sums(r).impressions)) },
  "metrics.clicks": { type: "INT64", get: (r) => BigInt(Math.round(sums(r).clicks)) },
  "metrics.cost_micros": { type: "INT64", get: (r) => BigInt(Math.round(sums(r).costMicros)) },
  "metrics.ctr": { type: "DOUBLE", get: (r) => ratio(sums(r).clicks, sums(r).impressions) },
  "metrics.average_cpc": { type: "DOUBLE", get: (r) => ratio(sums(r).costMicros, sums(r).clicks) },
  "metrics.average_cpm": { type: "DOUBLE", get: (r) => ratio(sums(r).costMicros, sums(r).impressions) * 1000 },
  "metrics.conversions": { type: "DOUBLE", get: (r) => round2(sums(r).conversions) },
  "metrics.conversions_value": { type: "DOUBLE", get: (r) => round2(sums(r).conversionsValueMicros / MICROS_PER_UNIT) },
  "metrics.cost_per_conversion": { type: "DOUBLE", get: (r) => ratio(sums(r).costMicros, sums(r).conversions) },
  "metrics.conversions_from_interactions_rate": { type: "DOUBLE", get: (r) => ratio(sums(r).conversions, sums(r).clicks) },
  "metrics.value_per_conversion": { type: "DOUBLE", get: (r) => ratio(sums(r).conversionsValueMicros / MICROS_PER_UNIT, sums(r).conversions) },

  "segments.date": { type: "DATE", get: (r) => need(r.date, "segments.date") },
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

const campaignOf = (r: RowContext) => need(r.campaign, "campaign");
const budgetOf = (r: RowContext) => need(r.budget, "campaign budget");
const adGroupOf = (r: RowContext) => need(r.adGroup, "ad group");
const criterionOf = (r: RowContext) => need(r.criterion, "ad group criterion");
const adOf = (r: RowContext) => need(r.ad, "ad group ad");
const actionOf = (r: RowContext) => need(r.conversionAction, "conversion action");
const clickOf = (r: RowContext) => need(r.click, "click");
const locationOf = (r: RowContext) => need(r.location, "campaign criterion");

/** The resource a field belongs to: "ad_group_criterion.keyword.text" → "ad_group_criterion". */
export function resourceOf(field: string): string {
  return field.split(".")[0]!;
}
