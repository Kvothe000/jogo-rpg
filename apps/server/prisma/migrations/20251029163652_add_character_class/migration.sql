-- CreateEnum
CREATE TYPE "CharacterClass" AS ENUM ('BRUTE', 'STALKER', 'ADEPT');

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "class" "CharacterClass" NOT NULL DEFAULT 'BRUTE';
