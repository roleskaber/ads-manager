import { z } from "zod";
import { InvalidArgumentError } from "../../domain/errors.js";
import { parseIsoDate } from "../../lib/dates.js";

/** int64 fields arrive as JSON strings (proto3 JSON) or numbers. */
export const int64 = z
  .union([z.string().regex(/^-?\d+$/, "must be an integer"), z.number().int()])
  .transform((value) => BigInt(value));

export const micros = int64.refine((value) => value >= 0n, "must not be negative");

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD")
  .transform(parseIsoDate)
  .refine((date) => !Number.isNaN(date.getTime()), "is not a valid date");

export const entityStatus = z.enum(["ENABLED", "PAUSED"]);

/** Parses Google's FieldMask ("name,status,targetCpa.targetCpaMicros") into its paths. */
export function parseUpdateMask(mask: string | undefined, allowed: readonly string[]): string[] {
  const paths = (mask ?? "")
    .split(",")
    .map((path) => path.trim())
    .filter(Boolean);
  if (!paths.length) throw new InvalidArgumentError("updateMask is required for update operations", { fieldMaskError: "FIELD_MASK_MISSING" });
  for (const path of paths) {
    if (!allowed.some((field) => path === field || path.startsWith(`${field}.`))) {
      throw new InvalidArgumentError(`Field ${path} cannot be updated`, { fieldMaskError: "FIELD_NOT_FOUND" });
    }
  }
  return paths;
}

export function masks(paths: string[], field: string): boolean {
  return paths.some((path) => path === field || path.startsWith(`${field}.`));
}
