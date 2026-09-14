-- CreateTable
CREATE TABLE "WordList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Word" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "hint" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "wordListId" TEXT NOT NULL,
    CONSTRAINT "Word_wordListId_fkey" FOREIGN KEY ("wordListId") REFERENCES "WordList" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Phoneme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "wordId" TEXT NOT NULL,
    CONSTRAINT "Phoneme_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "showHints" BOOLEAN NOT NULL DEFAULT true,
    "maxGuesses" INTEGER,
    "gridRows" INTEGER,
    "gridColumns" INTEGER,
    "includeAnswerKey" BOOLEAN NOT NULL DEFAULT false,
    "outputFilename" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "wordListId" TEXT NOT NULL,
    CONSTRAINT "Activity_wordListId_fkey" FOREIGN KEY ("wordListId") REFERENCES "WordList" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Word_wordListId_idx" ON "Word"("wordListId");

-- CreateIndex
CREATE UNIQUE INDEX "Word_wordListId_text_key" ON "Word"("wordListId", "text");

-- CreateIndex
CREATE INDEX "Phoneme_wordId_idx" ON "Phoneme"("wordId");

-- CreateIndex
CREATE UNIQUE INDEX "Phoneme_wordId_position_key" ON "Phoneme"("wordId", "position");

-- CreateIndex
CREATE INDEX "Activity_wordListId_idx" ON "Activity"("wordListId");

-- CreateIndex
CREATE INDEX "Activity_activityType_idx" ON "Activity"("activityType");
