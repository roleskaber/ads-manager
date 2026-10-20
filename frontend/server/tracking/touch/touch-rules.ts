import type { TrafficChannel } from "@/lib/generated/prisma/enums";
import {
  clickIdPlatforms,
  displayMediums,
  emailMediums,
  matchHost,
  paidMediums,
  paidSocialMediums,
  searchEngines,
  socialMediums,
  socialNetworks,
} from "./sources";
import type { ArrivalContext, Touch, TouchRule } from "./touch";

const MAX_LENGTH = 200;

function param(url: URL | null, name: string) {
  const value = url?.searchParams.get(name)?.trim();
  return value ? value.slice(0, MAX_LENGTH) : null;
}

function utm(url: URL | null) {
  return {
    source: param(url, "utm_source")?.toLowerCase() ?? null,
    medium: param(url, "utm_medium")?.toLowerCase() ?? null,
    campaign: param(url, "utm_campaign"),
    content: param(url, "utm_content"),
    term: param(url, "utm_term"),
  };
}

const bareHost = (url: URL) => url.hostname.replace(/^www\./, "");

/** The referrer, if it points to another site (internal navigation is not a touch). */
function externalReferrer({ url, referrer }: ArrivalContext): URL | null {
  if (!referrer) return null;
  return !url || bareHost(referrer) !== bareHost(url) ? referrer : null;
}

/** UTM tags win: they are set deliberately by the marketer. Click ids found alongside are kept. */
export class UtmRule implements TouchRule {
  classify(arrival: ArrivalContext): Touch | null {
    const tags = utm(arrival.url);
    if (!tags.source && !tags.medium && !tags.campaign) return null;

    const click = findClickId(arrival.url);
    const referrer = externalReferrer(arrival);
    const source = tags.source ?? click?.source ?? (referrer ? bareHost(referrer) : "unknown");
    return { ...tags, source, channel: channelForMedium(tags.medium, source, click?.channel), clickId: click?.id ?? null, clickIdType: click?.type ?? null };
  }
}

/** Auto-tagged ad clicks without UTM (e.g. Google Ads auto-tagging adds only gclid). */
export class ClickIdRule implements TouchRule {
  classify({ url }: ArrivalContext): Touch | null {
    const click = findClickId(url);
    if (!click) return null;
    const paid = click.channel === "PAID_SEARCH" || click.channel === "PAID_SOCIAL";
    return {
      channel: click.channel,
      source: click.source,
      medium: paid ? "cpc" : "social",
      campaign: null,
      content: null,
      term: null,
      clickId: click.id,
      clickIdType: click.type,
    };
  }
}

/** Untagged visits from another site: search engine, social network or plain referral. */
export class ReferrerRule implements TouchRule {
  classify(arrival: ArrivalContext): Touch | null {
    const referrer = externalReferrer(arrival);
    if (!referrer) return null;
    const host = bareHost(referrer);

    const engine = matchHost(host, searchEngines);
    if (engine) return organic("ORGANIC_SEARCH", engine, "organic");

    const network = matchHost(host, socialNetworks);
    if (network) return organic("ORGANIC_SOCIAL", network, "social");

    return organic("REFERRAL", host, "referral");
  }
}

function organic(channel: TrafficChannel, source: string, medium: string): Touch {
  return { channel, source, medium, campaign: null, content: null, term: null, clickId: null, clickIdType: null };
}

function findClickId(url: URL | null) {
  for (const [type, platform] of Object.entries(clickIdPlatforms)) {
    const id = param(url, type);
    if (id) return { type, id, ...platform };
  }
  return null;
}

function channelForMedium(medium: string | null, source: string, clickChannel?: TrafficChannel): TrafficChannel {
  const isSocialSource = Object.values(socialNetworks).includes(source);
  if (medium && paidSocialMediums.has(medium)) return "PAID_SOCIAL";
  if (medium && paidMediums.has(medium)) return isSocialSource ? "PAID_SOCIAL" : "PAID_SEARCH";
  if (medium && displayMediums.has(medium)) return "DISPLAY";
  if (medium && emailMediums.has(medium)) return "EMAIL";
  if (medium && socialMediums.has(medium)) return "ORGANIC_SOCIAL";
  if (clickChannel) return clickChannel;
  return "REFERRAL";
}
