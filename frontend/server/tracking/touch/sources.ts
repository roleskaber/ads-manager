import type { TrafficChannel } from "@/lib/generated/prisma/enums";

/** Ad-platform click ids appended to landing URLs. */
export const clickIdPlatforms: Record<string, { source: string; channel: TrafficChannel }> = {
  gclid: { source: "google", channel: "PAID_SEARCH" },
  gbraid: { source: "google", channel: "PAID_SEARCH" },
  wbraid: { source: "google", channel: "PAID_SEARCH" },
  yclid: { source: "yandex", channel: "PAID_SEARCH" },
  msclkid: { source: "bing", channel: "PAID_SEARCH" },
  ttclid: { source: "tiktok", channel: "PAID_SOCIAL" },
  // Facebook appends fbclid to organic shares too, so on its own it means organic social.
  fbclid: { source: "facebook", channel: "ORGANIC_SOCIAL" },
};

export const searchEngines: Record<string, string> = {
  "google.": "google",
  "yandex.": "yandex",
  "ya.ru": "yandex",
  "bing.com": "bing",
  "duckduckgo.com": "duckduckgo",
  "search.yahoo.": "yahoo",
  "go.mail.ru": "mail.ru",
};

export const socialNetworks: Record<string, string> = {
  "facebook.com": "facebook",
  "instagram.com": "instagram",
  "vk.com": "vk",
  "ok.ru": "ok",
  "t.me": "telegram",
  "x.com": "x",
  "twitter.com": "x",
  "t.co": "x",
  "linkedin.com": "linkedin",
  "youtube.com": "youtube",
  "tiktok.com": "tiktok",
  "pinterest.": "pinterest",
  "reddit.com": "reddit",
};

export const paidMediums = new Set(["cpc", "ppc", "paid", "paidsearch", "paid_search", "cpa", "cpv"]);
export const paidSocialMediums = new Set(["paid_social", "paidsocial", "social_paid", "cpm_social"]);
export const displayMediums = new Set(["display", "banner", "cpm", "programmatic", "retargeting"]);
export const emailMediums = new Set(["email", "e-mail", "newsletter", "mailing"]);
export const socialMediums = new Set(["social", "social_media", "sm", "smm"]);

export function matchHost(host: string, table: Record<string, string>) {
  const normalized = host.replace(/^www\./, "");
  const entry = Object.entries(table).find(([pattern, ]) =>
    pattern.endsWith(".") ? normalized.includes(pattern) : normalized === pattern || normalized.endsWith(`.${pattern}`),
  );
  return entry?.[1] ?? null;
}
