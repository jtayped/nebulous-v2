/*
  Warnings:

  - You are about to drop the column `credentialId` on the `Cluster` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Cluster" DROP CONSTRAINT "Cluster_credentialId_fkey";

-- AlterTable
ALTER TABLE "Cluster" DROP COLUMN "credentialId";

-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "credentialId" TEXT;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "CloudCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;
