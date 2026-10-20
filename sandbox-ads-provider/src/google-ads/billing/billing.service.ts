import { z } from "zod";
import type { Db } from "../../db.js";
import type { Clock } from "../../domain/clock.js";
import { InvalidArgumentError, NotFoundError } from "../../domain/errors.js";
import { MICROS_PER_UNIT } from "../../domain/money.js";
import { isoDate, startOfUtcDay } from "../../lib/dates.js";
import type { Payment } from "../../generated/prisma/client.js";
import type { AccountSync } from "../delivery/account-sync.js";
import { micros } from "../mutate/fields.js";
import { resourceName } from "../resource-names.js";
import { TEST_CARD_TOKENS, chargeCard } from "./payment-gateway.js";

const MIN_TOP_UP = BigInt(10 * MICROS_PER_UNIT);
const MAX_TOP_UP = BigInt(100_000 * MICROS_PER_UNIT);

const addFundsSchema = z.object({
  amountMicros: micros,
  paymentMethod: z.union([
    z.object({ card: z.object({ token: z.string() }) }),
    z.object({ bankTransfer: z.object({}).passthrough() }),
  ]),
});

const transactionsSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** Prepaid wallet ("manual payments" in Google Ads): add funds, ad spend is debited daily. */
export class BillingService {
  constructor(
    private readonly db: Db,
    private readonly sync: AccountSync,
    private readonly clock: Clock,
    private readonly bankTransferSettleMs: number,
  ) {}

  async summary(customerId: string) {
    return this.db.$transaction(async (tx) => {
      if (!(await this.sync.sync(tx, customerId))) throw new NotFoundError(`Customer ${customerId}`);
      const today = startOfUtcDay(this.clock.now());
      const [customer, charge, pending] = await Promise.all([
        tx.customer.findUniqueOrThrow({ where: { id: customerId } }),
        tx.dailyCharge.findUnique({ where: { customerId_date: { customerId, date: today } } }),
        tx.payment.aggregate({ where: { customerId, status: "PENDING" }, _sum: { amountMicros: true } }),
      ]);
      return {
        customer: resourceName.customer(customerId),
        currencyCode: customer.currencyCode,
        balanceMicros: customer.balanceMicros,
        pendingMicros: pending._sum.amountMicros ?? 0n,
        todaySpendMicros: charge?.amountMicros ?? 0n,
        status: customer.balanceMicros > 0n ? "ACTIVE" : "BALANCE_DEPLETED",
      };
    });
  }

  async addFunds(customerId: string, body: unknown) {
    const input = addFundsSchema.parse(body);
    if (input.amountMicros < MIN_TOP_UP || input.amountMicros > MAX_TOP_UP) {
      throw new InvalidArgumentError("Top-up must be between 10 and 100000 currency units", { billingError: "AMOUNT_OUT_OF_RANGE" });
    }

    return this.db.$transaction(async (tx) => {
      // Delivery up to now is settled against the old balance before money arrives.
      if (!(await this.sync.sync(tx, customerId))) throw new NotFoundError(`Customer ${customerId}`);
      const now = this.clock.now();

      if ("bankTransfer" in input.paymentMethod) {
        const payment = await tx.payment.create({
          data: {
            customerId,
            amountMicros: input.amountMicros,
            method: "BANK_TRANSFER",
            status: "PENDING",
            settlesAt: new Date(now.getTime() + this.bankTransferSettleMs),
          },
        });
        return present(payment);
      }

      const charge = chargeCard(input.paymentMethod.card.token);
      if (!charge) {
        throw new InvalidArgumentError(`Unknown test card token. Use one of: ${TEST_CARD_TOKENS.join(", ")}`, {
          billingError: "INVALID_PAYMENT_METHOD",
        });
      }
      const payment = await tx.payment.create({
        data: {
          customerId,
          amountMicros: input.amountMicros,
          method: "CARD",
          cardBrand: charge.brand,
          cardLast4: charge.last4,
          status: charge.status,
          declineReason: charge.status === "DECLINED" ? charge.declineReason : null,
          settledAt: charge.status === "SUCCEEDED" ? now : null,
        },
      });
      if (charge.status === "SUCCEEDED") {
        await tx.customer.update({ where: { id: customerId }, data: { balanceMicros: { increment: input.amountMicros } } });
      }
      return present(payment);
    });
  }

  /** Wallet ledger: payments and daily ad spend, newest first. */
  async transactions(customerId: string, query: unknown) {
    const { from, to } = transactionsSchema.parse(query);
    return this.db.$transaction(async (tx) => {
      if (!(await this.sync.sync(tx, customerId))) throw new NotFoundError(`Customer ${customerId}`);
      const dateFilter = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) };
      const createdFilter = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lt: new Date(new Date(to).getTime() + 86_400_000) } : {}) };
      const [payments, charges] = await Promise.all([
        tx.payment.findMany({ where: { customerId, createdAt: createdFilter } }),
        tx.dailyCharge.findMany({ where: { customerId, date: dateFilter } }),
      ]);
      const entries = [
        ...payments.map((payment) => ({ at: payment.createdAt, entry: { type: "PAYMENT", ...present(payment) } })),
        ...charges.map((charge) => ({
          at: charge.date,
          entry: { type: "AD_SPEND", date: isoDate(charge.date), amountMicros: -charge.amountMicros },
        })),
      ];
      return { transactions: entries.sort((a, b) => b.at.getTime() - a.at.getTime()).map(({ entry }) => entry) };
    });
  }
}

function present(payment: Payment) {
  return {
    id: payment.id,
    amountMicros: payment.amountMicros,
    method: payment.method,
    ...(payment.cardLast4 ? { card: { brand: payment.cardBrand, last4: payment.cardLast4 } } : {}),
    status: payment.status,
    ...(payment.declineReason ? { declineReason: payment.declineReason } : {}),
    ...(payment.settlesAt ? { settlesAt: payment.settlesAt } : {}),
    ...(payment.settledAt ? { settledAt: payment.settledAt } : {}),
    createdAt: payment.createdAt,
  };
}
