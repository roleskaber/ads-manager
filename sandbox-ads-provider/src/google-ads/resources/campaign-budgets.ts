import { z } from "zod";
import { InvalidArgumentError, NotFoundError, PreconditionError } from "../../domain/errors.js";
import { MICROS_PER_UNIT } from "../../domain/money.js";
import { masks, micros, parseUpdateMask } from "../mutate/fields.js";
import type { Tx } from "../delivery/account-sync.js";
import type { MutateContext, ResourceHandler } from "../mutate/resource-handler.js";
import { parseResourceName, resourceName } from "../resource-names.js";
import { assertNotRemoved } from "./lookup.js";

const amount = micros.refine((value) => value >= BigInt(MICROS_PER_UNIT), "must be at least one currency unit");

const createSchema = z.object({
  name: z.string().trim().min(1).max(255),
  amountMicros: amount,
  deliveryMethod: z.enum(["STANDARD"]).default("STANDARD"),
  explicitlyShared: z.boolean().default(false),
});

const updateSchema = z.object({
  resourceName: z.string(),
  name: z.string().trim().min(1).max(255).optional(),
  amountMicros: amount.optional(),
});

export class CampaignBudgetHandler implements ResourceHandler {
  readonly collection = "campaignBudgets";

  async create({ tx, customerId }: MutateContext, payload: unknown) {
    const input = createSchema.parse(payload);
    if (input.explicitlyShared) {
      throw new InvalidArgumentError("Shared budgets are not supported by the sandbox", { campaignBudgetError: "CANNOT_USE_SHARED_BUDGET" });
    }
    const budget = await tx.campaignBudget.create({ data: { customerId, name: input.name, amountMicros: input.amountMicros } });
    return resourceName.campaignBudget(customerId, budget.id);
  }

  async update({ tx, customerId }: MutateContext, payload: unknown, updateMask: string | undefined) {
    const input = updateSchema.parse(payload);
    const paths = parseUpdateMask(updateMask, ["name", "amountMicros"]);
    const budget = await this.find(tx, customerId, input.resourceName);
    assertNotRemoved(budget, input.resourceName);

    await tx.campaignBudget.update({
      where: { id: budget.id },
      data: {
        ...(masks(paths, "name") && input.name ? { name: input.name } : {}),
        ...(masks(paths, "amountMicros") && input.amountMicros ? { amountMicros: input.amountMicros } : {}),
      },
    });
    return input.resourceName;
  }

  async remove({ tx, customerId }: MutateContext, name: string) {
    const budget = await this.find(tx, customerId, name);
    const campaign = await tx.campaign.findUnique({ where: { campaignBudgetId: budget.id } });
    if (campaign && campaign.status !== "REMOVED") {
      throw new PreconditionError("Budget is used by a campaign", { campaignBudgetError: "CAMPAIGN_BUDGET_IN_USE" });
    }
    await tx.campaignBudget.update({ where: { id: budget.id }, data: { status: "REMOVED" } });
    return name;
  }

  private async find(tx: Tx, customerId: string, name: string) {
    const [id] = parseResourceName(name, customerId, this.collection);
    const budget = await tx.campaignBudget.findFirst({ where: { id: id!, customerId } });
    if (!budget) throw new NotFoundError(name);
    return budget;
  }
}
