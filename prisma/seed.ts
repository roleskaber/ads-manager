import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { BcryptPasswordHasher } from "../lib/security/password-hasher";
import { slugify } from "../lib/slugify";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const hasher = new BcryptPasswordHasher();

async function main() {
  const email = process.env.SEED_USER_EMAIL?.toLowerCase();
  const password = process.env.SEED_USER_PASSWORD;
  if (!email || !password) {
    throw new Error("Set SEED_USER_EMAIL and SEED_USER_PASSWORD in .env to seed the demo workspace.");
  }

  const companyName = process.env.SEED_COMPANY_NAME ?? "Demo Company";
  const passwordHash = await hasher.hash(password);

  const company = await db.company.upsert({
    where: { slug: slugify(companyName) },
    update: {},
    create: { name: companyName, slug: slugify(companyName) },
  });

  await db.user.upsert({
    where: { email },
    update: { passwordHash, companyId: company.id },
    create: {
      email,
      name: process.env.SEED_USER_NAME ?? "Workspace Owner",
      passwordHash,
      role: "OWNER",
      companyId: company.id,
    },
  });

  console.log(`Seeded ${email} as owner of "${company.name}".`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
