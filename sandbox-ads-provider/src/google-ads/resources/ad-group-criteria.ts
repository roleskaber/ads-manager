import { z } from "zod";
import { NotFoundError, PreconditionError } from "../../domain/errors.js";
import { entityStatus, masks, micros, parseUpdateMask } from "../mutate/fields.js";
import type { MutateContext, ResourceHandler } from "../mutate/resource-handler.js";
import { parseResourceName, resourceName } from "../resource-names.js";
import { normalizeKeyword } from "./keyword-rules.js";
import { assertNotRemoved, findAdGroup } from "./lookup.js";

const createSchema = z.object({
  adGroup: z.string(),
  status: entityStatus.default("ENABLED"),
  negative: z.boolean().default(false),
  cpcBidMicros: micros.optional(),
  keyword: z.object({ text: z.string(), matchType: z.enum(["EXACT", "PHRASE", "BROAD"]) }),
});

const updateSchema = z.object({
  resourceName: z.string(),
  status: entityStatus.optional(),
  cpcBidMicros: micros.nullable().optional(),
});

/** Keywords. Text and match type are immutable, like in Google Ads. */
export class AdGroupCriterionHandler implements ResourceHandler {
  readonly collection = "adGroupCriteria";

  async create({ tx, customerId }: MutateContext, payload: unknown) {
    const input = createSchema.parse(payload);
    const adGroup = await findAdGroup(tx, customerId, input.adGroup);
    assertNotRemoved(adGroup, input.adGroup);
    if (adGroup.campaign.advertisingChannelType !== "SEARCH") {
      throw new PreconditionError("Keywords can only be added to search campaigns", { criterionError: "CANNOT_ADD_CRITERIA_TYPE" });
    }
    if (input.negative && input.cpcBidMicros !== undefined) {
      throw new PreconditionError("Negative keywords cannot have bids", { criterionError: "CANNOT_BID_MODIFY_NEGATIVE_CRITERION" });
    }

    const criterion = await tx.adGroupCriterion.create({
      data: {
        adGroupId: adGroup.id,
        keywordText: normalizeKeyword(input.keyword.text),
        matchType: input.keyword.matchType,
        negative: input.negative,
        status: input.status,
        cpcBidMicros: input.cpcBidMicros ?? null,
      },
    });
    return resourceName.adGroupCriterion(customerId, adGroup.id, criterion.id);
  }

  async update({ tx, customerId }: MutateContext, payload: unknown, updateMask: string | undefined) {
    const input = updateSchema.parse(payload);
    const paths = parseUpdateMask(updateMask, ["status", "cpcBidMicros"]);
    const criterion = await this.find({ tx, customerId }, input.resourceName);
    assertNotRemoved(criterion, input.resourceName);
    if (criterion.negative && masks(paths, "cpcBidMicros")) {
      throw new PreconditionError("Negative keywords cannot have bids", { criterionError: "CANNOT_BID_MODIFY_NEGATIVE_CRITERION" });
    }

    await tx.adGroupCriterion.update({
      where: { id: criterion.id },
      data: {
        ...(masks(paths, "status") && input.status ? { status: input.status } : {}),
        ...(masks(paths, "cpcBidMicros") ? { cpcBidMicros: input.cpcBidMicros ?? null } : {}),
      },
    });
    return input.resourceName;
  }

  async remove({ tx, customerId }: MutateContext, name: string) {
    const criterion = await this.find({ tx, customerId }, name);
    await tx.adGroupCriterion.update({ where: { id: criterion.id }, data: { status: "REMOVED" } });
    return name;
  }

  private async find({ tx, customerId }: Pick<MutateContext, "tx" | "customerId">, name: string) {
    const [adGroupId, id] = parseResourceName(name, customerId, this.collection);
    const criterion = await tx.adGroupCriterion.findFirst({
      where: { id: id!, adGroupId: adGroupId!, adGroup: { campaign: { customerId } } },
    });
    if (!criterion) throw new NotFoundError(name);
    return criterion;
  }
}
