import { z } from "zod";
import type { Db } from "../../db.js";
import { newCustomerId } from "../../lib/ids.js";
import { resourceName } from "../resource-names.js";

const CURRENCIES = ["USD", "EUR", "GBP", "PLN", "RUB", "UAH", "BYN", "KZT"] as const;

const createSchema = z.object({
  descriptiveName: z.string().trim().min(1).max(255),
  currencyCode: z.enum(CURRENCIES).default("USD"),
  timeZone: z
    .string()
    .default("UTC")
    .refine((zone) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: zone });
        return true;
      } catch {
        return false;
      }
    }, "is not a valid IANA time zone"),
});

/** Account management. Real Google Ads creates clients under a manager; the sandbox does it directly. */
export class CustomerService {
  constructor(private readonly db: Db) {}

  async create(body: unknown) {
    const input = createSchema.parse(body);
    for (;;) {
      const id = newCustomerId();
      if (await this.db.customer.findUnique({ where: { id } })) continue;
      await this.db.customer.create({ data: { id, ...input } });
      return { resourceName: resourceName.customer(id) };
    }
  }

  async listAccessible() {
    const customers = await this.db.customer.findMany({ select: { id: true }, orderBy: { createdAt: "asc" } });
    return { resourceNames: customers.map((customer) => resourceName.customer(customer.id)) };
  }
}
