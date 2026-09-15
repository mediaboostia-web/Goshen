/*
  Warnings:

  - You are about to drop the column `withdrawalPinHash` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Order` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Withdrawal` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropForeignKey
ALTER TABLE "Withdrawal" DROP CONSTRAINT "Withdrawal_userId_fkey";

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'XAF',
ADD COLUMN     "denomination" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'FREE',
ADD COLUMN     "planExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OrganizationMember" ALTER COLUMN "role" SET DEFAULT 'TREASURER';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "withdrawalPinHash";

-- DropTable
DROP TABLE "Order";

-- DropTable
DROP TABLE "Withdrawal";

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "currentBalance" INTEGER NOT NULL DEFAULT 0,
    "lowBalanceThreshold" INTEGER NOT NULL DEFAULT 25000,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberBranchAccess" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,

    CONSTRAINT "MemberBranchAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChurchCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChurchCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categoryId" TEXT NOT NULL,
    "beneficiary" TEXT,
    "receiptUrl" TEXT,
    "receiptPublicId" TEXT,
    "notes" TEXT,
    "authorId" TEXT NOT NULL,
    "recurringExpenseExecutionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringExpense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "categoryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringExpenseExecution" (
    "id" TEXT NOT NULL,
    "recurringExpenseId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "postponedReason" TEXT,
    "validatedAt" TIMESTAMP(3),
    "validatedById" TEXT,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringExpenseExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "title" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "openingBalance" INTEGER NOT NULL,
    "closingBalance" INTEGER NOT NULL,
    "totalIncome" INTEGER NOT NULL,
    "totalExpense" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "provider" TEXT NOT NULL DEFAULT 'CHARIOW',
    "chariowPurchaseId" TEXT,
    "chariowProductId" TEXT,
    "customerPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Branch_organizationId_idx" ON "Branch"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberBranchAccess_memberId_branchId_key" ON "MemberBranchAccess"("memberId", "branchId");

-- CreateIndex
CREATE INDEX "ChurchCategory_organizationId_type_idx" ON "ChurchCategory"("organizationId", "type");

-- CreateIndex
CREATE INDEX "FinancialTransaction_organizationId_branchId_date_idx" ON "FinancialTransaction"("organizationId", "branchId", "date");

-- CreateIndex
CREATE INDEX "FinancialTransaction_type_date_idx" ON "FinancialTransaction"("type", "date");

-- CreateIndex
CREATE INDEX "RecurringExpense_organizationId_branchId_status_idx" ON "RecurringExpense"("organizationId", "branchId", "status");

-- CreateIndex
CREATE INDEX "RecurringExpenseExecution_recurringExpenseId_status_dueDate_idx" ON "RecurringExpenseExecution"("recurringExpenseId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "Report_organizationId_createdAt_idx" ON "Report"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "Subscription"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_chariowPurchaseId_key" ON "Subscription"("chariowPurchaseId");

-- CreateIndex
CREATE INDEX "Subscription_status_currentPeriodEnd_idx" ON "Subscription"("status", "currentPeriodEnd");

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberBranchAccess" ADD CONSTRAINT "MemberBranchAccess_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "OrganizationMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberBranchAccess" ADD CONSTRAINT "MemberBranchAccess_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChurchCategory" ADD CONSTRAINT "ChurchCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ChurchCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ChurchCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpenseExecution" ADD CONSTRAINT "RecurringExpenseExecution_recurringExpenseId_fkey" FOREIGN KEY ("recurringExpenseId") REFERENCES "RecurringExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
