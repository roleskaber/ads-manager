/**
 * Caps how many distinct values a label may take per scope (e.g. campaigns per company).
 * The tracking endpoint is public, so without this anyone could blow up Prometheus
 * with random utm_campaign values. Values beyond the cap collapse into "other".
 */
export class LabelLimiter {
  private readonly seen = new Map<string, Set<string>>();

  constructor(private readonly maxValuesPerScope: number, private readonly maxLength = 64) {}

  limit(scope: string, raw: string | null | undefined): string {
    const value = (raw ?? "").trim().toLowerCase().slice(0, this.maxLength) || "none";
    let values = this.seen.get(scope);
    if (!values) {
      values = new Set();
      this.seen.set(scope, values);
    }
    if (values.has(value)) return value;
    if (values.size >= this.maxValuesPerScope) return "other";
    values.add(value);
    return value;
  }
}
