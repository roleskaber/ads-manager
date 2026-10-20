import { InvalidArgumentError } from "../domain/errors.js";

export const resourceName = {
  customer: (customerId: string) => `customers/${customerId}`,
  campaignBudget: (customerId: string, id: bigint) => `customers/${customerId}/campaignBudgets/${id}`,
  campaign: (customerId: string, id: bigint) => `customers/${customerId}/campaigns/${id}`,
  campaignCriterion: (customerId: string, campaignId: bigint, id: bigint) =>
    `customers/${customerId}/campaignCriteria/${campaignId}~${id}`,
  adGroup: (customerId: string, id: bigint) => `customers/${customerId}/adGroups/${id}`,
  adGroupCriterion: (customerId: string, adGroupId: bigint, id: bigint) =>
    `customers/${customerId}/adGroupCriteria/${adGroupId}~${id}`,
  adGroupAd: (customerId: string, adGroupId: bigint, adId: bigint) => `customers/${customerId}/adGroupAds/${adGroupId}~${adId}`,
  ad: (customerId: string, adId: bigint) => `customers/${customerId}/ads/${adId}`,
  conversionAction: (customerId: string, id: bigint) => `customers/${customerId}/conversionActions/${id}`,
  clickView: (customerId: string, date: string, gclid: string) => `customers/${customerId}/clickViews/${date}~${gclid}`,
};

/**
 * Parses "customers/{customerId}/{collection}/{id}[~{id}]" and returns the ids. The resource must
 * belong to the customer the request is made for.
 */
export function parseResourceName(name: string, customerId: string, collection: string): bigint[] {
  const match = /^customers\/(\d+)\/([A-Za-z]+)\/(\d+(?:~\d+)*)$/.exec(name);
  if (!match || match[2] !== collection) {
    throw new InvalidArgumentError(`Malformed ${collection} resource name: ${name}`, { fieldError: "INVALID_RESOURCE_NAME" });
  }
  if (match[1] !== customerId) {
    throw new InvalidArgumentError(`Resource ${name} belongs to another customer`, { authorizationError: "USER_PERMISSION_DENIED" });
  }
  return match[3]!.split("~").map((id) => BigInt(id));
}
