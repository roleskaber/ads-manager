import { z } from "zod";
import { InvalidArgumentError, NotFoundError } from "../../domain/errors.js";
import type { Tx } from "../delivery/account-sync.js";
import { entityStatus, masks, micros, parseUpdateMask } from "../mutate/fields.js";
import type { MutateContext, ResourceHandler } from "../mutate/resource-handler.js";
import { parseResourceName, resourceName } from "../resource-names.js";
import { assertNotRemoved, findAdGroup, findCampaign } from "./lookup.js";

const DEFAULT_CPC_BID_MICROS = 1_000_000n;

const createSchema = z.object({
  campaign: z.string(),
  name: z.string().trim().min(1).max(255),
  status: entityStatus.default("ENABLED"),
  cpcBidMicros: micros.optional(),
});

const updateSchema = z.object({
  resourceName: z.string(),
  name: z.string().trim().min(1).max(255).optional(),
  status: entityStatus.optional(),
  cpcBidMicros: micros.optional(),
});

export class AdGroupHandler implements ResourceHandler {
  readonly collection = "adGroups";

  async create({ tx, customerId }: MutateContext, payload: unknown) {
    const input = createSchema.parse(payload);
    const campaign = await findCampaign(tx, customerId, input.campaign);
    assertNotRemoved(campaign, input.campaign);
    await assertUniqueName(tx, campaign.id, input.name);

    const adGroup = await tx.adGroup.create({
      data: {
        campaignId: campaign.id,
        name: input.name,
        status: input.status,
        cpcBidMicros: input.cpcBidMicros ?? DEFAULT_CPC_BID_MICROS,
      },
    });
    return resourceName.adGroup(customerId, adGroup.id);
  }

  async update({ tx, customerId }: MutateContext, payload: unknown, updateMask: string | undefined) {
    const input = updateSchema.parse(payload);
    const paths = parseUpdateMask(updateMask, ["name", "status", "cpcBidMicros"]);
    const adGroup = await findAdGroup(tx, customerId, input.resourceName);
    assertNotRemoved(adGroup, input.resourceName);
    assertNotRemoved(adGroup.campaign, "The campaign");

    if (masks(paths, "name") && input.name && input.name !== adGroup.name) await assertUniqueName(tx, adGroup.campaignId, input.name);
    await tx.adGroup.update({
      where: { id: adGroup.id },
      data: {
        ...(masks(paths, "name") && input.name ? { name: input.name } : {}),
        ...(masks(paths, "status") && input.status ? { status: input.status } : {}),
        ...(masks(paths, "cpcBidMicros") && input.cpcBidMicros !== undefined ? { cpcBidMicros: input.cpcBidMicros } : {}),
      },
    });
    return input.resourceName;
  }

  async remove({ tx, customerId }: MutateContext, name: string) {
    const [id] = parseResourceName(name, customerId, this.collection);
    const adGroup = await tx.adGroup.findFirst({ where: { id: id!, campaign: { customerId } } });
    if (!adGroup) throw new NotFoundError(name);
    await tx.adGroup.update({ where: { id: adGroup.id }, data: { status: "REMOVED" } });
    return name;
  }
}

async function assertUniqueName(tx: Tx, campaignId: bigint, name: string) {
  const taken = await tx.adGroup.count({ where: { campaignId, name, status: { not: "REMOVED" } } });
  if (taken) throw new InvalidArgumentError(`Ad group name "${name}" is already used in the campaign`, { adGroupError: "DUPLICATE_ADGROUP_NAME" });
}
