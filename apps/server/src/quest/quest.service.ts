import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { QuestStatus } from '@prisma/client';
import { InventoryService } from 'src/inventory/inventory.service';

@Injectable()
export class QuestService {
    private readonly logger = new Logger(QuestService.name);

    constructor(
        private prisma: PrismaService,
        private inventoryService: InventoryService
    ) { }

    async getActiveQuests(characterId: string) {
        return this.prisma.characterQuest.findMany({
            where: {
                characterId,
                status: 'ACTIVE'
            },
            include: {
                quest: true
            }
        });
    }

    async startQuest(characterId: string, questId: string) {
        // Verificar se já tem a quest
        const existing = await this.prisma.characterQuest.findUnique({
            where: {
                characterId_questId: {
                    characterId,
                    questId
                }
            }
        });

        if (existing) return null; // Já tem ou já fez

        // Verificar requisitos (implementar depois se necessário)
        const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
        if (!quest) return null;

        const newQuest = await this.prisma.characterQuest.create({
            data: {
                characterId,
                questId,
                status: 'ACTIVE',
                progress: {}, // Inicializa vazio ou com zeros baseado nos objetivos
            },
            include: { quest: true }
        });

        this.logger.log(`Character ${characterId} started quest ${quest.title}`);
        return newQuest;
    }

    async updateProgress(characterId: string, type: 'kill' | 'interact' | 'location', targetId: string, amount: number = 1) {
        const activeQuests = await this.getActiveQuests(characterId);
        let updated = false;

        for (const cq of activeQuests) {
            const objectives = cq.quest.objectives as any;
            let currentProgress = cq.progress as any || {};
            let madeProgress = false;

            // Lógica genérica de progresso
            // Ex: objectives = { "kill": { "monster_id": 5 } }
            //     currentProgress = { "kill_monster_id": 2 }

            if (type === 'kill' && objectives.kill) {
                // Suporta multiplos kills ou um unico tipo
                // Simplificação: objectives.kill = { targetId: 'mon_slime', count: 5 }
                if (objectives.kill.targetId === targetId) {
                    const currentCount = currentProgress.killCount || 0;
                    if (currentCount < objectives.kill.count) {
                        currentProgress.killCount = currentCount + amount;
                        madeProgress = true;
                    }
                }
            } else if (type === 'interact' && objectives.interact) {
                if (objectives.interact.targetId === targetId) {
                    if (!currentProgress.interacted) {
                        currentProgress.interacted = true;
                        madeProgress = true;
                    }
                }
            }

            if (madeProgress) {
                await this.prisma.characterQuest.update({
                    where: { id: cq.id },
                    data: { progress: currentProgress }
                });
                updated = true;

                // Check completion
                if (this.checkCompletion(objectives, currentProgress)) {
                    await this.completeQuest(characterId, cq.questId);
                    return { type: 'COMPLETED', quest: cq.quest };
                }
            }
        }

        return updated ? { type: 'UPDATED' } : null;
    }

    private checkCompletion(objectives: any, progress: any): boolean {
        // Verifica se todos objetivos foram cumpridos
        if (objectives.kill) {
            if ((progress.killCount || 0) < objectives.kill.count) return false;
        }
        if (objectives.interact) {
            if (!progress.interacted) return false;
        }
        return true;
    }

    async completeQuest(characterId: string, questId: string) {
        const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
        if (!quest) return;

        // Update Status
        await this.prisma.characterQuest.update({
            where: {
                characterId_questId: { characterId, questId }
            },
            data: { status: 'COMPLETED' }
        });

        // Give Rewards
        const rewards = quest.rewards as any;

        // XP
        if (rewards.xp) {
            await this.prisma.character.update({
                where: { id: characterId },
                data: { xp: { increment: rewards.xp } } // Nota: XP é BigInt, pode dar conflito se passar Number direto no prisma sem transformar? 
                // Prisma geralmente lida bem com increment de Int em BigInt se definido corretamente, mas cuidado.
                // Melhor garantir que incremente de forma segura.
            });
            // HACK: A atualização de XP/Level deve ser feita via CharacterStatsService idealmente para checar level up.
            // Por enquanto vamos assumir que o Gateway lida com a notificação ou que o player vê depois.
        }

        // Gold
        if (rewards.gold) {
            await this.prisma.character.update({
                where: { id: characterId },
                data: { gold: { increment: rewards.gold } }
            });
        }

        // Items
        if (rewards.itemId) {
            try {
                await this.inventoryService.addItemToInventory(characterId, rewards.itemId, rewards.itemQuantity || 1);
            } catch (e) {
                this.logger.error(`Failed to add reward item ${rewards.itemId} to ${characterId}`, e);
            }
        }

        this.logger.log(`Character ${characterId} completed quest ${quest.title}`);
        return { quest, rewards };
    }
}
