/*
  Warnings:

  - You are about to drop the column `class` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `maxMp` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `mp` on the `Character` table. All the data in the column will be lost.
  - Added the required column `mapId` to the `Character` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CharacterStatus" AS ENUM ('LOCKED', 'AWAKENED');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('EQUIPMENT', 'CONSUMABLE', 'QUEST_ITEM', 'MATERIAL');

-- CreateEnum
CREATE TYPE "EquipSlot" AS ENUM ('WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'ACCESSORY');

-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('LOCKED', 'ACTIVE', 'COMPLETED');

-- AlterTable
ALTER TABLE "Character" DROP COLUMN "class",
DROP COLUMN "maxMp",
DROP COLUMN "mp",
ADD COLUMN     "eco" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "mapId" TEXT NOT NULL,
ADD COLUMN     "maxEco" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "status" "CharacterStatus" NOT NULL DEFAULT 'LOCKED',
ALTER COLUMN "xp" SET DATA TYPE BIGINT,
ALTER COLUMN "gold" SET DEFAULT 100;

-- CreateTable
CREATE TABLE "GameMap" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "exits" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "GameMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NPCTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isHostile" BOOLEAN NOT NULL DEFAULT false,
    "stats" JSONB NOT NULL DEFAULT '{}',
    "lootTable" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "NPCTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NPCInstance" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "currentHp" INTEGER,

    CONSTRAINT "NPCInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faction" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Faction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reputation" (
    "id" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "characterId" TEXT NOT NULL,
    "factionId" TEXT NOT NULL,

    CONSTRAINT "Reputation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PowerKeyword" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "PowerKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterPowerKeyword" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "powerKeywordId" TEXT NOT NULL,

    CONSTRAINT "CharacterPowerKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "slot" "EquipSlot",
    "stats" JSONB NOT NULL DEFAULT '{}',
    "price" INTEGER,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventorySlot" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isEquipped" BOOLEAN NOT NULL DEFAULT false,
    "characterId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "InventorySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ecoCost" INTEGER NOT NULL DEFAULT 10,
    "effectData" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterSkill" (
    "id" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "characterId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "CharacterSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requiredLevel" INTEGER NOT NULL DEFAULT 1,
    "requiredQuestId" TEXT,
    "objectives" JSONB NOT NULL,
    "rewards" JSONB NOT NULL,
    "startNpcId" TEXT NOT NULL,
    "endNpcId" TEXT NOT NULL,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterQuest" (
    "id" TEXT NOT NULL,
    "status" "QuestStatus" NOT NULL DEFAULT 'ACTIVE',
    "progress" JSONB NOT NULL,
    "characterId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,

    CONSTRAINT "CharacterQuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PowerKeywordToSkill" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PowerKeywordToSkill_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Faction_name_key" ON "Faction"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Reputation_characterId_factionId_key" ON "Reputation"("characterId", "factionId");

-- CreateIndex
CREATE UNIQUE INDEX "PowerKeyword_name_key" ON "PowerKeyword"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterPowerKeyword_characterId_powerKeywordId_key" ON "CharacterPowerKeyword"("characterId", "powerKeywordId");

-- CreateIndex
CREATE UNIQUE INDEX "Item_name_key" ON "Item"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterSkill_characterId_skillId_key" ON "CharacterSkill"("characterId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterQuest_characterId_questId_key" ON "CharacterQuest"("characterId", "questId");

-- CreateIndex
CREATE INDEX "_PowerKeywordToSkill_B_index" ON "_PowerKeywordToSkill"("B");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "GameMap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NPCInstance" ADD CONSTRAINT "NPCInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NPCTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NPCInstance" ADD CONSTRAINT "NPCInstance_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "GameMap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reputation" ADD CONSTRAINT "Reputation_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reputation" ADD CONSTRAINT "Reputation_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "Faction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterPowerKeyword" ADD CONSTRAINT "CharacterPowerKeyword_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterPowerKeyword" ADD CONSTRAINT "CharacterPowerKeyword_powerKeywordId_fkey" FOREIGN KEY ("powerKeywordId") REFERENCES "PowerKeyword"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySlot" ADD CONSTRAINT "InventorySlot_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySlot" ADD CONSTRAINT "InventorySlot_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSkill" ADD CONSTRAINT "CharacterSkill_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSkill" ADD CONSTRAINT "CharacterSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_startNpcId_fkey" FOREIGN KEY ("startNpcId") REFERENCES "NPCTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_endNpcId_fkey" FOREIGN KEY ("endNpcId") REFERENCES "NPCTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterQuest" ADD CONSTRAINT "CharacterQuest_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterQuest" ADD CONSTRAINT "CharacterQuest_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PowerKeywordToSkill" ADD CONSTRAINT "_PowerKeywordToSkill_A_fkey" FOREIGN KEY ("A") REFERENCES "PowerKeyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PowerKeywordToSkill" ADD CONSTRAINT "_PowerKeywordToSkill_B_fkey" FOREIGN KEY ("B") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
