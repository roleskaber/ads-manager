import { z } from "zod";
import { InvalidArgumentError, NotFoundError } from "../../domain/errors.js";
import { geoTargetId } from "../../domain/geo-targets.js";
import type { MutateContext, ResourceHandler } from "../mutate/resource-handler.js";
import { parseResourceName, resourceName } from "../resource-names.js";
import { assertNotRemoved, findCampaign } from "./lookup.js";

const createSchema = z.object({
  campaign: z.string(),
  negative: z.boolean().default(false),
  location: z.object({ geoTargetConstant: z.string() }),
});

/** Location targeting. Criteria are immutable: change them by remove + create. */
export class CampaignCriterionHandler implements ResourceHandler {
  readonly collection = "campaignCriteria";

  async create({ tx, customerId }: MutateContext, payload: unknown) {
    const input = createSchema.parse(payload);
    const campaign = await findCampaign(tx, customerId, input.campaign);
    assertNotRemoved(campaign, input.campaign);
    if (!geoTargetId(input.location.geoTargetConstant)) {
      throw new InvalidArgumentError(`Unknown geo target ${input.location.geoTargetConstant}`, { criterionError: "INVALID_GEO_TARGET_CONSTANT" });
    }
    const criterion = await tx.campaignCriterion.create({
      data: { campaignId: campaign.id, geoTargetConstant: input.location.geoTargetConstant, negative: input.negative },
    });
    return resourceName.campaignCriterion(customerId, campaign.id, criterion.id);
  }

  async remove({ tx, customerId }: MutateContext, name: string) {
    const [campaignId, id] = parseResourceName(name, customerId, this.collection);
    const criterion = await tx.campaignCriterion.findFirst({ where: { id: id!, campaignId: campaignId!, campaign: { customerId } } });
    if (!criterion) throw new NotFoundError(name);
    await tx.campaignCriterion.delete({ where: { id: criterion.id } });
    return name;
  }
}
