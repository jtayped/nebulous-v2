/*
  Warnings:

  - Made the column `credentialId` on table `Node` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Node" DROP CONSTRAINT "Node_credentialId_fkey";

-- AlterTable
ALTER TABLE "Node" ALTER COLUMN "credentialId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "CloudCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
