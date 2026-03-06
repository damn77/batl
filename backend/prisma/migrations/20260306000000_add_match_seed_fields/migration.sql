-- AlterTable: Add seed number fields to Match model
-- Seed numbers are stored as a snapshot at draw generation time (not looked up dynamically)
ALTER TABLE "Match" ADD COLUMN "player1Seed" INTEGER;
ALTER TABLE "Match" ADD COLUMN "player2Seed" INTEGER;
ALTER TABLE "Match" ADD COLUMN "pair1Seed" INTEGER;
ALTER TABLE "Match" ADD COLUMN "pair2Seed" INTEGER;
