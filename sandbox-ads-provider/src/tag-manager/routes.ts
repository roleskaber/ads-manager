import { Router } from "express";
import { route } from "../http/regex-routes.js";
import type { EntityKind, TagManagerService } from "./tag-manager.service.js";

const C = String.raw`^\/accounts\/(\d+)\/containers\/(\d+)`;
const W = `${C}\\/workspaces\\/(\\d+)`;
const re = (pattern: string) => new RegExp(`${pattern}$`);

/** Tag Manager API v2 surface (mounted under /tagmanager/v2). */
export function tagManagerRouter(tm: TagManagerService): Router {
  const router = Router();
  const c = (a: string, b: string) => ({ accountId: BigInt(a), containerId: BigInt(b) });
  const w = (a: string, b: string, d: string) => ({ ...c(a, b), workspaceId: BigInt(d) });

  route(router, "get", /^\/accounts$/, () => tm.listAccounts());
  route(router, "post", /^\/accounts$/, (req) => tm.createAccount(req.body));
  route(router, "get", /^\/accounts\/(\d+)$/, (_req, _res, a) => tm.getAccount(BigInt(a!)));

  route(router, "get", /^\/accounts\/(\d+)\/containers$/, (_req, _res, a) => tm.listContainers(BigInt(a!)));
  route(router, "post", /^\/accounts\/(\d+)\/containers$/, (req, _res, a) => tm.createContainer(BigInt(a!), req.body));
  route(router, "get", re(C), (_req, _res, a, b) => tm.getContainer(c(a!, b!)));
  route(router, "put", re(C), (req, _res, a, b) => tm.updateContainer(c(a!, b!), req.body));
  route(router, "delete", re(C), (_req, _res, a, b) => tm.deleteContainer(c(a!, b!)));
  route(router, "get", re(`${C}:snippet`), (_req, _res, a, b) => tm.snippet(c(a!, b!)));
  route(router, "get", re(`${C}\\/stats`), (req, _res, a, b) => tm.stats(c(a!, b!), req.query));

  route(router, "get", re(`${C}\\/workspaces`), (_req, _res, a, b) => tm.listWorkspaces(c(a!, b!)));
  route(router, "post", re(`${C}\\/workspaces`), (req, _res, a, b) => tm.createWorkspace(c(a!, b!), req.body));
  route(router, "get", re(W), (_req, _res, a, b, d) => tm.getWorkspace(w(a!, b!, d!)));
  route(router, "post", re(`${W}:create_version`), (req, _res, a, b, d) => tm.createVersion(w(a!, b!, d!), req.body));

  const kinds = "(tags|triggers|variables)";
  route(router, "get", re(`${W}\\/${kinds}`), (_req, _res, a, b, d, kind) => tm.listEntities(w(a!, b!, d!), kind as EntityKind));
  route(router, "post", re(`${W}\\/${kinds}`), (req, _res, a, b, d, kind) => tm.createEntity(w(a!, b!, d!), kind as EntityKind, req.body));
  route(router, "get", re(`${W}\\/${kinds}\\/(\\d+)`), (_req, _res, a, b, d, kind, id) =>
    tm.getEntity(w(a!, b!, d!), kind as EntityKind, BigInt(id!)),
  );
  route(router, "put", re(`${W}\\/${kinds}\\/(\\d+)`), (req, _res, a, b, d, kind, id) =>
    tm.updateEntity(w(a!, b!, d!), kind as EntityKind, BigInt(id!), req.body),
  );
  route(router, "delete", re(`${W}\\/${kinds}\\/(\\d+)`), (_req, _res, a, b, d, kind, id) =>
    tm.deleteEntity(w(a!, b!, d!), kind as EntityKind, BigInt(id!)),
  );

  route(router, "get", re(`${C}\\/versions`), (_req, _res, a, b) => tm.listVersions(c(a!, b!)));
  route(router, "get", re(`${C}\\/versions:live`), (_req, _res, a, b) => tm.liveVersion(c(a!, b!)));
  route(router, "get", re(`${C}\\/versions\\/(\\d+)`), (_req, _res, a, b, v) => tm.getVersion(c(a!, b!), BigInt(v!)));
  route(router, "post", re(`${C}\\/versions\\/(\\d+):publish`), (_req, _res, a, b, v) => tm.publish(c(a!, b!), BigInt(v!)));

  return router;
}
