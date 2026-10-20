import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  SANDBOX_API_TOKEN: z.string().min(8, "SANDBOX_API_TOKEN must be at least 8 characters"),
  PORT: z.coerce.number().int().positive().default(4000),
  AD_REVIEW_DELAY_SECONDS: z.coerce.number().int().min(0).default(60),
  ACCRUAL_INTERVAL_SECONDS: z.coerce.number().int().min(1).default(60),
});

export type Config = {
  databaseUrl: string;
  apiToken: string;
  port: number;
  adReviewDelayMs: number;
  accrualIntervalMs: number;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.parse(env);
  return {
    databaseUrl: parsed.DATABASE_URL,
    apiToken: parsed.SANDBOX_API_TOKEN,
    port: parsed.PORT,
    adReviewDelayMs: parsed.AD_REVIEW_DELAY_SECONDS * 1000,
    accrualIntervalMs: parsed.ACCRUAL_INTERVAL_SECONDS * 1000,
  };
}
