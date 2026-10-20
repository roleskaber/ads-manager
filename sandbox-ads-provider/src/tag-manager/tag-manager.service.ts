import { z } from "zod";
import type { Db } from "../db.js";
import type { Clock } from "../domain/clock.js";
import { InvalidArgumentError, NotFoundError } from "../domain/errors.js";
import { addDays, isoDate, parseIsoDate, startOfUtcDay } from "../lib/dates.js";
import { newContainerPublicId } from "../lib/ids.js";
import type { Container, ContainerVersion, Prisma, Tag, TagManagerAccount, Trigger, Variable, Workspace } from "../generated/prisma/client.js";
import { compileWorkspace, type ContainerConfig } from "./compile.js";
import { conditionSchema, parametersSchema } from "./parameters.js";
import { containerSnippet } from "./runtime.js";

const id = z.union([z.string().regex(/^\d+$/), z.number().int()]).transform((value) => BigInt(value));

const accountSchema = z.object({ name: z.string().trim().min(1).max(255) });
const containerSchema = z.object({
  name: z.string().trim().min(1).max(255),
  usageContext: z.array(z.literal("web")).default(["web"]),
  domainName: z.array(z.string()).default([]),
});
const workspaceSchema = z.object({ name: z.string().trim().min(1).max(255), description: z.string().optional() });
const tagSchema = z.object({
  name: z.string().trim().min(1).max(255),
  type: z.string().min(1),
  parameter: parametersSchema,
  firingTriggerId: z.array(id).default([]),
  blockingTriggerId: z.array(id).default([]),
  paused: z.boolean().default(false),
});
const triggerSchema = z.object({
  name: z.string().trim().min(1).max(255),
  type: z.string().min(1),
  filter: z.array(conditionSchema).default([]),
  customEventFilter: z.array(conditionSchema).default([]),
});
const variableSchema = z.object({ name: z.string().trim().min(1).max(255), type: z.string().min(1), parameter: parametersSchema });
const versionSchema = z.object({ name: z.string().trim().max(255).optional(), notes: z.string().optional() });
const statsSchema = z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export type ContainerPath = { accountId: bigint; containerId: bigint };
export type WorkspacePath = ContainerPath & { workspaceId: bigint };
export type EntityKind = "tags" | "triggers" | "variables";

/** Tag Manager API v2: accounts, containers, workspaces, tags/triggers/variables, versions and publishing. */
export class TagManagerService {
  constructor(
    private readonly db: Db,
    private readonly clock: Clock,
    private readonly publicUrl: string,
  ) {}

  // Accounts — GTM accounts are created in the UI; the sandbox exposes creation through the API.

  async createAccount(body: unknown) {
    const account = await this.db.tagManagerAccount.create({ data: accountSchema.parse(body) });
    return presentAccount(account);
  }

  async listAccounts() {
    const accounts = await this.db.tagManagerAccount.findMany({ orderBy: { id: "asc" } });
    return { account: accounts.map(presentAccount) };
  }

  async getAccount(accountId: bigint) {
    return presentAccount(await this.account(accountId));
  }

  // Containers

  async createContainer(accountId: bigint, body: unknown) {
    await this.account(accountId);
    const input = containerSchema.parse(body);
    const container = await this.db.$transaction(async (tx) => {
      const created = await tx.container.create({
        data: { accountId, name: input.name, domainName: input.domainName, publicId: await uniquePublicId(tx) },
      });
      await tx.workspace.create({ data: { containerId: created.id, name: "Default Workspace" } });
      return created;
    });
    return this.presentContainer(container);
  }

  async listContainers(accountId: bigint) {
    await this.account(accountId);
    const containers = await this.db.container.findMany({ where: { accountId }, orderBy: { id: "asc" } });
    return { container: containers.map((c) => this.presentContainer(c)) };
  }

  async getContainer(path: ContainerPath) {
    return this.presentContainer(await this.container(path));
  }

  async updateContainer(path: ContainerPath, body: unknown) {
    await this.container(path);
    const input = containerSchema.partial().parse(body);
    const container = await this.db.container.update({
      where: { id: path.containerId },
      data: { ...(input.name ? { name: input.name } : {}), ...(input.domainName ? { domainName: input.domainName } : {}) },
    });
    return this.presentContainer(container);
  }

  async deleteContainer(path: ContainerPath) {
    await this.container(path);
    await this.db.container.delete({ where: { id: path.containerId } });
  }

  async snippet(path: ContainerPath) {
    const container = await this.container(path);
    return containerSnippet(container.publicId, this.publicUrl);
  }

  /** Daily gtm.js downloads (sandbox addition: GTM itself has no stats). */
  async stats(path: ContainerPath, query: unknown) {
    await this.container(path);
    const { from, to } = statsSchema.parse(query);
    const loads = await this.db.containerLoad.findMany({
      where: { containerId: path.containerId, date: { gte: parseIsoDate(from), lte: parseIsoDate(to) } },
      orderBy: { date: "asc" },
    });
    const byDate = new Map(loads.map((load) => [isoDate(load.date), load.count]));
    const days = [];
    for (let day = parseIsoDate(from); day <= parseIsoDate(to); day = addDays(day, 1)) {
      days.push({ date: isoDate(day), containerLoads: byDate.get(isoDate(day)) ?? 0 });
    }
    return { days, total: days.reduce((sum, day) => sum + day.containerLoads, 0) };
  }

  // Workspaces

  async listWorkspaces(path: ContainerPath) {
    await this.container(path);
    const workspaces = await this.db.workspace.findMany({ where: { containerId: path.containerId }, orderBy: { id: "asc" } });
    return { workspace: workspaces.map((w) => presentWorkspace(path, w)) };
  }

  async createWorkspace(path: ContainerPath, body: unknown) {
    await this.container(path);
    const input = workspaceSchema.parse(body);
    const workspace = await this.db.workspace.create({ data: { containerId: path.containerId, ...input } });
    return presentWorkspace(path, workspace);
  }

  async getWorkspace(path: WorkspacePath) {
    return presentWorkspace(path, await this.workspace(path));
  }

  // Tags, triggers, variables

  async listEntities(path: WorkspacePath, kind: EntityKind) {
    await this.workspace(path);
    const where = { workspaceId: path.workspaceId };
    const orderBy = { id: "asc" } as const;
    switch (kind) {
      case "tags":
        return { tag: (await this.db.tag.findMany({ where, orderBy })).map((t) => presentTag(path, t)) };
      case "triggers":
        return { trigger: (await this.db.trigger.findMany({ where, orderBy })).map((t) => presentTrigger(path, t)) };
      case "variables":
        return { variable: (await this.db.variable.findMany({ where, orderBy })).map((v) => presentVariable(path, v)) };
    }
  }

  async createEntity(path: WorkspacePath, kind: EntityKind, body: unknown) {
    await this.workspace(path);
    const workspaceId = path.workspaceId;
    switch (kind) {
      case "tags": {
        const input = tagSchema.parse(body);
        return presentTag(path, await this.db.tag.create({ data: { workspaceId, ...input, parameter: input.parameter as Prisma.InputJsonValue } }));
      }
      case "triggers": {
        const input = triggerSchema.parse(body);
        return presentTrigger(path, await this.db.trigger.create({ data: { workspaceId, ...input } }));
      }
      case "variables": {
        const input = variableSchema.parse(body);
        return presentVariable(path, await this.db.variable.create({ data: { workspaceId, ...input, parameter: input.parameter as Prisma.InputJsonValue } }));
      }
    }
  }

  async getEntity(path: WorkspacePath, kind: EntityKind, entityId: bigint) {
    await this.workspace(path);
    const entity = await this.findEntity(path.workspaceId, kind, entityId);
    return present(path, kind, entity);
  }

  /** PUT replaces the entity, like GTM's update. */
  async updateEntity(path: WorkspacePath, kind: EntityKind, entityId: bigint, body: unknown) {
    await this.workspace(path);
    await this.findEntity(path.workspaceId, kind, entityId);
    const where = { id: entityId };
    switch (kind) {
      case "tags": {
        const input = tagSchema.parse(body);
        return presentTag(path, await this.db.tag.update({ where, data: { ...input, parameter: input.parameter as Prisma.InputJsonValue } }));
      }
      case "triggers":
        return presentTrigger(path, await this.db.trigger.update({ where, data: triggerSchema.parse(body) }));
      case "variables": {
        const input = variableSchema.parse(body);
        return presentVariable(path, await this.db.variable.update({ where, data: { ...input, parameter: input.parameter as Prisma.InputJsonValue } }));
      }
    }
  }

  async deleteEntity(path: WorkspacePath, kind: EntityKind, entityId: bigint) {
    await this.workspace(path);
    await this.findEntity(path.workspaceId, kind, entityId);
    if (kind === "triggers") {
      const used = await this.db.tag.count({
        where: { workspaceId: path.workspaceId, OR: [{ firingTriggerId: { has: entityId } }, { blockingTriggerId: { has: entityId } }] },
      });
      if (used) throw new InvalidArgumentError("The trigger is used by tags", { tagManagerError: "TRIGGER_IN_USE" });
    }
    const where = { id: entityId };
    if (kind === "tags") await this.db.tag.delete({ where });
    if (kind === "triggers") await this.db.trigger.delete({ where });
    if (kind === "variables") await this.db.variable.delete({ where });
  }

  // Versions

  /** workspaces/{id}:create_version — compiles the workspace into an immutable version. */
  async createVersion(path: WorkspacePath, body: unknown) {
    await this.workspace(path);
    const input = versionSchema.parse(body ?? {});
    const where = { workspaceId: path.workspaceId };
    const [tags, triggers, variables] = await Promise.all([
      this.db.tag.findMany({ where }),
      this.db.trigger.findMany({ where }),
      this.db.variable.findMany({ where }),
    ]);
    const compiled = compileWorkspace(tags, triggers, variables);
    if (!compiled.ok) {
      throw new InvalidArgumentError(`The workspace has compiler errors: ${compiled.errors.join("; ")}`, { tagManagerError: "COMPILER_ERROR" });
    }
    const version = await this.db.containerVersion.create({
      data: {
        containerId: path.containerId,
        name: input.name || `Version ${isoDate(this.clock.now())}`,
        description: input.notes ?? null,
        config: compiled.config as unknown as Prisma.InputJsonValue,
      },
    });
    return { containerVersion: presentVersion(path, version), compilerError: false };
  }

  async listVersions(path: ContainerPath) {
    const container = await this.container(path);
    const versions = await this.db.containerVersion.findMany({ where: { containerId: path.containerId }, orderBy: { id: "desc" } });
    return {
      containerVersionHeader: versions.map((v) => ({
        path: `${containerPath(path)}/versions/${v.id}`,
        accountId: String(path.accountId),
        containerId: String(path.containerId),
        containerVersionId: String(v.id),
        name: v.name,
        live: v.id === container.liveVersionId,
      })),
    };
  }

  async getVersion(path: ContainerPath, versionId: bigint) {
    await this.container(path);
    return presentVersion(path, await this.version(path, versionId));
  }

  async liveVersion(path: ContainerPath) {
    const container = await this.container(path);
    if (!container.liveVersionId) throw new NotFoundError("Live version");
    return presentVersion(path, await this.version(path, container.liveVersionId));
  }

  async publish(path: ContainerPath, versionId: bigint) {
    await this.container(path);
    const version = await this.version(path, versionId);
    await this.db.container.update({ where: { id: path.containerId }, data: { liveVersionId: version.id } });
    return { containerVersion: presentVersion(path, version), compilerError: false };
  }

  // Public runtime

  /** Live config for gtm.js; counts the download. */
  async loadLiveConfig(publicId: string): Promise<ContainerConfig | null> {
    const container = await this.db.container.findUnique({ where: { publicId }, include: { liveVersion: true } });
    if (!container?.liveVersion) return null;
    const date = startOfUtcDay(this.clock.now());
    await this.db.containerLoad.upsert({
      where: { containerId_date: { containerId: container.id, date } },
      create: { containerId: container.id, date, count: 1 },
      update: { count: { increment: 1 } },
    });
    return container.liveVersion.config as unknown as ContainerConfig;
  }

  // Lookups

  private async account(accountId: bigint) {
    const account = await this.db.tagManagerAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundError(`accounts/${accountId}`);
    return account;
  }

  private async container(path: ContainerPath) {
    const container = await this.db.container.findFirst({ where: { id: path.containerId, accountId: path.accountId } });
    if (!container) throw new NotFoundError(containerPath(path));
    return container;
  }

  private async workspace(path: WorkspacePath) {
    await this.container(path);
    const workspace = await this.db.workspace.findFirst({ where: { id: path.workspaceId, containerId: path.containerId } });
    if (!workspace) throw new NotFoundError(`${containerPath(path)}/workspaces/${path.workspaceId}`);
    return workspace;
  }

  private async version(path: ContainerPath, versionId: bigint) {
    const version = await this.db.containerVersion.findFirst({ where: { id: versionId, containerId: path.containerId } });
    if (!version) throw new NotFoundError(`${containerPath(path)}/versions/${versionId}`);
    return version;
  }

  private async findEntity(workspaceId: bigint, kind: EntityKind, entityId: bigint): Promise<Tag | Trigger | Variable> {
    const where = { id: entityId, workspaceId };
    const entity =
      kind === "tags"
        ? await this.db.tag.findFirst({ where })
        : kind === "triggers"
          ? await this.db.trigger.findFirst({ where })
          : await this.db.variable.findFirst({ where });
    if (!entity) throw new NotFoundError(`${kind}/${entityId}`);
    return entity;
  }

  private presentContainer(container: Container) {
    const path = { accountId: container.accountId, containerId: container.id };
    return {
      path: containerPath(path),
      accountId: String(container.accountId),
      containerId: String(container.id),
      name: container.name,
      publicId: container.publicId,
      usageContext: ["web"],
      domainName: container.domainName,
      ...(container.liveVersionId ? { liveVersionId: String(container.liveVersionId) } : {}),
      tagManagerUrl: `${this.publicUrl}/tagmanager/v2/${containerPath(path)}`,
    };
  }
}

async function uniquePublicId(tx: Prisma.TransactionClient): Promise<string> {
  for (;;) {
    const publicId = newContainerPublicId();
    if (!(await tx.container.findUnique({ where: { publicId } }))) return publicId;
  }
}

function containerPath({ accountId, containerId }: ContainerPath) {
  return `accounts/${accountId}/containers/${containerId}`;
}

function workspacePath(path: WorkspacePath) {
  return `${containerPath(path)}/workspaces/${path.workspaceId}`;
}

function ids(path: WorkspacePath) {
  return { accountId: String(path.accountId), containerId: String(path.containerId), workspaceId: String(path.workspaceId) };
}

function presentAccount(account: TagManagerAccount) {
  return { path: `accounts/${account.id}`, accountId: String(account.id), name: account.name };
}

function presentWorkspace(path: ContainerPath, workspace: Workspace) {
  const full = { ...path, workspaceId: workspace.id };
  return { path: workspacePath(full), ...ids(full), name: workspace.name, description: workspace.description ?? undefined };
}

function presentTag(path: WorkspacePath, tag: Tag) {
  return {
    path: `${workspacePath(path)}/tags/${tag.id}`,
    ...ids(path),
    tagId: String(tag.id),
    name: tag.name,
    type: tag.type,
    parameter: tag.parameter,
    firingTriggerId: tag.firingTriggerId.map(String),
    blockingTriggerId: tag.blockingTriggerId.map(String),
    paused: tag.paused,
    fingerprint: String(tag.updatedAt.getTime()),
  };
}

function presentTrigger(path: WorkspacePath, trigger: Trigger) {
  return {
    path: `${workspacePath(path)}/triggers/${trigger.id}`,
    ...ids(path),
    triggerId: String(trigger.id),
    name: trigger.name,
    type: trigger.type,
    filter: trigger.filter,
    customEventFilter: trigger.customEventFilter,
    fingerprint: String(trigger.updatedAt.getTime()),
  };
}

function presentVariable(path: WorkspacePath, variable: Variable) {
  return {
    path: `${workspacePath(path)}/variables/${variable.id}`,
    ...ids(path),
    variableId: String(variable.id),
    name: variable.name,
    type: variable.type,
    parameter: variable.parameter,
    fingerprint: String(variable.updatedAt.getTime()),
  };
}

function present(path: WorkspacePath, kind: EntityKind, entity: Tag | Trigger | Variable) {
  if (kind === "tags") return presentTag(path, entity as Tag);
  if (kind === "triggers") return presentTrigger(path, entity as Trigger);
  return presentVariable(path, entity as Variable);
}

function presentVersion(path: ContainerPath, version: ContainerVersion) {
  const config = version.config as unknown as ContainerConfig;
  return {
    path: `${containerPath(path)}/versions/${version.id}`,
    accountId: String(path.accountId),
    containerId: String(path.containerId),
    containerVersionId: String(version.id),
    name: version.name,
    description: version.description ?? undefined,
    tag: config.tags,
    trigger: config.triggers,
    variable: config.variables,
  };
}
