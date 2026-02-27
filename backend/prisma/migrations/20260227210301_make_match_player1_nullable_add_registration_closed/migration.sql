-- AlterTable
ALTER TABLE "Match" ALTER COLUMN "player1Id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "registrationClosed" BOOLEAN NOT NULL DEFAULT false;
