import { InvalidArgumentError, PreconditionError } from "../../domain/errors.js";
import type { BiddingStrategyType } from "../../generated/prisma/enums.js";

export type BiddingInput = {
  manualCpc?: object;
  maximizeClicks?: object;
  maximizeConversions?: { targetCpaMicros?: bigint };
  targetCpa?: { targetCpaMicros?: bigint };
};

export type Bidding = { type: BiddingStrategyType; targetCpaMicros: bigint | null };

/** Resolves the `campaign_bidding_strategy` oneof. Returns null when none is set. */
export function resolveBidding(input: BiddingInput): Bidding | null {
  const set = (["manualCpc", "maximizeClicks", "maximizeConversions", "targetCpa"] as const).filter((key) => input[key] !== undefined);
  if (set.length > 1) {
    throw new InvalidArgumentError("Only one bidding strategy can be set", { biddingError: "BIDDING_STRATEGY_AND_BUDGET_MUST_BE_ALIGNED" });
  }
  switch (set[0]) {
    case undefined:
      return null;
    case "manualCpc":
      return { type: "MANUAL_CPC", targetCpaMicros: null };
    case "maximizeClicks":
      return { type: "MAXIMIZE_CLICKS", targetCpaMicros: null };
    case "maximizeConversions":
      return { type: "MAXIMIZE_CONVERSIONS", targetCpaMicros: positiveOrNull(input.maximizeConversions?.targetCpaMicros) };
    case "targetCpa": {
      const target = positiveOrNull(input.targetCpa?.targetCpaMicros);
      if (!target) throw new InvalidArgumentError("targetCpa.targetCpaMicros is required", { biddingError: "INVALID_TARGET_CPA" });
      return { type: "TARGET_CPA", targetCpaMicros: target };
    }
  }
}

function positiveOrNull(value: bigint | undefined): bigint | null {
  return value && value > 0n ? value : null;
}

/** Smart bidding optimises for conversions, so it needs conversion tracking on the account. */
export function assertConversionTracking(bidding: Bidding, enabledConversionActions: number) {
  if ((bidding.type === "MAXIMIZE_CONVERSIONS" || bidding.type === "TARGET_CPA") && enabledConversionActions === 0) {
    throw new PreconditionError(`${bidding.type} needs at least one enabled conversion action`, {
      biddingError: "CONVERSION_TRACKING_NOT_ENABLED",
    });
  }
}

export type Flight = { startDate: Date; endDate: Date | null };

/**
 * Flight date rules from Google Ads: dates cannot be set in the past, the end cannot precede the
 * start, and the start date is frozen once the campaign has started.
 */
export function assertFlight(next: Flight, today: Date, previous?: Flight) {
  const startChanged = !previous || previous.startDate.getTime() !== next.startDate.getTime();
  const endChanged = !previous || previous.endDate?.getTime() !== next.endDate?.getTime();

  if (startChanged && previous && previous.startDate <= today) {
    throw new PreconditionError("The start date cannot change after the campaign has started", {
      dateRangeError: "CANNOT_MODIFY_START_DATE_IF_ALREADY_STARTED",
    });
  }
  if (startChanged && next.startDate < today) {
    throw new InvalidArgumentError("The start date cannot be in the past", { dateRangeError: "CANNOT_SET_DATE_TO_PAST" });
  }
  if (endChanged && next.endDate && next.endDate < today) {
    throw new InvalidArgumentError("The end date cannot be in the past", { dateRangeError: "CANNOT_SET_DATE_TO_PAST" });
  }
  if (next.endDate && next.endDate < next.startDate) {
    throw new InvalidArgumentError("The end date is before the start date", { dateRangeError: "START_DATE_AFTER_END_DATE" });
  }
}
