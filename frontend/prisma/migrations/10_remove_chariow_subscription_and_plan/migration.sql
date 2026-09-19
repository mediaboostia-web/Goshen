-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_organizationId_fkey";

-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "plan",
DROP COLUMN "planExpiresAt";

-- DropTable
DROP TABLE "Subscription";

