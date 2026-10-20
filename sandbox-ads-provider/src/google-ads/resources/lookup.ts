import { NotFoundError, PreconditionError } from "../../domain/errors.js";
import type { Tx } from "../delivery/account-sync.js";
import { parseResourceName } from "../resource-names.js";

/** Loaders that resolve a resource name and make sure it belongs to the customer. */

export async function findCampaign(tx: Tx, customerId: string, name: string) {
  const [id] = parseResourceName(name, customerId, "campaigns");
  const campaign = await tx.campaign.findFirst({ where: { id: id!, customerId } });
  if (!campaign) throw new NotFoundError(name);
  return campaign;
}

export async function findAdGroup(tx: Tx, customerId: string, name: string) {
  const [id] = parseResourceName(name, customerId, "adGroups");
  const adGroup = await tx.adGroup.findFirst({ where: { id: id!, campaign: { customerId } }, include: { campaign: true } });
  if (!adGroup) throw new NotFoundError(name);
  return adGroup;
}

export function assertNotRemoved(entity: { status: string }, name: string) {
  if (entity.status === "REMOVED") {
    throw new PreconditionError(`${name} is removed and cannot be changed`, {
      mutateError: "OPERATION_NOT_PERMITTED_FOR_REMOVED_RESOURCE",
    });
  }
}
