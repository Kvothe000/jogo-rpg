-- AlterTable
ALTER TABLE "NPCTemplate" ADD COLUMN     "types" TEXT[] DEFAULT ARRAY[]::TEXT[];
