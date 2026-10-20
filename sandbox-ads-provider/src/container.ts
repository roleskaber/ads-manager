import type { Config } from "./config.js";
import { createDb } from "./db.js";
import { systemClock, type Clock } from "./domain/clock.js";
import { BillingService } from "./google-ads/billing/billing.service.js";
import { ConversionService } from "./google-ads/conversions/conversion.service.js";
import { CustomerService } from "./google-ads/customers/customer.service.js";
import { AccountSync } from "./google-ads/delivery/account-sync.js";
import { MutateService } from "./google-ads/mutate/mutate.service.js";
import { ReportingService } from "./google-ads/reporting/reporting.service.js";
import { AdGroupAdHandler } from "./google-ads/resources/ad-group-ads.js";
import { AdGroupCriterionHandler } from "./google-ads/resources/ad-group-criteria.js";
import { AdGroupHandler } from "./google-ads/resources/ad-groups.js";
import { AdHandler } from "./google-ads/resources/ads.js";
import { CampaignBudgetHandler } from "./google-ads/resources/campaign-budgets.js";
import { CampaignCriterionHandler } from "./google-ads/resources/campaign-criteria.js";
import { CampaignHandler } from "./google-ads/resources/campaigns.js";
import { ConversionActionHandler } from "./google-ads/resources/conversion-actions.js";
import { SerpService } from "./google-ads/serp/serp.service.js";
import { TagManagerService } from "./tag-manager/tag-manager.service.js";
import { AccrualTicker } from "./workers/accrual-ticker.js";

/** Composition root. */
export function createContainer(config: Config, clock: Clock = systemClock) {
  const db = createDb(config.databaseUrl);
  const sync = new AccountSync(clock, config.adReviewDelayMs, config.deliverySpeed);
  const conversions = new ConversionService(db, sync, clock);

  return {
    db,
    config,
    googleAds: {
      customers: new CustomerService(db),
      mutate: new MutateService(db, sync, clock, [
        new CampaignBudgetHandler(),
        new CampaignHandler(),
        new CampaignCriterionHandler(),
        new AdGroupHandler(),
        new AdGroupCriterionHandler(),
        new AdGroupAdHandler(),
        new AdHandler(),
        new ConversionActionHandler(),
      ]),
      reporting: new ReportingService(db, sync, clock, config.publicUrl),
      conversions,
      billing: new BillingService(db, sync, clock, config.bankTransferSettleMs),
    },
    tagManager: new TagManagerService(db, clock, config.publicUrl),
    serp: new SerpService(db, sync, clock, config.clickSecret),
    ticker: new AccrualTicker(db, sync, config.accrualIntervalMs),
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
