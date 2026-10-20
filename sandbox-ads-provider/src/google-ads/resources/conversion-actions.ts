import { z } from "zod";
import { InvalidArgumentError, NotFoundError } from "../../domain/errors.js";
import { MICROS_PER_UNIT } from "../../domain/money.js";
import { newConversionLabel } from "../../lib/ids.js";
import type { Tx } from "../delivery/account-sync.js";
import { entityStatus, masks, parseUpdateMask } from "../mutate/fields.js";
import type { MutateContext, ResourceHandler } from "../mutate/resource-handler.js";
import { parseResourceName, resourceName } from "../resource-names.js";
import { assertNotRemoved } from "./lookup.js";

const category = z.enum(["DEFAULT", "PAGE_VIEW", "PURCHASE", "SIGNUP", "SUBMIT_LEAD_FORM", "CONTACT", "BOOK_APPOINTMENT"]);
const countingType = z.enum(["ONE_PER_CLICK", "MANY_PER_CLICK"]);
const valueSettings = z.object({
  defaultValue: z.number().nonnegative().optional(),
  defaultCurrencyCode: z.string().length(3).toUpperCase().optional(),
  alwaysUseDefaultValue: z.boolean().optional(),
});
const lookback = z.number().int().min(1).max(90);

const createSchema = z.object({
  name: z.string().trim().min(1).max(255),
  type: z.enum(["WEBPAGE", "UPLOAD_CLICKS"]),
  category: category.default("DEFAULT"),
  status: entityStatus.default("ENABLED"),
  countingType: countingType.default("ONE_PER_CLICK"),
  valueSettings: valueSettings.default({}),
  clickThroughLookbackWindowDays: lookback.default(30),
});

const updateSchema = z.object({
  resourceName: z.string(),
  name: z.string().trim().min(1).max(255).optional(),
  category: category.optional(),
  status: entityStatus.optional(),
  countingType: countingType.optional(),
  valueSettings: valueSettings.optional(),
  clickThroughLookbackWindowDays: lookback.optional(),
});

const UPDATABLE = ["name", "category", "status", "countingType", "valueSettings", "clickThroughLookbackWindowDays"] as const;

export class ConversionActionHandler implements ResourceHandler {
  readonly collection = "conversionActions";

  async create({ tx, customerId }: MutateContext, payload: unknown) {
    const input = createSchema.parse(payload);
    await assertUniqueName(tx, customerId, input.name);
    const action = await tx.conversionAction.create({
      data: {
        customerId,
        name: input.name,
        type: input.type,
        category: input.category,
        status: input.status,
        label: newConversionLabel(),
        countingType: input.countingType,
        clickThroughLookbackWindowDays: input.clickThroughLookbackWindowDays,
        ...valueColumns(input.valueSettings),
      },
    });
    return resourceName.conversionAction(customerId, action.id);
  }

  async update({ tx, customerId }: MutateContext, payload: unknown, updateMask: string | undefined) {
    const input = updateSchema.parse(payload);
    const paths = parseUpdateMask(updateMask, UPDATABLE);
    const action = await this.find(tx, customerId, input.resourceName);
    assertNotRemoved(action, input.resourceName);
    if (masks(paths, "name") && input.name && input.name !== action.name) await assertUniqueName(tx, customerId, input.name);

    const pick = <K extends keyof typeof input>(key: K) => (masks(paths, key) && input[key] !== undefined ? { [key]: input[key] } : {});
    await tx.conversionAction.update({
      where: { id: action.id },
      data: {
        ...pick("name"),
        ...pick("category"),
        ...pick("status"),
        ...pick("countingType"),
        ...pick("clickThroughLookbackWindowDays"),
        ...(masks(paths, "valueSettings") && input.valueSettings ? valueColumns(input.valueSettings) : {}),
      },
    });
    return input.resourceName;
  }

  async remove({ tx, customerId }: MutateContext, name: string) {
    const action = await this.find(tx, customerId, name);
    await tx.conversionAction.update({ where: { id: action.id }, data: { status: "REMOVED" } });
    return name;
  }

  private async find(tx: Tx, customerId: string, name: string) {
    const [id] = parseResourceName(name, customerId, this.collection);
    const action = await tx.conversionAction.findFirst({ where: { id: id!, customerId } });
    if (!action) throw new NotFoundError(name);
    return action;
  }
}

function valueColumns(settings: z.infer<typeof valueSettings>) {
  return {
    ...(settings.defaultValue !== undefined ? { defaultValueMicros: BigInt(Math.round(settings.defaultValue * MICROS_PER_UNIT)) } : {}),
    ...(settings.defaultCurrencyCode ? { defaultCurrencyCode: settings.defaultCurrencyCode } : {}),
    ...(settings.alwaysUseDefaultValue !== undefined ? { alwaysUseDefaultValue: settings.alwaysUseDefaultValue } : {}),
  };
}

async function assertUniqueName(tx: Tx, customerId: string, name: string) {
  const taken = await tx.conversionAction.count({ where: { customerId, name, status: { not: "REMOVED" } } });
  if (taken) throw new InvalidArgumentError(`Conversion action "${name}" already exists`, { conversionActionError: "DUPLICATE_NAME" });
}
