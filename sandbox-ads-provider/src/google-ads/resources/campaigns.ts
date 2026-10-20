import { z } from "zod";
import { InvalidArgumentError, NotFoundError, PreconditionError } from "../../domain/errors.js";
import { startOfUtcDay } from "../../lib/dates.js";
import type { Tx } from "../delivery/account-sync.js";
import { entityStatus, isoDate, masks, micros, parseUpdateMask } from "../mutate/fields.js";
import type { MutateContext, ResourceHandler } from "../mutate/resource-handler.js";
import { parseResourceName, resourceName } from "../resource-names.js";
import { assertConversionTracking, assertFlight, resolveBidding, type BiddingInput } from "./campaign-rules.js";
import { assertNotRemoved, findCampaign } from "./lookup.js";

const bidding = {
  manualCpc: z.object({ enhancedCpcEnabled: z.boolean().optional() }).optional(),
  maximizeClicks: z.object({}).passthrough().optional(),
  maximizeConversions: z.object({ targetCpaMicros: micros.optional() }).optional(),
  targetCpa: z.object({ targetCpaMicros: micros.optional() }).optional(),
};

const createSchema = z.object({
  name: z.string().trim().min(1).max(255),
  status: entityStatus.default("PAUSED"),
  advertisingChannelType: z.enum(["SEARCH", "DISPLAY", "SHOPPING", "VIDEO"]),
  campaignBudget: z.string(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  ...bidding,
});

const updateSchema = z.object({
  resourceName: z.string(),
  name: z.string().trim().min(1).max(255).optional(),
  status: entityStatus.optional(),
  campaignBudget: z.string().optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.nullable().optional(),
  ...bidding,
});

const UPDATABLE = ["name", "status", "campaignBudget", "startDate", "endDate", "manualCpc", "maximizeClicks", "maximizeConversions", "targetCpa"] as const;

export class CampaignHandler implements ResourceHandler {
  readonly collection = "campaigns";

  async create({ tx, customerId, now }: MutateContext, payload: unknown) {
    const input = createSchema.parse(payload);
    const strategy = resolveBidding(input as BiddingInput);
    if (!strategy) throw new InvalidArgumentError("A bidding strategy is required", { campaignError: "MISSING_BIDDING_STRATEGY" });
    assertConversionTracking(strategy, await enabledConversionActions(tx, customerId));

    const today = startOfUtcDay(now);
    const flight = { startDate: input.startDate ?? today, endDate: input.endDate ?? null };
    assertFlight(flight, today);
    await assertUniqueName(tx, customerId, input.name);
    const budgetId = await claimBudget(tx, customerId, input.campaignBudget);

    const campaign = await tx.campaign.create({
      data: {
        customerId,
        campaignBudgetId: budgetId,
        name: input.name,
        status: input.status,
        advertisingChannelType: input.advertisingChannelType,
        biddingStrategyType: strategy.type,
        targetCpaMicros: strategy.targetCpaMicros,
        ...flight,
        accruedAt: now,
      },
    });
    return resourceName.campaign(customerId, campaign.id);
  }

  async update({ tx, customerId, now }: MutateContext, payload: unknown, updateMask: string | undefined) {
    const input = updateSchema.parse(payload);
    const paths = parseUpdateMask(updateMask, UPDATABLE);
    const campaign = await findCampaign(tx, customerId, input.resourceName);
    assertNotRemoved(campaign, input.resourceName);

    const data: Parameters<Tx["campaign"]["update"]>[0]["data"] = {};

    if (masks(paths, "name") && input.name && input.name !== campaign.name) {
      await assertUniqueName(tx, customerId, input.name);
      data.name = input.name;
    }
    if (masks(paths, "status") && input.status) data.status = input.status;
    if (masks(paths, "campaignBudget") && input.campaignBudget) {
      data.budget = { connect: { id: await claimBudget(tx, customerId, input.campaignBudget) } };
    }

    if (masks(paths, "startDate") || masks(paths, "endDate")) {
      const next = {
        startDate: masks(paths, "startDate") && input.startDate ? input.startDate : campaign.startDate,
        endDate: masks(paths, "endDate") ? (input.endDate ?? null) : campaign.endDate,
      };
      assertFlight(next, startOfUtcDay(now), { startDate: campaign.startDate, endDate: campaign.endDate });
      Object.assign(data, next);
    }

    const strategy = resolveBidding(Object.fromEntries(Object.entries(input).filter(([key]) => masks(paths, key))) as BiddingInput);
    if (strategy) {
      assertConversionTracking(strategy, await enabledConversionActions(tx, customerId));
      data.biddingStrategyType = strategy.type;
      data.targetCpaMicros = strategy.targetCpaMicros;
    }

    await tx.campaign.update({ where: { id: campaign.id }, data });
    return input.resourceName;
  }

  async remove({ tx, customerId }: MutateContext, name: string) {
    const campaign = await findCampaign(tx, customerId, name);
    assertNotRemoved(campaign, name);
    await tx.campaign.update({ where: { id: campaign.id }, data: { status: "REMOVED" } });
    return name;
  }
}

async function enabledConversionActions(tx: Tx, customerId: string) {
  return tx.conversionAction.count({ where: { customerId, status: "ENABLED" } });
}

async function assertUniqueName(tx: Tx, customerId: string, name: string) {
  const taken = await tx.campaign.count({ where: { customerId, name, status: { not: "REMOVED" } } });
  if (taken) throw new InvalidArgumentError(`Campaign name "${name}" is already used`, { campaignError: "DUPLICATE_CAMPAIGN_NAME" });
}

/** Non-shared budgets serve exactly one campaign. */
async function claimBudget(tx: Tx, customerId: string, name: string): Promise<bigint> {
  const [id] = parseResourceName(name, customerId, "campaignBudgets");
  const budget = await tx.campaignBudget.findFirst({ where: { id: id!, customerId }, include: { campaign: true } });
  if (!budget) throw new NotFoundError(name);
  if (budget.status === "REMOVED") {
    throw new PreconditionError("The budget is removed", { campaignBudgetError: "CAMPAIGN_BUDGET_REMOVED" });
  }
  if (budget.campaign) {
    throw new PreconditionError("A non-shared budget can only be used by one campaign", {
      campaignBudgetError: "CANNOT_USE_SHARED_BUDGET",
    });
  }
  return budget.id;
}
