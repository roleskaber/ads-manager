import type { TrackingRepository, VisitorRecord } from "./tracking.repository";

export type VisitorIdentity = { anonymousId?: string; userId?: string };

/**
 * Stitches identities into one visitor:
 * - browser events carry an anonymousId (and a userId after login/lead form → "identify");
 * - CRM / backend events usually carry only the userId, so we find the browser visitor by it.
 */
export class VisitorResolver {
  constructor(private readonly repository: TrackingRepository) {}

  async resolve(companyId: string, { anonymousId, userId }: VisitorIdentity, seenAt: Date): Promise<VisitorRecord> {
    if (anonymousId) {
      const existing = await this.repository.findVisitorByAnonymousId(companyId, anonymousId);
      if (!existing) return this.repository.createVisitor(companyId, anonymousId, userId ?? null, seenAt);

      const identify = userId && existing.externalId !== userId ? userId : undefined;
      await this.repository.touchVisitor(existing.id, seenAt, identify);
      return { ...existing, externalId: identify ?? existing.externalId };
    }

    const known = userId ? await this.repository.findVisitorByExternalId(companyId, userId) : null;
    if (known) {
      await this.repository.touchVisitor(known.id, seenAt);
      return known;
    }
    return this.repository.createVisitor(companyId, `uid:${userId}`, userId ?? null, seenAt);
  }
}
