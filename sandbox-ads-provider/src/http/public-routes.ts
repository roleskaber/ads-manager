import { Router } from "express";
import { z } from "zod";
import type { ConversionService } from "../google-ads/conversions/conversion.service.js";
import { renderSerpPage } from "../google-ads/serp/serp-page.js";
import { visitorHash, type SerpService } from "../google-ads/serp/serp.service.js";
import { renderContainerScript, renderGtagScript } from "../tag-manager/runtime.js";
import { renderLandingPage } from "./landing-page.js";
import type { TagManagerService } from "../tag-manager/tag-manager.service.js";

const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

const conversionHit = z.object({
  label: z.string().min(1),
  gclid: z.string().optional(),
  value: z.coerce.number().nonnegative().optional(),
  currency_code: z.string().length(3).toUpperCase().optional(),
  oid: z.string().max(64).optional(),
});

/** Unauthenticated endpoints browsers hit: tags, the conversion pixel and the search page. */
export function publicRouter(deps: { tagManager: TagManagerService; conversions: ConversionService; serp: SerpService; publicUrl: string }): Router {
  const router = Router();
  const visitor = (req: Parameters<Parameters<Router["get"]>[1]>[0]) => visitorHash(req.ip ?? "", req.get("user-agent") ?? "");

  router.get("/gtm.js", async (req, res) => {
    const id = String(req.query.id ?? "");
    const config = id ? await deps.tagManager.loadLiveConfig(id) : null;
    if (!config) {
      res.status(404).type("application/javascript").send(`/* Container ${id} has no published version */`);
      return;
    }
    res.type("application/javascript").set("Cache-Control", "no-cache").send(renderContainerScript(id, config, deps.publicUrl));
  });

  router.get("/ns.html", (_req, res) => {
    res.type("html").send("<!doctype html><title>ns</title>");
  });

  router.get("/gtag/js", (_req, res) => {
    res.type("application/javascript").set("Cache-Control", "no-cache").send(renderGtagScript(deps.publicUrl));
  });

  router.get(["/pagead/conversion/:conversionId", "/pagead/conversion/:conversionId/"], async (req, res) => {
    const parsed = conversionHit.safeParse(req.query);
    const outcome = parsed.success
      ? await deps.conversions.recordTagHit({
          conversionId: String(req.params.conversionId).replace(/^AW-/, ""),
          label: parsed.data.label,
          gclid: parsed.data.gclid,
          value: parsed.data.value,
          currencyCode: parsed.data.currency_code,
          orderId: parsed.data.oid,
        })
      : "INVALID_REQUEST";
    // Like the real pixel it always answers with a GIF; the header helps debugging.
    res.set({ "Content-Type": "image/gif", "Cache-Control": "no-store", "X-Sandbox-Conversion": outcome }).send(PIXEL);
  });

  router.get("/search", async (req, res) => {
    const query = String(req.query.q ?? "").slice(0, 200);
    const country = req.query.gl ? String(req.query.gl).slice(0, 2) : undefined;
    const ads = await deps.serp.search(query, country);
    res.type("html").send(renderSerpPage(query, country, ads));
  });

  router.get("/sandbox/landing", (req, res) => {
    res.type("html").send(renderLandingPage(deps.publicUrl, { gtm: req.query.gtm as string | undefined, aw: req.query.aw as string | undefined }));
  });

  router.get("/aclk", async (req, res) => {
    const landing = await deps.serp.click(String(req.query.t ?? ""), visitor(req));
    if (!landing) {
      res.status(410).type("text").send("This ad link has expired. Search again.");
      return;
    }
    res.redirect(302, landing);
  });

  return router;
}
