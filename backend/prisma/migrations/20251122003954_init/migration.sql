-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ORGANIZER', 'PLAYER');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('SINGLES', 'DOUBLES');

-- CreateEnum
CREATE TYPE "AgeGroup" AS ENUM ('ALL_AGES', 'AGE_20', 'AGE_25', 'AGE_30', 'AGE_35', 'AGE_40', 'AGE_45', 'AGE_50', 'AGE_55', 'AGE_60', 'AGE_65', 'AGE_70', 'AGE_75', 'AGE_80');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MEN', 'WOMEN', 'MIXED');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('ACTIVE', 'WITHDRAWN', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TournamentRegistrationStatus" AS ENUM ('REGISTERED', 'WAITLISTED', 'WITHDRAWN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WaitlistDisplayOrder" AS ENUM ('REGISTRATION_TIME', 'ALPHABETICAL');

-- CreateEnum
CREATE TYPE "FormatType" AS ENUM ('KNOCKOUT', 'GROUP', 'SWISS', 'COMBINED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BracketType" AS ENUM ('MAIN', 'CONSOLATION', 'PLACEMENT');

-- CreateEnum
CREATE TYPE "MatchGuaranteeType" AS ENUM ('MATCH_1', 'MATCH_2', 'UNTIL_PLACEMENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "changes" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "birthDate" TIMESTAMP(3),
    "gender" "Gender",

    CONSTRAINT "PlayerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "ageGroup" "AgeGroup" NOT NULL,
    "gender" "Gender" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organizer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organizer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "clubName" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" TEXT,
    "locationId" TEXT,
    "backupLocationId" TEXT,
    "courts" INTEGER,
    "capacity" INTEGER,
    "organizerId" TEXT,
    "deputyOrganizerId" TEXT,
    "entryFee" DOUBLE PRECISION,
    "rulesUrl" TEXT,
    "prizeDescription" TEXT,
    "registrationOpenDate" TIMESTAMP(3),
    "registrationCloseDate" TIMESTAMP(3),
    "minParticipants" INTEGER,
    "waitlistDisplayOrder" "WaitlistDisplayOrder" NOT NULL DEFAULT 'REGISTRATION_TIME',
    "formatType" "FormatType" NOT NULL DEFAULT 'KNOCKOUT',
    "formatConfig" TEXT NOT NULL,
    "defaultScoringRules" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "lastStatusChange" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryRegistration" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "hasParticipated" BOOLEAN NOT NULL DEFAULT false,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryRanking" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryRanking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentRegistration" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "status" "TournamentRegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "registrationTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "promotedBy" TEXT,
    "promotedAt" TIMESTAMP(3),
    "demotedBy" TEXT,
    "demotedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "groupNumber" INTEGER NOT NULL,
    "groupSize" INTEGER NOT NULL,
    "ruleOverrides" TEXT,
    "advancementCriteria" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bracket" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "bracketType" "BracketType" NOT NULL,
    "matchGuarantee" "MatchGuaranteeType" NOT NULL,
    "ruleOverrides" TEXT,
    "placementRange" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bracket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "bracketId" TEXT,
    "roundNumber" INTEGER NOT NULL,
    "ruleOverrides" TEXT,
    "earlyTiebreakEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "groupId" TEXT,
    "bracketId" TEXT,
    "roundId" TEXT,
    "matchNumber" INTEGER NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT NOT NULL,
    "pair1Id" TEXT,
    "pair2Id" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "result" TEXT,
    "ruleOverrides" TEXT,
    "completedWithRules" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupParticipant" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "seedPosition" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoublesPair" (
    "id" TEXT NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "seedingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoublesPair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PairRanking" (
    "id" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PairRanking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PairRegistration" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "status" "TournamentRegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "registrationTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eligibilityOverride" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "promotedAt" TIMESTAMP(3),
    "demotedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PairRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_userId_timestamp_idx" ON "AuditLog"("userId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProfile_userId_key" ON "PlayerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProfile_email_key" ON "PlayerProfile"("email");

-- CreateIndex
CREATE INDEX "PlayerProfile_userId_idx" ON "PlayerProfile"("userId");

-- CreateIndex
CREATE INDEX "PlayerProfile_createdBy_idx" ON "PlayerProfile"("createdBy");

-- CreateIndex
CREATE INDEX "PlayerProfile_name_idx" ON "PlayerProfile"("name");

-- CreateIndex
CREATE INDEX "PlayerProfile_email_idx" ON "PlayerProfile"("email");

-- CreateIndex
CREATE INDEX "PlayerProfile_birthDate_idx" ON "PlayerProfile"("birthDate");

-- CreateIndex
CREATE INDEX "PlayerProfile_gender_idx" ON "PlayerProfile"("gender");

-- CreateIndex
CREATE INDEX "Category_type_idx" ON "Category"("type");

-- CreateIndex
CREATE INDEX "Category_ageGroup_idx" ON "Category"("ageGroup");

-- CreateIndex
CREATE INDEX "Category_gender_idx" ON "Category"("gender");

-- CreateIndex
CREATE UNIQUE INDEX "Category_type_ageGroup_gender_key" ON "Category"("type", "ageGroup", "gender");

-- CreateIndex
CREATE UNIQUE INDEX "Organizer_userId_key" ON "Organizer"("userId");

-- CreateIndex
CREATE INDEX "Organizer_userId_idx" ON "Organizer"("userId");

-- CreateIndex
CREATE INDEX "Location_clubName_idx" ON "Location"("clubName");

-- CreateIndex
CREATE INDEX "Tournament_categoryId_idx" ON "Tournament"("categoryId");

-- CreateIndex
CREATE INDEX "Tournament_startDate_idx" ON "Tournament"("startDate");

-- CreateIndex
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");

-- CreateIndex
CREATE INDEX "Tournament_registrationOpenDate_idx" ON "Tournament"("registrationOpenDate");

-- CreateIndex
CREATE INDEX "Tournament_registrationCloseDate_idx" ON "Tournament"("registrationCloseDate");

-- CreateIndex
CREATE INDEX "Tournament_formatType_idx" ON "Tournament"("formatType");

-- CreateIndex
CREATE INDEX "Tournament_locationId_idx" ON "Tournament"("locationId");

-- CreateIndex
CREATE INDEX "Tournament_organizerId_idx" ON "Tournament"("organizerId");

-- CreateIndex
CREATE INDEX "CategoryRegistration_playerId_idx" ON "CategoryRegistration"("playerId");

-- CreateIndex
CREATE INDEX "CategoryRegistration_categoryId_idx" ON "CategoryRegistration"("categoryId");

-- CreateIndex
CREATE INDEX "CategoryRegistration_status_idx" ON "CategoryRegistration"("status");

-- CreateIndex
CREATE INDEX "CategoryRegistration_hasParticipated_idx" ON "CategoryRegistration"("hasParticipated");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryRegistration_playerId_categoryId_key" ON "CategoryRegistration"("playerId", "categoryId");

-- CreateIndex
CREATE INDEX "CategoryRanking_categoryId_rank_idx" ON "CategoryRanking"("categoryId", "rank");

-- CreateIndex
CREATE INDEX "CategoryRanking_playerId_idx" ON "CategoryRanking"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryRanking_playerId_categoryId_key" ON "CategoryRanking"("playerId", "categoryId");

-- CreateIndex
CREATE INDEX "TournamentRegistration_playerId_idx" ON "TournamentRegistration"("playerId");

-- CreateIndex
CREATE INDEX "TournamentRegistration_tournamentId_idx" ON "TournamentRegistration"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentRegistration_status_idx" ON "TournamentRegistration"("status");

-- CreateIndex
CREATE INDEX "TournamentRegistration_tournamentId_status_registrationTime_idx" ON "TournamentRegistration"("tournamentId", "status", "registrationTimestamp");

-- CreateIndex
CREATE INDEX "TournamentRegistration_registrationTimestamp_idx" ON "TournamentRegistration"("registrationTimestamp");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentRegistration_playerId_tournamentId_key" ON "TournamentRegistration"("playerId", "tournamentId");

-- CreateIndex
CREATE INDEX "Group_tournamentId_idx" ON "Group"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "Group_tournamentId_groupNumber_key" ON "Group"("tournamentId", "groupNumber");

-- CreateIndex
CREATE INDEX "Bracket_tournamentId_idx" ON "Bracket"("tournamentId");

-- CreateIndex
CREATE INDEX "Bracket_bracketType_idx" ON "Bracket"("bracketType");

-- CreateIndex
CREATE INDEX "Round_tournamentId_idx" ON "Round"("tournamentId");

-- CreateIndex
CREATE INDEX "Round_bracketId_idx" ON "Round"("bracketId");

-- CreateIndex
CREATE UNIQUE INDEX "Round_tournamentId_bracketId_roundNumber_key" ON "Round"("tournamentId", "bracketId", "roundNumber");

-- CreateIndex
CREATE INDEX "Match_tournamentId_idx" ON "Match"("tournamentId");

-- CreateIndex
CREATE INDEX "Match_groupId_idx" ON "Match"("groupId");

-- CreateIndex
CREATE INDEX "Match_bracketId_idx" ON "Match"("bracketId");

-- CreateIndex
CREATE INDEX "Match_roundId_idx" ON "Match"("roundId");

-- CreateIndex
CREATE INDEX "Match_player1Id_idx" ON "Match"("player1Id");

-- CreateIndex
CREATE INDEX "Match_player2Id_idx" ON "Match"("player2Id");

-- CreateIndex
CREATE INDEX "Match_pair1Id_idx" ON "Match"("pair1Id");

-- CreateIndex
CREATE INDEX "Match_pair2Id_idx" ON "Match"("pair2Id");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "GroupParticipant_groupId_idx" ON "GroupParticipant"("groupId");

-- CreateIndex
CREATE INDEX "GroupParticipant_playerId_idx" ON "GroupParticipant"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupParticipant_groupId_playerId_key" ON "GroupParticipant"("groupId", "playerId");

-- CreateIndex
CREATE INDEX "DoublesPair_player1Id_deletedAt_idx" ON "DoublesPair"("player1Id", "deletedAt");

-- CreateIndex
CREATE INDEX "DoublesPair_player2Id_deletedAt_idx" ON "DoublesPair"("player2Id", "deletedAt");

-- CreateIndex
CREATE INDEX "DoublesPair_categoryId_deletedAt_idx" ON "DoublesPair"("categoryId", "deletedAt");

-- CreateIndex
CREATE INDEX "DoublesPair_categoryId_seedingScore_deletedAt_idx" ON "DoublesPair"("categoryId", "seedingScore", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DoublesPair_player1Id_player2Id_categoryId_key" ON "DoublesPair"("player1Id", "player2Id", "categoryId");

-- CreateIndex
CREATE INDEX "PairRanking_categoryId_rank_idx" ON "PairRanking"("categoryId", "rank");

-- CreateIndex
CREATE INDEX "PairRanking_pairId_idx" ON "PairRanking"("pairId");

-- CreateIndex
CREATE UNIQUE INDEX "PairRanking_pairId_categoryId_key" ON "PairRanking"("pairId", "categoryId");

-- CreateIndex
CREATE INDEX "PairRegistration_tournamentId_status_idx" ON "PairRegistration"("tournamentId", "status");

-- CreateIndex
CREATE INDEX "PairRegistration_tournamentId_registrationTimestamp_idx" ON "PairRegistration"("tournamentId", "registrationTimestamp");

-- CreateIndex
CREATE INDEX "PairRegistration_pairId_status_idx" ON "PairRegistration"("pairId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PairRegistration_tournamentId_pairId_key" ON "PairRegistration"("tournamentId", "pairId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organizer" ADD CONSTRAINT "Organizer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_backupLocationId_fkey" FOREIGN KEY ("backupLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_deputyOrganizerId_fkey" FOREIGN KEY ("deputyOrganizerId") REFERENCES "Organizer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryRegistration" ADD CONSTRAINT "CategoryRegistration_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryRegistration" ADD CONSTRAINT "CategoryRegistration_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryRanking" ADD CONSTRAINT "CategoryRanking_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryRanking" ADD CONSTRAINT "CategoryRanking_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bracket" ADD CONSTRAINT "Bracket_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "Bracket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "Bracket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "PlayerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "PlayerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_pair1Id_fkey" FOREIGN KEY ("pair1Id") REFERENCES "DoublesPair"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_pair2Id_fkey" FOREIGN KEY ("pair2Id") REFERENCES "DoublesPair"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupParticipant" ADD CONSTRAINT "GroupParticipant_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupParticipant" ADD CONSTRAINT "GroupParticipant_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoublesPair" ADD CONSTRAINT "DoublesPair_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "PlayerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoublesPair" ADD CONSTRAINT "DoublesPair_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "PlayerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoublesPair" ADD CONSTRAINT "DoublesPair_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PairRanking" ADD CONSTRAINT "PairRanking_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "DoublesPair"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PairRanking" ADD CONSTRAINT "PairRanking_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PairRegistration" ADD CONSTRAINT "PairRegistration_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PairRegistration" ADD CONSTRAINT "PairRegistration_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "DoublesPair"("id") ON DELETE CASCADE ON UPDATE CASCADE;
