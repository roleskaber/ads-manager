import { InvalidArgumentError } from "../../domain/errors.js";
import { addDays, isoDate, startOfUtcDay } from "../../lib/dates.js";

export type DateRange = { from: string; to: string };

/** GAQL predefined date ranges (DURING …), resolved against UTC "today". Ranges are inclusive. */
export function resolveDuring(range: string, now: Date): DateRange {
  const today = startOfUtcDay(now);
  const days = (from: number, to: number) => ({ from: isoDate(addDays(today, from)), to: isoDate(addDays(today, to)) });
  const weekday = (today.getUTCDay() + 6) % 7; // Monday = 0

  switch (range) {
    case "TODAY":
      return days(0, 0);
    case "YESTERDAY":
      return days(-1, -1);
    case "LAST_7_DAYS":
      return days(-7, -1);
    case "LAST_14_DAYS":
      return days(-14, -1);
    case "LAST_30_DAYS":
      return days(-30, -1);
    case "THIS_WEEK_MON_TODAY":
      return days(-weekday, 0);
    case "LAST_WEEK_MON_SUN":
      return days(-weekday - 7, -weekday - 1);
    case "THIS_MONTH":
      return { from: isoDate(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))), to: isoDate(today) };
    case "LAST_MONTH": {
      const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
      const last = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
      return { from: isoDate(first), to: isoDate(last) };
    }
    default:
      throw new InvalidArgumentError(`Unsupported date range ${range}`, { queryError: "INVALID_VALUE_WITH_DURING_OPERATOR" });
  }
}
