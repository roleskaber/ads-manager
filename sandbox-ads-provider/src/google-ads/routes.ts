import { Router } from "express";
import { route } from "../http/regex-routes.js";
import type { BillingService } from "./billing/billing.service.js";
import type { ConversionService } from "./conversions/conversion.service.js";
import type { CustomerService } from "./customers/customer.service.js";
import type { MutateService } from "./mutate/mutate.service.js";
import type { ReportingService } from "./reporting/reporting.service.js";

export type GoogleAdsServices = {
  customers: CustomerService;
  mutate: MutateService;
  reporting: ReportingService;
  conversions: ConversionService;
  billing: BillingService;
};

/** Google Ads REST API surface (mounted under /googleads/v1). */
export function googleAdsRouter(s: GoogleAdsServices): Router {
  const router = Router();

  route(router, "get", /^\/customers:listAccessibleCustomers$/, () => s.customers.listAccessible());
  route(router, "post", /^\/customers:createSandboxCustomer$/, async (req, res) => {
    res.status(201);
    return s.customers.create(req.body);
  });

  route(router, "post", /^\/customers\/(\d+)\/googleAds:search$/, (req, _res, customerId) => s.reporting.search(customerId!, req.body));
  route(router, "post", /^\/customers\/(\d+)\/googleAds:searchStream$/, (req, _res, customerId) => s.reporting.searchStream(customerId!, req.body));
  route(router, "post", /^\/customers\/(\d+):uploadClickConversions$/, (req, _res, customerId) => s.conversions.upload(customerId!, req.body));
  route(router, "post", /^\/customers\/(\d+)\/([A-Za-z]+):mutate$/, (req, _res, customerId, collection) =>
    s.mutate.mutate(customerId!, collection!, req.body),
  );

  route(router, "get", /^\/customers\/(\d+)\/billing$/, (_req, _res, customerId) => s.billing.summary(customerId!));
  route(router, "post", /^\/customers\/(\d+)\/billing:addFunds$/, (req, _res, customerId) => s.billing.addFunds(customerId!, req.body));
  route(router, "get", /^\/customers\/(\d+)\/billing\/transactions$/, (req, _res, customerId) => s.billing.transactions(customerId!, req.query));

  return router;
}
