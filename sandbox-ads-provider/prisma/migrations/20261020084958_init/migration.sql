-- CreateEnum
CREATE TYPE "EntityStatus" AS ENUM ('ENABLED', 'PAUSED', 'REMOVED');

-- CreateEnum
CREATE TYPE "AdvertisingChannelType" AS ENUM ('SEARCH', 'DISPLAY', 'SHOPPING', 'VIDEO');

-- CreateEnum
CREATE TYPE "BiddingStrategyType" AS ENUM ('MANUAL_CPC', 'MAXIMIZE_CLICKS', 'MAXIMIZE_CONVERSIONS', 'TARGET_CPA');

-- CreateEnum
CREATE TYPE "KeywordMatchType" AS ENUM ('EXACT', 'PHRASE', 'BROAD');

-- CreateEnum
CREATE TYPE "PolicyReviewStatus" AS ENUM ('REVIEW_IN_PROGRESS', 'REVIEWED');

-- CreateEnum
CREATE TYPE "PolicyApprovalStatus" AS ENUM ('UNKNOWN', 'APPROVED', 'APPROVED_LIMITED', 'DISAPPROVED');

-- CreateEnum
CREATE TYPE "ConversionActionType" AS ENUM ('WEBPAGE', 'UPLOAD_CLICKS');

-- CreateEnum
CREATE TYPE "ConversionActionCategory" AS ENUM ('DEFAULT', 'PAGE_VIEW', 'PURCHASE', 'SIGNUP', 'SUBMIT_LEAD_FORM', 'CONTACT', 'BOOK_APPOINTMENT');

-- CreateEnum
CREATE TYPE "ConversionCountingType" AS ENUM ('ONE_PER_CLICK', 'MANY_PER_CLICK');

-- CreateEnum
CREATE TYPE "ConversionSource" AS ENUM ('TAG', 'UPLOAD');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CARD', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'DECLINED');

-- CreateTable
CREATE TABLE "ad_group_ads" (
    "id" BIGSERIAL NOT NULL,
    "adGroupId" BIGINT NOT NULL,
    "headlines" TEXT[],
    "descriptions" TEXT[],
    "finalUrls" TEXT[],
    "path1" TEXT,
    "path2" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'ENABLED',
    "reviewStatus" "PolicyReviewStatus" NOT NULL DEFAULT 'REVIEW_IN_PROGRESS',
    "approvalStatus" "PolicyApprovalStatus" NOT NULL DEFAULT 'UNKNOWN',
    "policyTopics" TEXT[],
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_group_ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_group_criteria" (
    "id" BIGSERIAL NOT NULL,
    "adGroupId" BIGINT NOT NULL,
    "keywordText" TEXT NOT NULL,
    "matchType" "KeywordMatchType" NOT NULL,
    "negative" BOOLEAN NOT NULL DEFAULT false,
    "status" "EntityStatus" NOT NULL DEFAULT 'ENABLED',
    "cpcBidMicros" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_group_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_group_metrics" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "campaignId" BIGINT NOT NULL,
    "adGroupId" BIGINT NOT NULL,
    "date" DATE NOT NULL,
    "impressions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clicks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costMicros" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversionsValueMicros" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_group_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_groups" (
    "id" BIGSERIAL NOT NULL,
    "campaignId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "EntityStatus" NOT NULL DEFAULT 'ENABLED',
    "cpcBidMicros" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amountMicros" BIGINT NOT NULL,
    "method" "PaymentMethodType" NOT NULL,
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "status" "PaymentStatus" NOT NULL,
    "declineReason" TEXT,
    "settlesAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_charges" (
    "customerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amountMicros" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_charges_pkey" PRIMARY KEY ("customerId","date")
);

-- CreateTable
CREATE TABLE "campaign_budgets" (
    "id" BIGSERIAL NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amountMicros" BIGINT NOT NULL,
    "status" "EntityStatus" NOT NULL DEFAULT 'ENABLED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_criteria" (
    "id" BIGSERIAL NOT NULL,
    "campaignId" BIGINT NOT NULL,
    "geoTargetConstant" TEXT NOT NULL,
    "negative" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" BIGSERIAL NOT NULL,
    "customerId" TEXT NOT NULL,
    "campaignBudgetId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "EntityStatus" NOT NULL DEFAULT 'PAUSED',
    "advertisingChannelType" "AdvertisingChannelType" NOT NULL,
    "biddingStrategyType" "BiddingStrategyType" NOT NULL,
    "targetCpaMicros" BIGINT,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "accruedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clicks" (
    "gclid" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "campaignId" BIGINT NOT NULL,
    "adGroupId" BIGINT NOT NULL,
    "adId" BIGINT NOT NULL,
    "criterionId" BIGINT,
    "query" TEXT NOT NULL,
    "costMicros" BIGINT NOT NULL,
    "invalid" BOOLEAN NOT NULL DEFAULT false,
    "visitorHash" TEXT NOT NULL,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clicks_pkey" PRIMARY KEY ("gclid")
);

-- CreateTable
CREATE TABLE "conversion_actions" (
    "id" BIGSERIAL NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ConversionActionType" NOT NULL,
    "category" "ConversionActionCategory" NOT NULL DEFAULT 'DEFAULT',
    "status" "EntityStatus" NOT NULL DEFAULT 'ENABLED',
    "label" TEXT NOT NULL,
    "countingType" "ConversionCountingType" NOT NULL DEFAULT 'ONE_PER_CLICK',
    "defaultValueMicros" BIGINT,
    "defaultCurrencyCode" TEXT NOT NULL DEFAULT 'USD',
    "alwaysUseDefaultValue" BOOLEAN NOT NULL DEFAULT false,
    "clickThroughLookbackWindowDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversion_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversions" (
    "id" TEXT NOT NULL,
    "conversionActionId" BIGINT NOT NULL,
    "gclid" TEXT NOT NULL,
    "source" "ConversionSource" NOT NULL,
    "valueMicros" BIGINT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "orderId" TEXT,
    "conversionAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "descriptiveName" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "timeZone" TEXT NOT NULL DEFAULT 'UTC',
    "balanceMicros" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tm_accounts" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tm_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tm_containers" (
    "id" BIGSERIAL NOT NULL,
    "accountId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "domainName" TEXT[],
    "liveVersionId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tm_containers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tm_workspaces" (
    "id" BIGSERIAL NOT NULL,
    "containerId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tm_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tm_tags" (
    "id" BIGSERIAL NOT NULL,
    "workspaceId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parameter" JSONB NOT NULL DEFAULT '[]',
    "firingTriggerId" BIGINT[],
    "blockingTriggerId" BIGINT[],
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tm_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tm_triggers" (
    "id" BIGSERIAL NOT NULL,
    "workspaceId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filter" JSONB NOT NULL DEFAULT '[]',
    "customEventFilter" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tm_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tm_variables" (
    "id" BIGSERIAL NOT NULL,
    "workspaceId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parameter" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tm_variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tm_container_versions" (
    "id" BIGSERIAL NOT NULL,
    "containerId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tm_container_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tm_container_loads" (
    "containerId" BIGINT NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tm_container_loads_pkey" PRIMARY KEY ("containerId","date")
);

-- CreateIndex
CREATE INDEX "ad_group_ads_adGroupId_idx" ON "ad_group_ads"("adGroupId");

-- CreateIndex
CREATE INDEX "ad_group_ads_reviewStatus_submittedAt_idx" ON "ad_group_ads"("reviewStatus", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ad_group_criteria_adGroupId_keywordText_matchType_negative_key" ON "ad_group_criteria"("adGroupId", "keywordText", "matchType", "negative");

-- CreateIndex
CREATE INDEX "ad_group_metrics_customerId_date_idx" ON "ad_group_metrics"("customerId", "date");

-- CreateIndex
CREATE INDEX "ad_group_metrics_campaignId_date_idx" ON "ad_group_metrics"("campaignId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ad_group_metrics_adGroupId_date_key" ON "ad_group_metrics"("adGroupId", "date");

-- CreateIndex
CREATE INDEX "ad_groups_campaignId_idx" ON "ad_groups"("campaignId");

-- CreateIndex
CREATE INDEX "payments_customerId_createdAt_idx" ON "payments"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "payments_status_settlesAt_idx" ON "payments"("status", "settlesAt");

-- CreateIndex
CREATE INDEX "campaign_budgets_customerId_idx" ON "campaign_budgets"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_criteria_campaignId_geoTargetConstant_key" ON "campaign_criteria"("campaignId", "geoTargetConstant");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_campaignBudgetId_key" ON "campaigns"("campaignBudgetId");

-- CreateIndex
CREATE INDEX "campaigns_customerId_status_idx" ON "campaigns"("customerId", "status");

-- CreateIndex
CREATE INDEX "clicks_customerId_clickedAt_idx" ON "clicks"("customerId", "clickedAt");

-- CreateIndex
CREATE INDEX "clicks_adId_visitorHash_clickedAt_idx" ON "clicks"("adId", "visitorHash", "clickedAt");

-- CreateIndex
CREATE UNIQUE INDEX "conversion_actions_label_key" ON "conversion_actions"("label");

-- CreateIndex
CREATE INDEX "conversion_actions_customerId_idx" ON "conversion_actions"("customerId");

-- CreateIndex
CREATE INDEX "conversions_gclid_idx" ON "conversions"("gclid");

-- CreateIndex
CREATE UNIQUE INDEX "conversions_conversionActionId_orderId_key" ON "conversions"("conversionActionId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "tm_containers_publicId_key" ON "tm_containers"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "tm_containers_liveVersionId_key" ON "tm_containers"("liveVersionId");

-- CreateIndex
CREATE INDEX "tm_container_versions_containerId_idx" ON "tm_container_versions"("containerId");

-- AddForeignKey
ALTER TABLE "ad_group_ads" ADD CONSTRAINT "ad_group_ads_adGroupId_fkey" FOREIGN KEY ("adGroupId") REFERENCES "ad_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_group_criteria" ADD CONSTRAINT "ad_group_criteria_adGroupId_fkey" FOREIGN KEY ("adGroupId") REFERENCES "ad_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_group_metrics" ADD CONSTRAINT "ad_group_metrics_adGroupId_fkey" FOREIGN KEY ("adGroupId") REFERENCES "ad_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_groups" ADD CONSTRAINT "ad_groups_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_charges" ADD CONSTRAINT "daily_charges_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_budgets" ADD CONSTRAINT "campaign_budgets_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_criteria" ADD CONSTRAINT "campaign_criteria_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_campaignBudgetId_fkey" FOREIGN KEY ("campaignBudgetId") REFERENCES "campaign_budgets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversion_actions" ADD CONSTRAINT "conversion_actions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_conversionActionId_fkey" FOREIGN KEY ("conversionActionId") REFERENCES "conversion_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_gclid_fkey" FOREIGN KEY ("gclid") REFERENCES "clicks"("gclid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_containers" ADD CONSTRAINT "tm_containers_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "tm_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_containers" ADD CONSTRAINT "tm_containers_liveVersionId_fkey" FOREIGN KEY ("liveVersionId") REFERENCES "tm_container_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_workspaces" ADD CONSTRAINT "tm_workspaces_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "tm_containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_tags" ADD CONSTRAINT "tm_tags_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "tm_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_triggers" ADD CONSTRAINT "tm_triggers_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "tm_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_variables" ADD CONSTRAINT "tm_variables_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "tm_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_container_versions" ADD CONSTRAINT "tm_container_versions_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "tm_containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_container_loads" ADD CONSTRAINT "tm_container_loads_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "tm_containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
