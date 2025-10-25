/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import type { UserPayload } from 'src/auth/types/user-payload.type';
import { CombatInstance, CombatUpdatePayload } from './types/combat.type';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Item } from '@prisma/client';
import { LootDropPayload } from 'src/game/types/socket-with-auth.type';

@Injectable()
export class BattleService {
  private activeCombats = new Map<string, CombatInstance>();

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  private calculateDamage(
    attackerStats: any,
    defenderStats: any,
    attackerIsPlayer: boolean,
  ): number {
    const attackPower = attackerIsPlayer
      ? attackerStats.strength
      : attackerStats.attack;
    const level = attackerIsPlayer ? attackerStats.level : 1;
    const defense = attackerIsPlayer
      ? defenderStats.defense
      : defenderStats.constitution;

    const baseDamage = (attackPower ?? 5) + (level ?? 1) * 2;
    const finalDamage = Math.max(1, baseDamage - (defense ?? 0));

    return Math.floor(finalDamage);
  }

  async initializeCombat(
    player: UserPayload,
    monsterTemplateId: string,
  ): Promise<CombatInstance | null> {
    if (!player.character) return null;
    if (this.activeCombats.has(player.character.id)) return null;

    const monsterTemplate = await this.prisma.nPCTemplate.findUnique({
      where: { id: monsterTemplateId, isHostile: true },
    });

    if (!monsterTemplate || !monsterTemplate.isHostile) return null;

    const stats = monsterTemplate.stats as any;

    const newCombat: CombatInstance = {
      id: player.character.id,
      playerId: player.character.id,
      playerHp: player.character.hp,
      playerMaxHp: player.character.maxHp,
      monsterTemplate: monsterTemplate,
      monsterHp: stats.hp ?? 100,
      monsterMaxHp: stats.hp ?? 100,
      lastAction: Date.now(),
      monsterName: '',
    };

    this.activeCombats.set(player.character.id, newCombat);
    return newCombat;
  }

  async processPlayerAttack(
    playerId: string,
  ): Promise<CombatUpdatePayload | null> {
    const combat = this.activeCombats.get(playerId);
    if (!combat) return null; // Não está em combate

    const playerStats = await this.prisma.character.findUnique({
      where: { id: playerId },
      select: {
        strength: true,
        level: true,
        constitution: true,
        hp: true,
        maxHp: true,
      },
    });

    if (!playerStats) return null; // Jogador não encontrado

    const monsterStats = combat.monsterTemplate.stats as any;
    const monsterDefense = monsterStats.defense ?? 0;

    // 1. Dano do Jogador -> Monstro
    const playerDamage = this.calculateDamage(
      playerStats,
      { defense: monsterDefense },
      true,
    );
    combat.monsterHp = Math.max(0, combat.monsterHp - playerDamage);

    const log: string[] = [
      `Você ataca ${combat.monsterTemplate.name} e causa ${playerDamage} de dano.`,
    ];

    // 2. Monstro Morre? -> FIM DO COMBATE (SEM RETORNO DE PAYLOAD)
    if (combat.monsterHp <= 0) {
      log.push(`Você derrotou ${combat.monsterTemplate.name}!`);

      // Processar recompensas e terminar combate
      await this.handleCombatWin(playerId, combat, log);
      this.endCombat(playerId, 'win', log);
      return null; // <-- NÃO RETORNA PAYLOAD DE UPDATE
    }

    // 3. Dano do Monstro -> Jogador
    const monsterDamage = this.calculateDamage(
      monsterStats,
      playerStats,
      false,
    );
    combat.playerHp = Math.max(0, combat.playerHp - monsterDamage);
    log.push(
      `${combat.monsterTemplate.name} contra-ataca e causa ${monsterDamage} de dano.`,
    );

    // Atualizar HP do jogador no DB (importante!)
    await this.prisma.character.update({
      where: { id: playerId },
      data: { hp: combat.playerHp },
    });

    // 4. Jogador Morre? -> FIM DO COMBATE (SEM RETORNO DE PAYLOAD)
    if (combat.playerHp <= 0) {
      log.push(`Você foi derrotado por ${combat.monsterTemplate.name}...`);
      this.endCombat(playerId, 'loss', log);
      return null; // <-- NÃO RETORNA PAYLOAD DE UPDATE
    }

    // 5. Se NINGUÉM morreu, retorna o estado atualizado
    return this.getCombatUpdatePayload(combat, log);
  }

  // --- LÓGICA DE VITÓRIA ATUALIZADA ---
  private async handleCombatWin(
    playerId: string,
    combat: CombatInstance,
    log: string[],
  ): Promise<void> {
    const char = await this.prisma.character.findUnique({
      where: { id: playerId },
      include: { inventory: { include: { item: true } } },
    });

    if (!char) return;

    const monsterStats = combat.monsterTemplate.stats as any;
    const xpGanho = monsterStats.xp ?? 50;
    const goldGanho = Math.floor(
      Math.random() * (monsterStats.goldMax - monsterStats.goldMin + 1) +
        monsterStats.goldMin,
    );

    // --- LÓGICA DE LOOT ---
    const droppedItems: LootDropPayload[] = [];
    const lootTable = combat.monsterTemplate.lootTable as any;

    if (lootTable?.drops && Array.isArray(lootTable.drops)) {
      for (const dropInfo of lootTable.drops) {
        if (Math.random() < (dropInfo.chance ?? 0)) {
          const quantity = Math.floor(
            Math.random() * (dropInfo.maxQty - dropInfo.minQty + 1) +
              dropInfo.minQty,
          );

          const itemTemplate = await this.prisma.item.findUnique({
            where: { id: dropInfo.itemId },
          });

          if (itemTemplate && quantity > 0) {
            droppedItems.push({
              itemId: itemTemplate.id,
              itemName: itemTemplate.name,
              quantity: quantity,
            });
          }
        }
      }
    }

    // --- TRANSAÇÃO PARA ATUALIZAR TUDO ---
    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. Calcular Level Up
        const novoXp = char.xp + BigInt(xpGanho);
        let novoLevel = char.level;
        const levelUpData: any = {};
        const xpParaProximoLevel = char.level * 1000;

        if (novoXp >= BigInt(xpParaProximoLevel)) {
          novoLevel = char.level + 1;
          const novoMaxHp = char.maxHp + 50;
          const novoMaxEco = char.maxEco + 20;

          Object.assign(levelUpData, {
            level: novoLevel,
            maxHp: novoMaxHp,
            maxEco: novoMaxEco,
            hp: novoMaxHp,
            eco: novoMaxEco,
          });

          log.push(`✨ LEVEL UP! Você alcançou o Nível ${novoLevel}!`);
        }

        // 2. Atualizar Character (XP, Gold, Level)
        await tx.character.update({
          where: { id: playerId },
          data: {
            xp: novoXp,
            gold: char.gold + goldGanho,
            ...levelUpData,
          },
        });

        // 3. Adicionar Itens ao Inventário
        for (const drop of droppedItems) {
          const existingSlot = char.inventory.find(
            (slot) => slot.itemId === drop.itemId && !slot.isEquipped,
          );

          if (existingSlot) {
            await tx.inventorySlot.update({
              where: { id: existingSlot.id },
              data: { quantity: existingSlot.quantity + drop.quantity },
            });
          } else {
            await tx.inventorySlot.create({
              data: {
                characterId: playerId,
                itemId: drop.itemId,
                quantity: drop.quantity,
                isEquipped: false,
              },
            });
          }
        }
      });

      // --- EMITIR EVENTOS APÓS TRANSAÇÃO BEM-SUCEDIDA ---

      // Buscar dados atualizados para o evento
      const updatedChar = await this.prisma.character.findUnique({
        where: { id: playerId },
      });

      if (updatedChar) {
        // Evento principal com stats atualizados
        this.eventEmitter.emit('combat.win.stats', {
          // CORRIGIDO: 'combat.win.stats'
          playerId: playerId,
          newTotalXp: updatedChar.xp.toString(),
          goldGained: goldGanho,
          newLevel:
            updatedChar.level > char.level ? updatedChar.level : undefined,
        });
      }

      // Evento de loot separado
      if (droppedItems.length > 0) {
        this.eventEmitter.emit('combat.win.loot', {
          playerId: playerId,
          drops: droppedItems,
        });
        log.push(
          `\n[LOOT] Você obteve: ${droppedItems.map((d) => `${d.quantity}x ${d.itemName}`).join(', ')}`,
        );
      }

      log.push(`\n[RECOMPENSA] Você ganhou ${xpGanho} XP e ${goldGanho} Ouro!`);
    } catch (error) {
      console.error('[BattleService] Falha na transação de vitória:', error);
      log.push('\n[ERRO] Falha ao processar recompensas.');
    }
  }

  // --- FIM DE COMBATE (SIMPLIFICADO) ---
  private endCombat(
    playerId: string,
    result: 'win' | 'loss' | 'flee',
    log: string[],
  ): void {
    const combat = this.activeCombats.get(playerId);
    if (!combat) return;

    this.activeCombats.delete(playerId);

    // Emitir evento de fim de combate
    this.eventEmitter.emit('combat.end', {
      playerId: playerId,
      result: result,
    });
  }

  // --- UTILS ---
  getCombat(playerId: string): CombatInstance | undefined {
    return this.activeCombats.get(playerId);
  }

  private getCombatUpdatePayload(
    combat: CombatInstance,
    log: string[],
  ): CombatUpdatePayload {
    return {
      isActive: combat.playerHp > 0 && combat.monsterHp > 0,
      monsterName: combat.monsterTemplate.name,
      playerHp: combat.playerHp,
      playerMaxHp: combat.playerMaxHp,
      monsterHp: combat.monsterHp,
      monsterMaxHp: combat.monsterMaxHp,
      log: log,
      isPlayerTurn: true,
    };
  }
}
