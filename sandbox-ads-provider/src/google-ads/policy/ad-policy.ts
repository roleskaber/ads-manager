import type { PolicyApprovalStatus } from "../../generated/prisma/enums.js";

export type AdContent = { headlines: string[]; descriptions: string[]; finalUrls: string[] };

export type PolicyDecision = { approvalStatus: Exclude<PolicyApprovalStatus, "UNKNOWN">; policyTopics: string[] };

type Rule = { topic: string; restricts?: boolean; test: (ad: AdContent) => boolean };

function isLocal(url: string): boolean {
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname) || new URL(url).hostname.endsWith(".localhost");
  } catch {
    return false;
  }
}

const anyText = (ad: AdContent, pattern: RegExp) => [...ad.headlines, ...ad.descriptions].some((text) => pattern.test(text));

/** A simplified Google Ads policy: disapproving topics block serving, restricted ones limit reach. */
const RULES: Rule[] = [
  { topic: "MISLEADING_CLAIMS", test: (ad) => anyText(ad, /\b(guarantee[ds]?|risk[- ]free|miracle|100% (free|results))\b/i) },
  { topic: "GAMBLING_AND_GAMES", test: (ad) => anyText(ad, /\b(casino|betting|poker|jackpot)\b/i) },
  { topic: "COUNTERFEIT_GOODS", test: (ad) => anyText(ad, /\b(replica|counterfeit|fake (rolex|brand))\b/i) },
  { topic: "EXCLAMATION_IN_HEADLINE", test: (ad) => ad.headlines.some((text) => text.includes("!")) },
  { topic: "EXCESSIVE_PUNCTUATION", test: (ad) => anyText(ad, /[!?]{2,}/) },
  { topic: "EXCESSIVE_CAPITALIZATION", test: (ad) => anyText(ad, /\b[A-Z]{5,}\b/) },
  // Local development landing pages are exempt so the sandbox works against localhost.
  { topic: "DESTINATION_NOT_SECURE", test: (ad) => ad.finalUrls.some((url) => !url.startsWith("https://") && !isLocal(url)) },
  { topic: "ALCOHOL", restricts: true, test: (ad) => anyText(ad, /\b(beer|wine|vodka|whisk(e)?y|liquor)\b/i) },
  { topic: "HEALTHCARE_AND_MEDICINES", restricts: true, test: (ad) => anyText(ad, /\b(pharmacy|prescription|medicine)\b/i) },
];

export function reviewAd(ad: AdContent): PolicyDecision {
  const hits = RULES.filter((rule) => rule.test(ad));
  const policyTopics = hits.map((rule) => rule.topic);
  if (hits.some((rule) => !rule.restricts)) return { approvalStatus: "DISAPPROVED", policyTopics };
  if (hits.length) return { approvalStatus: "APPROVED_LIMITED", policyTopics };
  return { approvalStatus: "APPROVED", policyTopics };
}
