import { z } from "zod";
import type { Db } from "../../db.js";
import type { Clock } from "../../domain/clock.js";
import { InvalidArgumentError, NotFoundError } from "../../domain/errors.js";
import { snakeToCamel } from "../../lib/case.js";
import { isoDate, parseIsoDate, startOfUtcDay } from "../../lib/dates.js";
import { campaignTreeInclude, toSnapshot, type AccountSync } from "../delivery/account-sync.js";
import { campaignHealth } from "../delivery/eligibility.js";
import { resolveDuring, type DateRange } from "./date-ranges.js";
import { parseGaql, type Condition, type GaqlQuery, type Literal } from "./gaql-parser.js";
import { FIELDS, RESOURCES, resourceOf, type MetricSums, type RowContext } from "./gaql-schema.js";

const PAGE_SIZE = 10_000;

const searchSchema = z.object({
  query: z.string().min(1),
  pageToken: z.string().optional(),
  returnTotalResultsCount: z.boolean().default(false),
});

const queryError = (code: string, message: string) => new InvalidArgumentError(message, { queryError: code });

/** GoogleAdsService.Search / SearchStream over the sandbox data. */
export class ReportingService {
  constructor(
    private readonly db: Db,
    private readonly sync: AccountSync,
    private readonly clock: Clock,
    private readonly publicUrl: string,
  ) {}

  async search(customerId: string, body: unknown) {
    const request = searchSchema.parse(body);
    const { rows, query } = await this.execute(customerId, request.query);

    const offset = request.pageToken ? Number(Buffer.from(request.pageToken, "base64url").toString()) : 0;
    if (!Number.isInteger(offset) || offset < 0) throw new InvalidArgumentError("Invalid page token", { requestError: "INVALID_PAGE_TOKEN" });
    const page = rows.slice(offset, offset + PAGE_SIZE);

    return {
      results: page.map((row) => present(row, query.select)),
      fieldMask: fieldMask(query.select),
      ...(offset + PAGE_SIZE < rows.length ? { nextPageToken: Buffer.from(String(offset + PAGE_SIZE)).toString("base64url") } : {}),
      ...(request.returnTotalResultsCount ? { totalResultsCount: String(rows.length) } : {}),
    };
  }

  /** REST searchStream returns a JSON array of batches. */
  async searchStream(customerId: string, body: unknown) {
    const { query: text } = searchSchema.pick({ query: true }).parse(body);
    const { rows, query } = await this.execute(customerId, text);
    const batches = [];
    for (let i = 0; i < Math.max(rows.length, 1); i += PAGE_SIZE) {
      batches.push({ results: rows.slice(i, i + PAGE_SIZE).map((row) => present(row, query.select)), fieldMask: fieldMask(query.select) });
    }
    return batches;
  }

  private async execute(customerId: string, text: string) {
    const query = parseGaql(text);
    const resource = RESOURCES[query.from];
    if (!resource) throw queryError("INVALID_RESOURCE_NAME_IN_FROM_CLAUSE", `Unsupported resource ${query.from}`);

    const allowed = new Set([query.from, ...resource.attributed, ...(resource.metrics ? ["metrics", "segments"] : [])]);
    const referenced = [...query.select, ...query.where.map((c) => c.field), ...query.orderBy.map((o) => o.field)];
    for (const field of referenced) {
      if (!FIELDS[field]) throw queryError("UNRECOGNIZED_FIELD", `Unrecognized field ${field}`);
      if (!allowed.has(resourceOf(field))) {
        throw queryError("PROHIBITED_FIELD_COMBINATION_IN_SELECT_CLAUSE", `${field} cannot be selected with FROM ${query.from}`);
      }
    }

    const now = this.clock.now();
    const range = dateRange(query.where, now);
    const segmentedByDate = query.select.includes("segments.date");
    if (segmentedByDate && !range) {
      throw queryError("EXPECTED_FILTERS_ON_DATE_RANGE", "Selecting segments.date requires a finite date range filter");
    }
    if (resource.requiresSingleDay && (!range || range.from !== range.to)) {
      throw queryError("EXPECTED_FILTER_ON_A_SINGLE_DAY", `${query.from} requires a filter on segments.date for a single day`);
    }

    await this.db.$transaction(async (tx) => {
      if (!(await this.sync.sync(tx, customerId))) throw new NotFoundError(`Customer ${customerId}`);
    });

    const usesMetrics = referenced.some((field) => resourceOf(field) === "metrics");
    let rows = await this.load(customerId, query.from, range, now);
    if (resource.metrics && resource.metrics !== "click" && (usesMetrics || segmentedByDate)) {
      rows = await this.joinMetrics(customerId, rows, resource.metrics, range, segmentedByDate);
    }

    // Unsegmented rows already summed only the filtered dates, so date conditions apply to segmented rows only.
    rows = rows.filter((row) =>
      query.where.every((condition) => (condition.field === "segments.date" && row.date === undefined) || matches(row, condition, now)),
    );
    rows = sortRows(rows, query.orderBy);
    if (query.limit !== null) rows = rows.slice(0, query.limit);
    return { rows, query };
  }

  private async load(customerId: string, from: string, range: DateRange | null, now: Date): Promise<RowContext[]> {
    const customer = await this.db.customer.findUniqueOrThrow({ where: { id: customerId } });
    const base = { publicUrl: this.publicUrl, customer };

    if (from === "customer") return [base];
    if (from === "conversion_action") {
      const actions = await this.db.conversionAction.findMany({ where: { customerId }, orderBy: { id: "asc" } });
      return actions.map((conversionAction) => ({ ...base, conversionAction }));
    }
    if (from === "campaign_budget") {
      const budgets = await this.db.campaignBudget.findMany({ where: { customerId }, orderBy: { id: "asc" } });
      return budgets.map((budget) => ({ ...base, budget }));
    }

    const [campaigns, tracked, spentToday] = await Promise.all([
      this.db.campaign.findMany({ where: { customerId }, include: campaignTreeInclude, orderBy: { id: "asc" } }),
      this.db.conversionAction.count({ where: { customerId, status: "ENABLED" } }),
      this.db.adGroupMetric.groupBy({ by: ["campaignId"], where: { customerId, date: startOfUtcDay(now) }, _sum: { costMicros: true } }),
    ]);
    const spent = new Map(spentToday.map((row) => [row.campaignId, row._sum.costMicros ?? 0]));
    const withCampaign = campaigns.map((campaign) => ({
      ...base,
      campaign,
      budget: campaign.budget,
      health: campaignHealth(toSnapshot(campaign, tracked > 0), now, {
        spentTodayMicros: spent.get(campaign.id) ?? 0,
        balanceMicros: customer.balanceMicros,
      }),
    }));

    switch (from) {
      case "campaign":
        return withCampaign;
      case "campaign_criterion":
        return withCampaign.flatMap((row) => row.campaign.criteria.map((location) => ({ ...row, location })));
      case "ad_group":
        return withCampaign.flatMap((row) => row.campaign.adGroups.map((adGroup) => ({ ...row, adGroup })));
      case "ad_group_criterion":
        return withCampaign.flatMap((row) =>
          row.campaign.adGroups.flatMap((adGroup) => adGroup.criteria.map((criterion) => ({ ...row, adGroup, criterion }))),
        );
      case "ad_group_ad":
        return withCampaign.flatMap((row) => row.campaign.adGroups.flatMap((adGroup) => adGroup.ads.map((ad) => ({ ...row, adGroup, ad }))));
      case "click_view": {
        const day = parseIsoDate(range!.from);
        const clicks = await this.db.click.findMany({
          where: { customerId, clickedAt: { gte: day, lt: new Date(day.getTime() + 86_400_000) } },
          orderBy: { clickedAt: "asc" },
        });
        const campaignRows = new Map(withCampaign.map((row) => [row.campaign.id, row]));
        return clicks.flatMap((click) => {
          const row = campaignRows.get(click.campaignId);
          const adGroup = row?.campaign.adGroups.find((group) => group.id === click.adGroupId);
          if (!row || !adGroup) return [];
          const criterion = adGroup.criteria.find((c) => c.id === click.criterionId);
          const metrics: MetricSums = { impressions: 0, clicks: click.invalid ? 0 : 1, costMicros: Number(click.costMicros), conversions: 0, conversionsValueMicros: 0 };
          return [{ ...row, adGroup, criterion, click, metrics, date: isoDate(click.clickedAt) }];
        });
      }
      default:
        return [];
    }
  }

  private async joinMetrics(
    customerId: string,
    rows: RowContext[],
    level: "customer" | "campaign" | "ad_group",
    range: DateRange | null,
    byDate: boolean,
  ): Promise<RowContext[]> {
    const keyField = level === "customer" ? "customerId" : level === "campaign" ? "campaignId" : "adGroupId";
    const grouped = await this.db.adGroupMetric.groupBy({
      by: byDate ? [keyField, "date"] : [keyField],
      where: { customerId, ...(range ? { date: { gte: parseIsoDate(range.from), lte: parseIsoDate(range.to) } } : {}) },
      _sum: { impressions: true, clicks: true, costMicros: true, conversions: true, conversionsValueMicros: true },
    });

    const buckets = new Map<string, { date?: string; metrics: MetricSums }[]>();
    for (const group of grouped) {
      const key = String(group[keyField]);
      const metrics: MetricSums = {
        impressions: group._sum.impressions ?? 0,
        clicks: group._sum.clicks ?? 0,
        costMicros: group._sum.costMicros ?? 0,
        conversions: group._sum.conversions ?? 0,
        conversionsValueMicros: group._sum.conversionsValueMicros ?? 0,
      };
      buckets.set(key, [...(buckets.get(key) ?? []), { date: "date" in group ? isoDate(group.date as Date) : undefined, metrics }]);
    }

    const keyOf = (row: RowContext) =>
      level === "customer" ? row.customer.id : level === "campaign" ? String(row.campaign!.id) : String(row.adGroup!.id);

    return rows.flatMap((row) => {
      const found = buckets.get(keyOf(row)) ?? [];
      // Segmented rows only exist for days with data; unsegmented rows always exist (zeros).
      if (byDate) return found.map(({ date, metrics }) => ({ ...row, date, metrics }));
      return [{ ...row, metrics: found[0]?.metrics }];
    });
  }
}

/** Date range implied by conditions on segments.date, or null when unbounded. */
function dateRange(where: Condition[], now: Date): DateRange | null {
  let from: string | null = null;
  let to: string | null = null;
  const tighten = (lower: string | null, upper: string | null) => {
    if (lower && (!from || lower > from)) from = lower;
    if (upper && (!to || upper < to)) to = upper;
  };
  for (const condition of where) {
    if (condition.field !== "segments.date") continue;
    switch (condition.op) {
      case "DURING": {
        const range = resolveDuring(condition.range, now);
        tighten(range.from, range.to);
        break;
      }
      case "BETWEEN":
        tighten(dateLiteral(condition.from), dateLiteral(condition.to));
        break;
      case "=":
        tighten(dateLiteral(condition.value), dateLiteral(condition.value));
        break;
      case ">=":
      case ">":
        tighten(dateLiteral(condition.value), null);
        break;
      case "<=":
      case "<":
        tighten(null, dateLiteral(condition.value));
        break;
    }
  }
  return from && to ? { from, to } : null;
}

function dateLiteral(value: Literal): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw queryError("INVALID_VALUE_WITH_BETWEEN_OPERATOR", `Expected a date literal 'YYYY-MM-DD' but got ${String(value)}`);
  }
  return value;
}

function comparable(value: unknown): string | number | boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") return value;
  return JSON.stringify(value);
}

function compare(a: unknown, b: Literal): number {
  const left = comparable(a);
  if (left === null || b === null) return left === b ? 0 : left === null ? -1 : 1;
  if (typeof left === "number" && (typeof b === "number" || /^-?\d+(\.\d+)?$/.test(String(b)))) return left - Number(b);
  return String(left) < String(b) ? -1 : String(left) > String(b) ? 1 : 0;
}

function matches(row: RowContext, condition: Condition, now: Date): boolean {
  const value = FIELDS[condition.field]!.get(row);
  switch (condition.op) {
    case "=":
      return compare(value, condition.value) === 0;
    case "!=":
      return compare(value, condition.value) !== 0;
    case ">":
      return compare(value, condition.value) > 0;
    case ">=":
      return compare(value, condition.value) >= 0;
    case "<":
      return compare(value, condition.value) < 0;
    case "<=":
      return compare(value, condition.value) <= 0;
    case "IN":
      return condition.values.some((candidate) => compare(value, candidate) === 0);
    case "NOT IN":
      return !condition.values.some((candidate) => compare(value, candidate) === 0);
    case "LIKE":
    case "NOT LIKE": {
      const pattern = new RegExp(`^${String(condition.value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".")}$`);
      return pattern.test(String(value ?? "")) === (condition.op === "LIKE");
    }
    case "BETWEEN":
      return compare(value, condition.from) >= 0 && compare(value, condition.to) <= 0;
    case "DURING": {
      const range = resolveDuring(condition.range, now);
      return compare(value, range.from) >= 0 && compare(value, range.to) <= 0;
    }
    case "IS NULL":
      return value === null || value === undefined;
    case "IS NOT NULL":
      return value !== null && value !== undefined;
  }
}

function sortRows(rows: RowContext[], orderBy: GaqlQuery["orderBy"]): RowContext[] {
  if (!orderBy.length) return rows;
  return [...rows].sort((a, b) => {
    for (const { field, direction } of orderBy) {
      const left = comparable(FIELDS[field]!.get(a));
      const right = comparable(FIELDS[field]!.get(b));
      const order = compare(left, right as Literal);
      if (order !== 0) return direction === "ASC" ? order : -order;
    }
    return 0;
  });
}

/** Builds the nested camelCase result object; resource objects always carry their resourceName. */
function present(row: RowContext, select: string[]) {
  const result: Record<string, unknown> = {};
  const resources = new Set(select.map(resourceOf).filter((name) => name !== "metrics" && name !== "segments"));
  const fields = [...[...resources].map((name) => `${name}.resource_name`), ...select];

  for (const field of new Set(fields)) {
    const value = output(FIELDS[field]!.type, FIELDS[field]!.get(row));
    if (value === undefined) continue;
    const path = field.split(".").map(snakeToCamel);
    let target = result;
    for (const key of path.slice(0, -1)) target = (target[key] ??= {}) as Record<string, unknown>;
    target[path.at(-1)!] = value;
  }
  return result;
}

/** proto3 JSON: int64 as strings, unset values omitted. */
function output(type: string, value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (type === "INT64") return String(value);
  return value;
}

function fieldMask(select: string[]): string {
  return select.map((field) => field.split(".").map(snakeToCamel).join(".")).join(",");
}
