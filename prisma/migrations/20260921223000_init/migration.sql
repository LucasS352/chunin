-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "sid" VARCHAR(255) NOT NULL,
    "sess" JSONB NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "projectName" TEXT NOT NULL DEFAULT 'Tutu (Arthur)',
    "age" INTEGER NOT NULL DEFAULT 12,
    "startDate" TEXT NOT NULL DEFAULT '2026-09-21',
    "endDate" TEXT NOT NULL DEFAULT '2026-11-21',
    "baselinePushups" INTEGER NOT NULL DEFAULT 20,
    "baselineAbs" INTEGER NOT NULL DEFAULT 100,
    "baselinePlank" INTEGER NOT NULL DEFAULT 126,
    "baselineHeight" DOUBLE PRECISION NOT NULL DEFAULT 150.0,
    "baselineWeight" DOUBLE PRECISION NOT NULL DEFAULT 50.4,
    "baselineNote" TEXT NOT NULL DEFAULT 'Marco Zero do projeto.',
    "auraBonus" INTEGER NOT NULL DEFAULT 0,
    "historyFilter" TEXT NOT NULL DEFAULT '7',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rank" TEXT NOT NULL DEFAULT 'B',
    "auraReward" INTEGER NOT NULL DEFAULT 10,
    "daysOfWeek" INTEGER[],
    "note" TEXT DEFAULT '',
    "isFixed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TEXT NOT NULL DEFAULT '2026-09-21',
    "archivedAt" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RoutineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionRecord" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "routineItemId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT true,
    "auraEarned" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT DEFAULT '',
    "completedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MissionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalAssessment" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "pushups" INTEGER,
    "abs" INTEGER,
    "plankSeconds" INTEGER,
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "observation" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PhysicalAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCheckin" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "mood" TEXT,
    "energy" INTEGER,
    "observation" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL,
    "rank" TEXT NOT NULL DEFAULT 'B',
    "auraReward" INTEGER NOT NULL DEFAULT 15,
    "note" TEXT DEFAULT '',
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TEXT,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeekPlan" (
    "id" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "plannedAt" TEXT NOT NULL,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "confirmed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WeekPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "IDX_session_expire" ON "session"("expire");
CREATE UNIQUE INDEX "MissionRecord_date_routineItemId_key" ON "MissionRecord"("date", "routineItemId");
CREATE UNIQUE INDEX "DailyCheckin_date_key" ON "DailyCheckin"("date");
CREATE UNIQUE INDEX "WeekPlan_weekStart_key" ON "WeekPlan"("weekStart");

