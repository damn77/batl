-- Migration: add-group-participant-pair-id
-- Makes GroupParticipant.playerId nullable and adds pairId FK for doubles tournaments
-- Adds groupParticipants reverse relation to DoublesPair

-- AlterTable: Make playerId nullable
ALTER TABLE "GroupParticipant" ALTER COLUMN "playerId" DROP NOT NULL;

-- AlterTable: Add pairId column
ALTER TABLE "GroupParticipant" ADD COLUMN "pairId" TEXT;

-- CreateIndex: Add pairId index
CREATE INDEX "GroupParticipant_pairId_idx" ON "GroupParticipant"("pairId");

-- CreateIndex: Add unique constraint for (groupId, pairId)
CREATE UNIQUE INDEX "GroupParticipant_groupId_pairId_key" ON "GroupParticipant"("groupId", "pairId");

-- AddForeignKey: pairId -> DoublesPair
ALTER TABLE "GroupParticipant" ADD CONSTRAINT "GroupParticipant_pairId_fkey"
  FOREIGN KEY ("pairId") REFERENCES "DoublesPair"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
