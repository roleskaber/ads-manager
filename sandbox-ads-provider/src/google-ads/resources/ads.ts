import { z } from "zod";
import { NotFoundError } from "../../domain/errors.js";
import { masks, parseUpdateMask } from "../mutate/fields.js";
import type { MutateContext, ResourceHandler } from "../mutate/resource-handler.js";
import { parseResourceName } from "../resource-names.js";
import { adColumns, adSchema, resubmission } from "./ad-content.js";
import { assertNotRemoved } from "./lookup.js";

const updateSchema = adSchema.partial().extend({ resourceName: z.string() });

/** Ad content edits (AdService). Any content change sends the ad back to policy review. */
export class AdHandler implements ResourceHandler {
  readonly collection = "ads";

  async update({ tx, customerId, now }: MutateContext, payload: unknown, updateMask: string | undefined) {
    const input = updateSchema.parse(payload);
    const paths = parseUpdateMask(updateMask, ["finalUrls", "responsiveSearchAd"]);
    const [adId] = parseResourceName(input.resourceName, customerId, this.collection);
    const ad = await tx.adGroupAd.findFirst({ where: { id: adId!, adGroup: { campaign: { customerId } } } });
    if (!ad) throw new NotFoundError(input.resourceName);
    assertNotRemoved(ad, input.resourceName);

    // Untouched parts of the ad keep their current values.
    const merged = adSchema.parse({
      finalUrls: masks(paths, "finalUrls") ? input.finalUrls : ad.finalUrls,
      responsiveSearchAd: masks(paths, "responsiveSearchAd")
        ? input.responsiveSearchAd
        : {
            headlines: ad.headlines.map((text) => ({ text })),
            descriptions: ad.descriptions.map((text) => ({ text })),
            path1: ad.path1 ?? undefined,
            path2: ad.path2 ?? undefined,
          },
    });

    await tx.adGroupAd.update({ where: { id: ad.id }, data: { ...adColumns(merged), ...resubmission(now) } });
    return input.resourceName;
  }
}
