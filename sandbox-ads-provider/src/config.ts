import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  /** OAuth access token stand-in: `Authorization: Bearer …` on every API call. */
  SANDBOX_API_TOKEN: z.string().min(8, "SANDBOX_API_TOKEN must be at least 8 characters"),
  /** Google Ads `developer-token` header. */
  SANDBOX_DEVELOPER_TOKEN: z.string().min(8).default("sandbox-developer-token"),
  /** Signs ad click links; defaults to a value derived from the API token. */
  CLICK_SECRET: z.string().min(16).optional(),
  PORT: z.coerce.number().int().positive().default(4000),
  /** Origin browsers use to reach the sandbox (gtm.js, gtag.js, conversion pixel, search page). */
  PUBLIC_URL: z.string().url().default("http://localhost:4000"),
  AD_REVIEW_DELAY_SECONDS: z.coerce.number().int().min(0).default(60),
  BANK_TRANSFER_SETTLE_SECONDS: z.coerce.number().int().min(0).default(300),
  ACCRUAL_INTERVAL_SECONDS: z.coerce.number().int().min(1).default(60),
  /** Simulated traffic speed-up for demos: 60 delivers an hour of traffic per minute. */
  DELIVERY_SPEED: z.coerce.number().min(1).max(10_000).default(1),
});

export type Config = {
  databaseUrl: string;
  apiToken: string;
  developerToken: string;
  clickSecret: string;
  port: number;
  publicUrl: string;
  adReviewDelayMs: number;
  bankTransferSettleMs: number;
  accrualIntervalMs: number;
  deliverySpeed: number;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.parse(env);
  return {
    databaseUrl: parsed.DATABASE_URL,
    apiToken: parsed.SANDBOX_API_TOKEN,
    developerToken: parsed.SANDBOX_DEVELOPER_TOKEN,
    clickSecret: parsed.CLICK_SECRET ?? `click:${parsed.SANDBOX_API_TOKEN}`,
    port: parsed.PORT,
    publicUrl: parsed.PUBLIC_URL.replace(/\/$/, ""),
    adReviewDelayMs: parsed.AD_REVIEW_DELAY_SECONDS * 1000,
    bankTransferSettleMs: parsed.BANK_TRANSFER_SETTLE_SECONDS * 1000,
    accrualIntervalMs: parsed.ACCRUAL_INTERVAL_SECONDS * 1000,
    deliverySpeed: parsed.DELIVERY_SPEED,
  };
}
