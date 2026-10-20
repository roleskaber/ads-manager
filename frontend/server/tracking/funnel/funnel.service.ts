import type { Actor } from "@/server/team/team-policy";
import { TeamError } from "@/server/team/team-error";
import { computeFunnel, type FunnelGroupBy } from "./compute-funnel";
import type { FunnelDefinition, FunnelRepository } from "./funnel.repository";

export type ReportQuery = { from: Date; to: Date; groupBy: FunnelGroupBy };

const canEdit = (actor: Actor) => actor.role === "OWNER" || actor.role === "ADMIN" || actor.role === "MEMBER";

export class FunnelService {
  constructor(private readonly funnels: FunnelRepository) {}

  list(actor: Actor) {
    return this.funnels.listByCompany(actor.companyId);
  }

  async create(actor: Actor, input: { name: string; steps: string[]; conversionWindowDays: number }) {
    if (!canEdit(actor)) throw new TeamError("forbidden");
    return this.funnels.create({ companyId: actor.companyId, ...input });
  }

  async report(actor: Actor, funnelId: string, query: ReportQuery) {
    const funnel = await this.load(actor, funnelId);
    // Late steps can happen up to the conversion window after the period ends.
    const eventsUntil = new Date(query.to.getTime() + funnel.conversionWindowDays * 24 * 60 * 60 * 1000);
    const events = await this.funnels.findEvents(actor.companyId, funnel.steps, query.from, eventsUntil);
    const entered = events.filter((event) => event.name !== funnel.steps[0] || event.occurredAt <= query.to);

    return {
      funnel,
      period: { from: query.from, to: query.to },
      groupBy: query.groupBy,
      ...computeFunnel(funnel.steps, entered, query.groupBy, funnel.conversionWindowDays),
    };
  }

  private async load(actor: Actor, funnelId: string): Promise<FunnelDefinition> {
    const funnel = await this.funnels.findById(funnelId);
    if (!funnel || funnel.companyId !== actor.companyId) throw new TeamError("notFound");
    return funnel;
  }
}
