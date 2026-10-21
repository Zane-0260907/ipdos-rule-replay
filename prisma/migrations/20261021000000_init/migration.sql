-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'OVERRIDDEN');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('INVENTORY', 'SALES', 'LABOR', 'OPERATIONS', 'MARKETING', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AlertLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DecisionType" AS ENUM ('INVENTORY_REPLENISHMENT', 'WORKFORCE_ADJUSTMENT', 'PROMOTION_PLANNING', 'MENU_OPTIMIZATION', 'COST_CONTROL');

-- CreateEnum
CREATE TYPE "DecisionStatus" AS ENUM ('PENDING', 'APPLIED', 'DISMISSED');

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "locale" TEXT NOT NULL DEFAULT 'zh-CN',
    "address" TEXT,
    "managerName" TEXT,
    "contactPhone" TEXT,
    "openedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "category" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "currentStock" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "reorderPoint" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "safetyStock" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 2,
    "supplier" TEXT,
    "shelfLifeDays" INTEGER,
    "lastDeliveryAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_snapshots" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "horizon" TEXT NOT NULL DEFAULT 'daily',
    "modelVersion" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT,
    "payload" JSONB NOT NULL,
    "metrics" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prediction_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_campaigns" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT,
    "channel" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "budget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "expectedLift" DECIMAL(5,2),
    "actualLift" DECIMAL(5,2),
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "kpi" JSONB,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_schedules" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "scheduleDate" TIMESTAMP(3) NOT NULL,
    "staffName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "shiftCode" TEXT NOT NULL,
    "shiftStart" TIMESTAMP(3) NOT NULL,
    "shiftEnd" TIMESTAMP(3) NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "coverageNote" TEXT,
    "assignments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_records" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "alertType" "AlertType" NOT NULL,
    "alertLevel" "AlertLevel" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT,
    "context" JSONB,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "requiresAction" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "alert_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_snapshots" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "capturedDate" TIMESTAMP(3) NOT NULL,
    "cogs" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "laborCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "marketingSpend" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "utilities" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otherCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "revenue" DECIMAL(12,2),
    "footTraffic" INTEGER,
    "comments" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_snapshots" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "decisionType" "DecisionType" NOT NULL,
    "context" JSONB NOT NULL,
    "recommendation" JSONB NOT NULL,
    "status" "DecisionStatus" NOT NULL DEFAULT 'PENDING',
    "appliedAt" TIMESTAMP(3),
    "appliedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stores_code_key" ON "stores"("code");

-- CreateIndex
CREATE INDEX "inventory_items_storeId_name_idx" ON "inventory_items"("storeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_storeId_sku_key" ON "inventory_items"("storeId", "sku");

-- CreateIndex
CREATE INDEX "prediction_snapshots_storeId_targetDate_idx" ON "prediction_snapshots"("storeId", "targetDate");

-- CreateIndex
CREATE INDEX "marketing_campaigns_storeId_status_idx" ON "marketing_campaigns"("storeId", "status");

-- CreateIndex
CREATE INDEX "staff_schedules_storeId_scheduleDate_idx" ON "staff_schedules"("storeId", "scheduleDate");

-- CreateIndex
CREATE INDEX "alert_records_storeId_alertType_alertLevel_idx" ON "alert_records"("storeId", "alertType", "alertLevel");

-- CreateIndex
CREATE INDEX "cost_snapshots_storeId_capturedDate_idx" ON "cost_snapshots"("storeId", "capturedDate");

-- CreateIndex
CREATE INDEX "decision_snapshots_storeId_decisionType_idx" ON "decision_snapshots"("storeId", "decisionType");

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_snapshots" ADD CONSTRAINT "prediction_snapshots_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_records" ADD CONSTRAINT "alert_records_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_snapshots" ADD CONSTRAINT "cost_snapshots_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_snapshots" ADD CONSTRAINT "decision_snapshots_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
