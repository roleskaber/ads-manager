/** Subset of Google Ads geo target constants with a relative audience size used for reach. */
export const GEO_TARGETS: Record<string, { name: string; countryCode: string; audience: number }> = {
  "2840": { name: "United States", countryCode: "US", audience: 1 },
  "2826": { name: "United Kingdom", countryCode: "GB", audience: 0.3 },
  "2276": { name: "Germany", countryCode: "DE", audience: 0.35 },
  "2250": { name: "France", countryCode: "FR", audience: 0.28 },
  "2724": { name: "Spain", countryCode: "ES", audience: 0.18 },
  "2380": { name: "Italy", countryCode: "IT", audience: 0.2 },
  "2616": { name: "Poland", countryCode: "PL", audience: 0.12 },
  "2124": { name: "Canada", countryCode: "CA", audience: 0.15 },
  "2036": { name: "Australia", countryCode: "AU", audience: 0.11 },
  "2643": { name: "Russia", countryCode: "RU", audience: 0.4 },
  "2804": { name: "Ukraine", countryCode: "UA", audience: 0.1 },
  "2112": { name: "Belarus", countryCode: "BY", audience: 0.03 },
  "2398": { name: "Kazakhstan", countryCode: "KZ", audience: 0.05 },
};

/** Audience of an untargeted ("all countries") campaign relative to the United States. */
export const WORLDWIDE_AUDIENCE = 2.5;

export function geoTargetId(resourceName: string): string | null {
  const match = /^geoTargetConstants\/(\d+)$/.exec(resourceName);
  return match && GEO_TARGETS[match[1]!] ? match[1]! : null;
}

export function countryCodeOf(resourceName: string): string | undefined {
  const id = geoTargetId(resourceName);
  return id ? GEO_TARGETS[id]!.countryCode : undefined;
}

/** Reach multiplier of a set of targeted locations (positive criteria only). */
export function audienceOf(geoTargetConstants: string[]): number {
  if (!geoTargetConstants.length) return WORLDWIDE_AUDIENCE;
  const total = geoTargetConstants.reduce((sum, name) => sum + (GEO_TARGETS[geoTargetId(name) ?? ""]?.audience ?? 0), 0);
  return Math.min(WORLDWIDE_AUDIENCE, total);
}
