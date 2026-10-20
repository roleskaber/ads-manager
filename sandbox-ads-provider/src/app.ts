import express from "express";
import type { AppContainer } from "./container.js";
import { googleAdsRouter } from "./google-ads/routes.js";
import { requireAuth } from "./http/auth.js";
import { errorHandler } from "./http/error-handler.js";
import { publicRouter } from "./http/public-routes.js";
import { NotFoundError } from "./domain/errors.js";
import { tagManagerRouter } from "./tag-manager/routes.js";

export function createApp(container: AppContainer) {
  const { config } = container;
  const app = express();

  app.set("trust proxy", true);
  // int64 values (ids, micros) are serialised as strings, like proto3 JSON.
  app.set("json replacer", (_key: string, value: unknown) => (typeof value === "bigint" ? value.toString() : value));
  app.use(express.json({ limit: "5mb" }));

  app.get("/health", async (_req, res) => {
    await container.db.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  });

  app.use("/googleads/v1", requireAuth(config.apiToken, config.developerToken), googleAdsRouter(container.googleAds));
  app.use("/tagmanager/v2", requireAuth(config.apiToken), tagManagerRouter(container.tagManager));
  app.use(publicRouter({ tagManager: container.tagManager, conversions: container.googleAds.conversions, serp: container.serp, publicUrl: config.publicUrl }));

  app.use((req, _res, next) => next(new NotFoundError(`${req.method} ${req.path}`)));
  app.use(errorHandler);
  return app;
}
