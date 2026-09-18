-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "paymentDetails" TEXT,
ADD COLUMN     "paymentMethods" TEXT[] DEFAULT ARRAY[]::TEXT[];
