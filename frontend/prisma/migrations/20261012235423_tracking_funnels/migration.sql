-- CreateEnum
CREATE TYPE "TrafficChannel" AS ENUM ('PAID_SEARCH', 'PAID_SOCIAL', 'DISPLAY', 'EMAIL', 'ORGANIC_SEARCH', 'ORGANIC_SOCIAL', 'REFERRAL', 'DIRECT');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "trackingKey" TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '');

-- CreateTable
CREATE TABLE "funnels" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "steps" TEXT[],
    "conversionWindowDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funnels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "touchpoints" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "channel" "TrafficChannel" NOT NULL,
    "source" TEXT NOT NULL,
    "medium" TEXT,
    "campaign" TEXT,
    "content" TEXT,
    "term" TEXT,
    "clickId" TEXT,
    "clickIdType" TEXT,
    "referrer" TEXT,
    "landingUrl" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "touchpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracked_events" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "touchpointId" TEXT,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "properties" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracked_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitors" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "anonymousId" TEXT NOT NULL,
    "externalId" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "funnels_companyId_idx" ON "funnels"("companyId");

-- CreateIndex
CREATE INDEX "touchpoints_visitorId_occurredAt_idx" ON "touchpoints"("visitorId", "occurredAt");

-- CreateIndex
CREATE INDEX "touchpoints_companyId_occurredAt_idx" ON "touchpoints"("companyId", "occurredAt");

-- CreateIndex
CREATE INDEX "tracked_events_companyId_name_occurredAt_idx" ON "tracked_events"("companyId", "name", "occurredAt");

-- CreateIndex
CREATE INDEX "tracked_events_visitorId_occurredAt_idx" ON "tracked_events"("visitorId", "occurredAt");

-- CreateIndex
CREATE INDEX "visitors_companyId_externalId_idx" ON "visitors"("companyId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "visitors_companyId_anonymousId_key" ON "visitors"("companyId", "anonymousId");

-- CreateIndex
CREATE UNIQUE INDEX "companies_trackingKey_key" ON "companies"("trackingKey");

-- AddForeignKey
ALTER TABLE "funnels" ADD CONSTRAINT "funnels_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "touchpoints" ADD CONSTRAINT "touchpoints_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "touchpoints" ADD CONSTRAINT "touchpoints_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracked_events" ADD CONSTRAINT "tracked_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracked_events" ADD CONSTRAINT "tracked_events_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracked_events" ADD CONSTRAINT "tracked_events_touchpointId_fkey" FOREIGN KEY ("touchpointId") REFERENCES "touchpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

