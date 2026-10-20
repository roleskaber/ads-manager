import { z } from "zod";

/** Responsive search ad limits from Google Ads. */
export const AD_LIMITS = {
  headlines: { min: 3, max: 15, length: 30 },
  descriptions: { min: 2, max: 4, length: 90 },
  path: 15,
} as const;

const asset = (length: number) =>
  z.object({
    text: z.string().trim().min(1).max(length, `must be at most ${length} characters`),
    pinnedField: z.string().optional(),
  });

const unique = (items: { text: string }[]) => new Set(items.map((item) => item.text.toLowerCase())).size === items.length;

const url = z
  .string()
  .url()
  .refine((value) => /^https?:\/\//.test(value), "must be an http(s) URL");

export const responsiveSearchAdSchema = z.object({
  headlines: z
    .array(asset(AD_LIMITS.headlines.length))
    .min(AD_LIMITS.headlines.min)
    .max(AD_LIMITS.headlines.max)
    .refine(unique, "headlines must be unique"),
  descriptions: z
    .array(asset(AD_LIMITS.descriptions.length))
    .min(AD_LIMITS.descriptions.min)
    .max(AD_LIMITS.descriptions.max)
    .refine(unique, "descriptions must be unique"),
  path1: z.string().max(AD_LIMITS.path).optional(),
  path2: z.string().max(AD_LIMITS.path).optional(),
});

export const adSchema = z.object({
  finalUrls: z.array(url).length(1, "exactly one final URL is required"),
  responsiveSearchAd: responsiveSearchAdSchema,
});

export type AdInput = z.infer<typeof adSchema>;

export function adColumns(ad: AdInput) {
  return {
    headlines: ad.responsiveSearchAd.headlines.map((h) => h.text),
    descriptions: ad.responsiveSearchAd.descriptions.map((d) => d.text),
    finalUrls: ad.finalUrls,
    path1: ad.responsiveSearchAd.path1 ?? null,
    path2: ad.responsiveSearchAd.path2 ?? null,
  };
}

/** Columns that send an ad back to policy review. */
export function resubmission(now: Date) {
  return {
    reviewStatus: "REVIEW_IN_PROGRESS" as const,
    approvalStatus: "UNKNOWN" as const,
    policyTopics: [],
    submittedAt: now,
    reviewedAt: null,
  };
}
