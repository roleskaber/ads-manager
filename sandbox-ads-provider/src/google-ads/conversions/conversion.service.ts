import { z } from "zod";
import type { Db } from "../../db.js";
import type { Clock } from "../../domain/clock.js";
import { ApiError, InvalidArgumentError, NotFoundError, PreconditionError } from "../../domain/errors.js";
import { MICROS_PER_UNIT } from "../../domain/money.js";
import { DAY_MS, startOfUtcDay } from "../../lib/dates.js";
import type { ConversionAction, ConversionSource } from "../../generated/prisma/client.js";
import type { AccountSync, Tx } from "../delivery/account-sync.js";
import { toApiError } from "../errors.js";
import { errorDetail, ValidateOnlyRollback } from "../mutate/mutate.service.js";
import { parseResourceName } from "../resource-names.js";

export type ConversionInput = {
  action: ConversionAction;
  gclid: string;
  conversionAt: Date;
  valueMicros?: bigint;
  currencyCode?: string;
  orderId?: string;
  source: ConversionSource;
};

const uploadError = (code: string, message: string) => new PreconditionError(message, { conversionUploadError: code });

const uploadSchema = z.object({
  conversions: z
    .array(
      z.object({
        gclid: z.string().min(1),
        conversionAction: z.string(),
        /** "yyyy-mm-dd hh:mm:ss+|-hh:mm", as in the Google Ads API. */
        conversionDateTime: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/, "must be yyyy-mm-dd hh:mm:ss+hh:mm"),
        conversionValue: z.number().nonnegative().optional(),
        currencyCode: z.string().length(3).toUpperCase().optional(),
        orderId: z.string().min(1).max(64).optional(),
      }),
    )
    .min(1)
    .max(2000),
  partialFailure: z.literal(true, { message: "partialFailure must be true for uploadClickConversions" }),
  validateOnly: z.boolean().default(false),
});

/**
 * Attributes conversions to ad clicks (last click, by gclid) for both the conversion tag and
 * offline uploads, and adds them to the ad group's stats on the click date.
 */
export class ConversionService {
  constructor(
    private readonly db: Db,
    private readonly sync: AccountSync,
    private readonly clock: Clock,
  ) {}

  async record(tx: Tx, input: ConversionInput): Promise<void> {
    const { action } = input;
    if (action.status !== "ENABLED") throw uploadError("NO_CONVERSION_ACTION_FOUND", "The conversion action is not enabled");

    const click = await tx.click.findUnique({ where: { gclid: input.gclid } });
    if (!click) throw uploadError("CLICK_NOT_FOUND", `No click with gclid ${input.gclid}`);
    if (click.customerId !== action.customerId) throw uploadError("INVALID_CUSTOMER_FOR_CLICK", "The click belongs to another account");
    if (input.conversionAt < click.clickedAt) throw uploadError("CONVERSION_PRECEDES_GCLID", "The conversion happened before the click");
    if (input.conversionAt.getTime() - click.clickedAt.getTime() > action.clickThroughLookbackWindowDays * DAY_MS) {
      throw uploadError("EXPIRED_GCLID", "The click is outside the conversion action's lookback window");
    }

    if (input.orderId && (await tx.conversion.count({ where: { conversionActionId: action.id, orderId: input.orderId } }))) {
      throw uploadError("ORDER_ID_ALREADY_IN_USE", `Order ${input.orderId} was already counted`);
    }
    if (action.countingType === "ONE_PER_CLICK" && (await tx.conversion.count({ where: { conversionActionId: action.id, gclid: click.gclid } }))) {
      throw uploadError("CLICK_CONVERSION_ALREADY_EXISTS", "This click already converted for the action");
    }

    const valueMicros = action.alwaysUseDefaultValue ? (action.defaultValueMicros ?? 0n) : (input.valueMicros ?? action.defaultValueMicros ?? 0n);
    await tx.conversion.create({
      data: {
        conversionActionId: action.id,
        gclid: click.gclid,
        source: input.source,
        valueMicros,
        currencyCode: input.currencyCode ?? action.defaultCurrencyCode,
        orderId: input.orderId ?? null,
        conversionAt: input.conversionAt,
      },
    });

    const date = startOfUtcDay(click.clickedAt);
    await tx.adGroupMetric.upsert({
      where: { adGroupId_date: { adGroupId: click.adGroupId, date } },
      create: {
        customerId: click.customerId,
        campaignId: click.campaignId,
        adGroupId: click.adGroupId,
        date,
        conversions: 1,
        conversionsValueMicros: Number(valueMicros),
      },
      update: { conversions: { increment: 1 }, conversionsValueMicros: { increment: Number(valueMicros) } },
    });
  }

  /** Conversion tag hit: /pagead/conversion/{conversionId}/?label=…&gclid=… */
  async recordTagHit(hit: { conversionId: string; label: string; gclid?: string; value?: number; currencyCode?: string; orderId?: string }) {
    if (!hit.gclid) return "NO_GCLID";
    try {
      await this.db.$transaction(async (tx) => {
        const action = await tx.conversionAction.findFirst({
          where: { customerId: hit.conversionId, label: hit.label, type: "WEBPAGE" },
        });
        if (!action) throw new NotFoundError(`Conversion action ${hit.conversionId}/${hit.label}`);
        await this.sync.sync(tx, action.customerId);
        await this.record(tx, {
          action,
          gclid: hit.gclid!,
          conversionAt: this.clock.now(),
          valueMicros: hit.value !== undefined ? BigInt(Math.round(hit.value * MICROS_PER_UNIT)) : undefined,
          currencyCode: hit.currencyCode,
          orderId: hit.orderId,
          source: "TAG",
        });
      });
      return "RECORDED";
    } catch (error) {
      const apiError = toApiError(error);
      return Object.values(apiError.errorCode)[0] ?? apiError.status;
    }
  }

  /** ConversionUploadService.UploadClickConversions. */
  async upload(customerId: string, body: unknown) {
    const request = uploadSchema.parse(body);
    const results: object[] = [];
    const failures: ApiError[] = [];

    try {
      await this.db.$transaction(async (tx) => {
      if (!(await this.sync.sync(tx, customerId))) throw new NotFoundError(`Customer ${customerId}`);

      for (const [index, conversion] of request.conversions.entries()) {
        await tx.$executeRawUnsafe("SAVEPOINT upload_conversion");
        try {
          const [actionId] = parseResourceName(conversion.conversionAction, customerId, "conversionActions");
          const action = await tx.conversionAction.findFirst({ where: { id: actionId!, customerId } });
          if (!action) throw new NotFoundError(conversion.conversionAction);
          if (action.type !== "UPLOAD_CLICKS") {
            throw new InvalidArgumentError("Only UPLOAD_CLICKS conversion actions accept uploads", {
              conversionUploadError: "INVALID_CONVERSION_ACTION_TYPE",
            });
          }
          await this.record(tx, {
            action,
            gclid: conversion.gclid,
            conversionAt: new Date(conversion.conversionDateTime.replace(" ", "T")),
            valueMicros: conversion.conversionValue !== undefined ? BigInt(Math.round(conversion.conversionValue * MICROS_PER_UNIT)) : undefined,
            currencyCode: conversion.currencyCode,
            orderId: conversion.orderId,
            source: "UPLOAD",
          });
          await tx.$executeRawUnsafe("RELEASE SAVEPOINT upload_conversion");
          results.push({ gclid: conversion.gclid, conversionAction: conversion.conversionAction, conversionDateTime: conversion.conversionDateTime });
        } catch (error) {
          await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT upload_conversion");
          const apiError = toApiError(error);
          apiError.location = { fieldPathElements: [{ fieldName: "conversions", index }] };
          failures.push(apiError);
          results.push({});
        }
      }
      if (request.validateOnly) throw new ValidateOnlyRollback();
      });
    } catch (error) {
      if (!(error instanceof ValidateOnlyRollback)) throw error;
    }

    return {
      results,
      ...(failures.length
        ? { partialFailureError: { code: 3, message: failures.map((f) => f.message).join(", "), details: [{ errors: failures.map(errorDetail) }] } }
        : {}),
    };
  }
}
