import { z } from "zod";
import { NotFoundError } from "../../domain/errors.js";
import type { Tx } from "../delivery/account-sync.js";
import { entityStatus, parseUpdateMask } from "../mutate/fields.js";
import type { MutateContext, ResourceHandler } from "../mutate/resource-handler.js";
import { parseResourceName, resourceName } from "../resource-names.js";
import { adColumns, adSchema, resubmission } from "./ad-content.js";
import { assertNotRemoved, findAdGroup } from "./lookup.js";

const createSchema = z.object({ adGroup: z.string(), status: entityStatus.default("ENABLED"), ad: adSchema });
const updateSchema = z.object({ resourceName: z.string(), status: entityStatus });

/** The ad's place in an ad group. Only status changes here; content is edited through `ads`. */
export class AdGroupAdHandler implements ResourceHandler {
  readonly collection = "adGroupAds";

  async create({ tx, customerId, now }: MutateContext, payload: unknown) {
    const input = createSchema.parse(payload);
    const adGroup = await findAdGroup(tx, customerId, input.adGroup);
    assertNotRemoved(adGroup, input.adGroup);

    const ad = await tx.adGroupAd.create({
      data: { adGroupId: adGroup.id, status: input.status, ...adColumns(input.ad), ...resubmission(now) },
    });
    return resourceName.adGroupAd(customerId, adGroup.id, ad.id);
  }

  async update({ tx, customerId }: MutateContext, payload: unknown, updateMask: string | undefined) {
    const input = updateSchema.parse(payload);
    parseUpdateMask(updateMask, ["status"]);
    const ad = await findAdGroupAd(tx, customerId, input.resourceName);
    assertNotRemoved(ad, input.resourceName);
    await tx.adGroupAd.update({ where: { id: ad.id }, data: { status: input.status } });
    return input.resourceName;
  }

  async remove({ tx, customerId }: MutateContext, name: string) {
    const ad = await findAdGroupAd(tx, customerId, name);
    await tx.adGroupAd.update({ where: { id: ad.id }, data: { status: "REMOVED" } });
    return name;
  }
}

async function findAdGroupAd(tx: Tx, customerId: string, name: string) {
  const [adGroupId, adId] = parseResourceName(name, customerId, "adGroupAds");
  const ad = await tx.adGroupAd.findFirst({ where: { id: adId!, adGroupId: adGroupId!, adGroup: { campaign: { customerId } } } });
  if (!ad) throw new NotFoundError(name);
  return ad;
}
