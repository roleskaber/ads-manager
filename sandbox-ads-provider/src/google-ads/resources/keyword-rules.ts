import { InvalidArgumentError } from "../../domain/errors.js";
import type { KeywordMatchType } from "../../generated/prisma/enums.js";

const MAX_LENGTH = 80;
const MAX_WORDS = 10;
const INVALID_CHARS = /[!@%^*()=;,<>|`~{}\\]/;

/** Normalises keyword text the way the network matches it and enforces Google's limits. */
export function normalizeKeyword(text: string): string {
  const normalized = text.trim().replace(/\s+/g, " ").toLowerCase();
  if (!normalized) throw new InvalidArgumentError("Keyword text is empty", { criterionError: "KEYWORD_TEXT_TOO_SHORT" });
  if (normalized.length > MAX_LENGTH) {
    throw new InvalidArgumentError(`Keyword is longer than ${MAX_LENGTH} characters`, { criterionError: "KEYWORD_TEXT_TOO_LONG" });
  }
  if (normalized.split(" ").length > MAX_WORDS) {
    throw new InvalidArgumentError(`Keyword has more than ${MAX_WORDS} words`, { criterionError: "KEYWORD_HAS_TOO_MANY_WORDS" });
  }
  if (INVALID_CHARS.test(normalized)) {
    throw new InvalidArgumentError("Keyword contains invalid characters", { criterionError: "KEYWORD_HAS_INVALID_CHARS" });
  }
  return normalized;
}

function words(text: string): string[] {
  return text.toLowerCase().trim().split(/\s+/).filter(Boolean);
}

/**
 * Whether a search query triggers a keyword:
 * EXACT — same words in the same order; PHRASE — the keyword's words appear in order inside the
 * query; BROAD — every keyword word appears somewhere in the query.
 */
export function keywordMatches(query: string, keyword: string, matchType: KeywordMatchType): boolean {
  const q = words(query);
  const k = words(keyword);
  if (!k.length) return false;
  switch (matchType) {
    case "EXACT":
      return q.join(" ") === k.join(" ");
    case "PHRASE":
      return ` ${q.join(" ")} `.includes(` ${k.join(" ")} `);
    case "BROAD":
      return k.every((word) => q.includes(word));
  }
}
