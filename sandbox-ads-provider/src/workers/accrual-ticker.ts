import type { Db } from "../db.js";
import type { AccountSync } from "../google-ads/delivery/account-sync.js";

/**
 * Keeps simulated delivery flowing without API calls: periodically syncs every account that
 * has something time-based going on (serving campaigns, ads in review, pending transfers).
 */
export class AccrualTicker {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly db: Db,
    private readonly sync: AccountSync,
    private readonly intervalMs: number,
  ) {}

  start() {
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
    this.timer.unref();
  }

  stop() {
    clearInterval(this.timer);
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const customers = await this.db.customer.findMany({
        where: {
          OR: [
            { campaigns: { some: { status: "ENABLED" } } },
            { payments: { some: { status: "PENDING" } } },
            { campaigns: { some: { adGroups: { some: { ads: { some: { reviewStatus: "REVIEW_IN_PROGRESS" } } } } } } },
          ],
        },
        select: { id: true },
      });
      for (const { id } of customers) {
        try {
          await this.db.$transaction((tx) => this.sync.sync(tx, id), { timeout: 30_000 });
        } catch (error) {
          console.error(`[accrual] customer ${id} failed`, error);
        }
      }
    } finally {
      this.running = false;
    }
  }
}
