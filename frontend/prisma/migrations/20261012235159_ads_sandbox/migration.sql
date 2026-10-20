-- CreateEnum
CREATE TYPE "AdProvider" AS ENUM ('SANDBOX', 'GOOGLE_ADS');

-- CreateEnum
CREATE TYPE "CampaignChannel" AS ENUM ('SEARCH', 'DISPLAY', 'SHOPPING', 'VIDEO');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ENABLED', 'PAUSED', 'REMOVED');

-- CreateEnum
CREATE TYPE "BiddingStrategy" AS ENUM ('MANUAL_CPC', 'MAXIMIZE_CLICKS', 'MAXIMIZE_CONVERSIONS', 'TARGET_CPA');

-- CreateEnum
CREATE TYPE "AdGroupStatus" AS ENUM ('ENABLED', 'PAUSED');

-- CreateEnum
CREATE TYPE "KeywordMatchType" AS ENUM ('EXACT', 'PHRASE', 'BROAD');

-- CreateEnum
CREATE TYPE "AdReviewStatus" AS ENUM ('NOT_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DISAPPROVED');

-- CreateTable
CREATE TABLE "ad_accounts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" "AdProvider" NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timeZone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "adAccountId" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "channel" "CampaignChannel" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "biddingStrategy" "BiddingStrategy" NOT NULL,
    "dailyBudgetMicros" BIGINT NOT NULL,
    "targetCpaMicros" BIGINT,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "locations" TEXT[],
    "launchedAt" TIMESTAMP(3),
    "accruedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_groups" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "status" "AdGroupStatus" NOT NULL DEFAULT 'ENABLED',
    "cpcBidMicros" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keywords" (
    "id" TEXT NOT NULL,
    "adGroupId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "matchType" "KeywordMatchType" NOT NULL,

    CONSTRAINT "keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads" (
    "id" TEXT NOT NULL,
    "adGroupId" TEXT NOT NULL,
    "externalId" TEXT,
    "headlines" TEXT[],
    "descriptions" TEXT[],
    "finalUrl" TEXT NOT NULL,
    "reviewStatus" "AdReviewStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "policyTopics" TEXT[],
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_metrics" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "servedFraction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "costMicros" BIGINT NOT NULL DEFAULT 0,
    "conversions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversionValueMicros" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ad_accounts_provider_externalId_key" ON "ad_accounts"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ad_accounts_companyId_provider_key" ON "ad_accounts"("companyId", "provider");

-- CreateIndex
CREATE INDEX "campaigns_companyId_status_idx" ON "campaigns"("companyId", "status");

-- CreateIndex
CREATE INDEX "ad_groups_campaignId_idx" ON "ad_groups"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "keywords_adGroupId_text_matchType_key" ON "keywords"("adGroupId", "text", "matchType");

-- CreateIndex
CREATE INDEX "ads_adGroupId_idx" ON "ads"("adGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_metrics_campaignId_date_key" ON "campaign_metrics"("campaignId", "date");

-- AddForeignKey
ALTER TABLE "ad_accounts" ADD CONSTRAINT "ad_accounts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "ad_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_groups" ADD CONSTRAINT "ad_groups_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_adGroupId_fkey" FOREIGN KEY ("adGroupId") REFERENCES "ad_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_adGroupId_fkey" FOREIGN KEY ("adGroupId") REFERENCES "ad_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_metrics" ADD CONSTRAINT "campaign_metrics_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
