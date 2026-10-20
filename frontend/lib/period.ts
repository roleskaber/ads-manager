export const periodOptions = ["7d", "30d", "90d"] as const;
export type PeriodOption = (typeof periodOptions)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

export function parsePeriodOption(value: unknown): PeriodOption {
  return periodOptions.includes(value as PeriodOption) ? (value as PeriodOption) : "30d";
}

/** Current window ends at the start of tomorrow (UTC) so today is included; previous window is the same length right before it. */
export function resolvePeriod(option: PeriodOption, now = new Date()) {
  const days = Number.parseInt(option, 10);
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const from = new Date(to.getTime() - days * DAY_MS);
  const previous = { from: new Date(from.getTime() - days * DAY_MS), to: from };
  return { days, current: { from, to }, previous };
}

export function eachDay(from: Date, to: Date) {
  const days: Date[] = [];
  for (let time = from.getTime(); time < to.getTime(); time += DAY_MS) days.push(new Date(time));
  return days;
}
