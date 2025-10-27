/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import type { UserPayload } from 'src/auth/types/user-payload.type';
import { CombatInstance, CombatUpdatePayload } from './types/combat.type';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LootDropPayload } from 'src/game/types/socket-with-auth.type';
import { CharacterStatsService } from 'src/character-stats/character-stats.service';
import { SkillService } from 'src/skill/skill.service';
import { Prisma, Skill } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';

// --- Definição (simplificada) dos tipos de efeito que esperamos no JSON ---
interface EffectBase {
  type: string;
  chance?: number;
}
interface DamageEffect extends EffectBase {
  type: 'damage';
  value: number;
  element?: string;
  bonusCriticalChance?: number;
  bonusVsType?: string[];
  defensePenetration?: number;
}
interface StatusEffect extends EffectBase {
  type: 'status';
  effect: string;
  duration: number;
}
interface HealEffect extends EffectBase {
  type: 'heal';
  value: number;
}
interface BuffDebuffEffect extends EffectBase {
  type: 'buff' | 'debuff';
  stat: string;
  value: number;
  duration: number;
}
interface AoEEffect extends EffectBase {
  type: 'aoe';
  radius: number;
  duration?: number;
  effects: SkillEffect[];
}
interface DamageOverTimeEffect extends EffectBase {
  type: 'damage_over_time';
  value: number;
  element?: string;
  duration: number;
  interval: number;
}
interface CleanseEffect extends EffectBase {
  type: 'cleanse';
  effectType: 'negative' | 'positive' | 'all';
  count: number;
}

type SkillEffect =
  | DamageEffect
  | StatusEffect
  | HealEffect
  | BuffDebuffEffect
  | AoEEffect
  | DamageOverTimeEffect
  | CleanseEffect;

@Injectable()
export class BattleService {
  private activeCombats = new Map<string, CombatInstance>();

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private characterStatsService: CharacterStatsService,
    private skillService: SkillService,
  ) {}

  // --- LÓGICA DE DANO MELHORADA ---
  private calculateDamage(
    attackerTotalStats: any,
    defenderTotalStats: any,
    attackerIsPlayer: boolean,
    attackerLevel: number,
  ): number {
    const attackPower = attackerIsPlayer
      ? attackerTotalStats.totalStrength
      : attackerTotalStats.attack;
    const defense = attackerIsPlayer
      ? defenderTotalStats.defense
      : defenderTotalStats.totalConstitution;

    const baseDamage = (attackPower ?? 5) + (attackerLevel ?? 1) * 2;
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
      monsterName: monsterTemplate.name,
    };

    this.activeCombats.set(player.character.id, newCombat);
    return newCombat;
  }

  async processPlayerAttack(
    playerId: string,
  ): Promise<CombatUpdatePayload | null> {
    console.log(`[BattleService] processPlayerAttack chamado para ${playerId}`);

    const combat = this.activeCombats.get(playerId);
    if (!combat) {
      console.log(`[BattleService] Nenhum combate ativo para ${playerId}`);
      return null;
    }

    const log: string[] = [];

    try {
      // Obter Eco atualizado do DB (necessário aqui também)
      const charCurrentStats = await this.prisma.character.findUnique({
        where: { id: playerId },
        select: { hp: true, eco: true, maxEco: true }, // Pegar HP e Eco atuais
      });
      if (!charCurrentStats)
        throw new NotFoundException(
          'Personagem desapareceu durante o combate?',
        );

      combat.playerHp = charCurrentStats.hp; // Sincroniza HP antes do turno do monstro

      const playerTotalStats =
        await this.characterStatsService.calculateTotalStats(playerId);
      const playerLevel =
        (
          await this.prisma.character.findUnique({
            where: { id: playerId },
            select: { level: true },
          })
        )?.level ?? 1;

      const monsterStats = combat.monsterTemplate.stats as any;
      const monsterTotalStats = {
        totalConstitution: monsterStats.constitution ?? 5,
        defense: monsterStats.defense ?? 0,
        attack: monsterStats.attack ?? 0,
      };

      // 1. Dano do Jogador -> Monstro
      const playerDamage = this.calculateDamage(
        playerTotalStats,
        monsterTotalStats,
        true,
        playerLevel,
      );
      combat.monsterHp = Math.max(0, combat.monsterHp - playerDamage);

      log.push(
        `Você ataca ${combat.monsterTemplate.name} e causa ${playerDamage} de dano.`,
      );

      // 2. Monstro Morre?
      if (combat.monsterHp <= 0) {
        console.log(
          `[BattleService] Monstro derrotado! Chamando handleCombatWin para ${playerId}`,
        );
        log.push(`Você derrotou ${combat.monsterTemplate.name}!`);

        await this.handleCombatWin(playerId, combat, log);
        this.endCombat(playerId, 'win', log);
        return null;
      }

      // 3. Dano do Monstro -> Jogador
      const monsterDamage = this.calculateDamage(
        monsterStats,
        playerTotalStats,
        false,
        1,
      );
      combat.playerHp = Math.max(0, combat.playerHp - monsterDamage);
      log.push(
        `${combat.monsterTemplate.name} contra-ataca e causa ${monsterDamage} de dano.`,
      );

      // Atualizar HP do jogador no DB
      await this.prisma.character.update({
        where: { id: playerId },
        data: { hp: combat.playerHp },
      });

      // 4. Jogador Morre?
      if (combat.playerHp <= 0) {
        log.push(`Você foi derrotado por ${combat.monsterTemplate.name}...`);
        this.endCombat(playerId, 'loss', log);
        return null;
      }

      // 5. Se NINGUÉM morreu, retorna o estado atualizado
      combat.lastAction = Date.now();
      // Passa o eco e maxEco atuais para getCombatUpdatePayload
      return this.getCombatUpdatePayload(
        combat,
        log,
        charCurrentStats.eco,
        charCurrentStats.maxEco,
      );
    } catch (error) {
      console.error(
        `[BattleService] Erro ao processar ataque para ${playerId}:`,
        error,
      );
      this.eventEmitter.emit('combat.error', {
        playerId: playerId,
        message: 'Erro interno ao processar ataque.',
      });
      return null;
    }
  }

  // --- NOVA FUNÇÃO PARA PROCESSAR SKILL ---
  async processPlayerSkill(
    playerId: string,
    skillId: string,
  ): Promise<CombatUpdatePayload | null> {
    console.log(
      `[BattleService] processPlayerSkill chamado para ${playerId} usando skill ${skillId}`,
    );

    const combat = this.activeCombats.get(playerId);
    if (!combat) {
      console.log(
        `[BattleService] Nenhum combate ativo para ${playerId} ao usar skill`,
      );
      throw new HttpException(
        'Você não está em combate.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const log: string[] = [];

    try {
      // --- VALIDAÇÕES ---
      const [characterData, learnedSkillEntry, skillData] = await Promise.all([
        this.prisma.character.findUnique({
          where: { id: playerId },
          select: { eco: true, level: true, maxEco: true },
        }),
        this.prisma.characterSkill.findUnique({
          where: {
            characterId_skillId: { characterId: playerId, skillId: skillId },
          },
        }),
        this.prisma.skill.findUnique({
          where: { id: skillId },
        }),
      ]);

      if (!characterData)
        throw new NotFoundException('Personagem não encontrado.');
      if (!skillData)
        throw new NotFoundException(`Skill ${skillId} não encontrada.`);
      if (!learnedSkillEntry)
        throw new ConflictException('Você não conhece esta skill.');

      if (characterData.eco < skillData.ecoCost) {
        throw new ConflictException(
          `Eco insuficiente para usar ${skillData.name} (Custo: ${skillData.ecoCost}, Atual: ${characterData.eco}).`,
        );
      }

      // --- CALCULAR STATS ---
      const playerTotalStats =
        await this.characterStatsService.calculateTotalStats(playerId);
      const playerLevel = characterData.level ?? 1;
      const monsterStats = combat.monsterTemplate.stats as any;
      const monsterTotalStats = {
        totalConstitution: monsterStats.constitution ?? 5,
        defense: monsterStats.defense ?? 0,
        attack: monsterStats.attack ?? 0,
      };

      // --- DEDUZIR ECO ---
      const newEco = characterData.eco - skillData.ecoCost;
      await this.prisma.character.update({
        where: { id: playerId },
        data: { eco: newEco },
      });
      log.push(`Você usa ${skillData.name} (Eco: -${skillData.ecoCost}).`);

      // --- APLICAR EFEITOS DA SKILL ---
      const effectsInput = skillData.effectData;
      const effects: SkillEffect[] = Array.isArray(effectsInput)
        ? (effectsInput as unknown as SkillEffect[])
        : [effectsInput as unknown as SkillEffect];

      for (const effect of effects) {
        if (
          typeof effect !== 'object' ||
          effect === null ||
          !('type' in effect)
        ) {
          log.push(`Ignorando efeito inválido: ${JSON.stringify(effect)}`);
          continue;
        }

        // Verificar chance, se houver
        if (effect.chance !== undefined && Math.random() > effect.chance) {
          log.push(`O efeito ${effect.type} falhou (chance).`);
          continue;
        }

        // Now TypeScript should allow accessing effect.type
        switch (effect.type) {
          case 'damage': {
            const damageEffect = effect;
            const damageValue =
              damageEffect.value + (playerTotalStats.totalIntelligence ?? 0);
            const finalDamage = Math.max(
              1,
              damageValue - (monsterTotalStats.defense ?? 0),
            );
            combat.monsterHp = Math.max(0, combat.monsterHp - finalDamage);
            log.push(
              `A skill causa ${finalDamage} de dano ${damageEffect.element ?? ''} a ${combat.monsterName}.`,
            );
            break;
          }
          case 'heal': {
            const healEffect = effect;
            combat.playerHp = Math.min(
              combat.playerMaxHp,
              combat.playerHp + healEffect.value,
            );
            log.push(`Você se cura em ${healEffect.value} HP.`);
            break;
          }
          case 'status': {
            const statusEffect = effect;
            log.push(
              `${combat.monsterName} é afetado por ${statusEffect.effect} por ${statusEffect.duration} turnos.`,
            );
            break;
          }
          case 'buff':
          case 'debuff': {
            const buffDebuffEffect = effect;
            log.push(
              `Você ${buffDebuffEffect.type === 'buff' ? 'recebe' : 'aplica'} ${buffDebuffEffect.stat} (${buffDebuffEffect.value > 0 ? '+' : ''}${buffDebuffEffect.value * 100}%) por ${buffDebuffEffect.duration} turnos.`,
            );
            break;
          }
          case 'aoe': {
            const aoeEffect = effect;
            log.push(
              `Efeito 'aoe' ainda não implementado (Raio: ${aoeEffect.radius}).`,
            );
            break;
          }
          case 'damage_over_time': {
            const dotEffect = effect;
            log.push(
              `Efeito 'damage_over_time' ainda não implementado (Valor: ${dotEffect.value}, Duração: ${dotEffect.duration}).`,
            );
            break;
          }
          case 'cleanse': {
            const cleanseEffect = effect;
            log.push(
              `Efeito 'cleanse' ainda não implementado (Tipo: ${cleanseEffect.effectType}, Contagem: ${cleanseEffect.count}).`,
            );
            break;
          }
          default:
            log.push(`Efeito desconhecido: ${(effect as EffectBase).type}`);
        }

        // Verificar se o monstro morreu após este efeito específico
        if (combat.monsterHp <= 0) break;
      }

      // --- VERIFICAR FIM DO COMBATE (MONSTRO MORREU) ---
      if (combat.monsterHp <= 0) {
        console.log(
          `[BattleService] Monstro derrotado por skill! Chamando handleCombatWin para ${playerId}`,
        );
        log.push(`Você derrotou ${combat.monsterTemplate.name}!`);
        await this.handleCombatWin(playerId, combat, log);
        this.endCombat(playerId, 'win', log);
        return null;
      }

      // --- TURNO DO MONSTRO (CONTRA-ATAQUE) ---
      const monsterDamage = this.calculateDamage(
        monsterStats,
        playerTotalStats,
        false,
        1,
      );
      combat.playerHp = Math.max(0, combat.playerHp - monsterDamage);
      log.push(
        `${combat.monsterTemplate.name} contra-ataca e causa ${monsterDamage} de dano.`,
      );

      // Atualizar HP do jogador no DB após contra-ataque
      await this.prisma.character.update({
        where: { id: playerId },
        data: { hp: combat.playerHp },
      });

      // --- VERIFICAR FIM DO COMBATE (JOGADOR MORREU) ---
      if (combat.playerHp <= 0) {
        log.push(`Você foi derrotado por ${combat.monsterTemplate.name}...`);
        this.endCombat(playerId, 'loss', log);
        return null;
      }

      // --- ATUALIZAR TIMESTAMP E RETORNAR ESTADO ---
      combat.lastAction = Date.now();
      // Passa o newEco calculado e maxEco para getCombatUpdatePayload
      return this.getCombatUpdatePayload(
        combat,
        log,
        newEco,
        characterData.maxEco,
      );
    } catch (error) {
      console.error(
        `[BattleService] Erro ao processar skill ${skillId} para ${playerId}:`,
        error,
      );
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Erro interno ao usar skill.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // --- LÓGICA DE VITÓRIA ---
  private async handleCombatWin(
    playerId: string,
    combat: CombatInstance,
    log: string[],
  ): Promise<void> {
    console.log(`[BattleService] handleCombatWin iniciado para ${playerId}`);

    const char = await this.prisma.character.findUnique({
      where: { id: playerId },
      include: { inventory: { include: { item: true } } },
    });

    if (!char) {
      console.log(`[BattleService] Personagem não encontrado: ${playerId}`);
      return;
    }

    const monsterStats = combat.monsterTemplate.stats as any;
    const xpGanho = monsterStats.xp ?? 50;
    const goldGanho = Math.floor(
      Math.random() * (monsterStats.goldMax - monsterStats.goldMin + 1) +
        monsterStats.goldMin,
    );

    console.log(
      `[BattleService] Recompensas calculadas: ${xpGanho} XP, ${goldGanho} Ouro`,
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

    console.log(`[BattleService] Itens dropados: ${droppedItems.length}`);

    // --- TRANSAÇÃO PARA ATUALIZAR TUDO ---
    let transactionSuccess = false;
    let updatedChar: any = null;

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
          console.log(
            `[BattleService] Level Up detectado: ${char.level} -> ${novoLevel}`,
          );
        }

        // 2. Atualizar Character (XP, Gold, Level)
        updatedChar = await tx.character.update({
          where: { id: playerId },
          data: {
            xp: novoXp,
            gold: char.gold + goldGanho,
            ...levelUpData,
          },
        });

        console.log(
          `[BattleService] Personagem atualizado no DB: XP=${updatedChar.xp}, Gold=${updatedChar.gold}, Level=${updatedChar.level}`,
        );

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

        transactionSuccess = true;
      });
    } catch (error) {
      console.error('[BattleService] Falha na transação de vitória:', error);
      log.push('\n[ERRO] Falha ao processar recompensas.');
      return;
    }

    // --- EMITIR EVENTOS APÓS TRANSAÇÃO BEM-SUCEDIDA ---
    if (transactionSuccess && updatedChar) {
      console.log(
        `[BattleService] Emitindo eventos de vitória para player ${playerId}`,
      );

      // Evento principal com stats atualizados
      try {
        console.log(
          `[BattleService DEBUG] PRESTES A EMITIR combat.win.stats para ${playerId}. Payload:`,
          {
            playerId: playerId,
            newTotalXp: updatedChar.xp.toString(),
            goldGained: goldGanho,
            newLevel:
              updatedChar.level > char.level ? updatedChar.level : undefined,
          },
        );

        this.eventEmitter.emit('combat.win.stats', {
          playerId: playerId,
          newTotalXp: updatedChar.xp.toString(),
          goldGained: goldGanho,
          newLevel:
            updatedChar.level > char.level ? updatedChar.level : undefined,
        });

        console.log(
          `[BattleService DEBUG] Evento combat.win.stats EMITIDO para ${playerId}.`,
        );
      } catch (emitError) {
        console.error(
          `[BattleService] Erro ao emitir combat.win.stats:`,
          emitError,
        );
      }

      // Evento de loot separado
      if (droppedItems.length > 0) {
        try {
          console.log(
            `[BattleService DEBUG] PRESTES A EMITIR combat.win.loot para ${playerId}. Itens:`,
            droppedItems,
          );

          this.eventEmitter.emit('combat.win.loot', {
            playerId: playerId,
            drops: droppedItems,
          });

          console.log(
            `[BattleService DEBUG] Evento combat.win.loot EMITIDO para ${playerId}.`,
          );
          log.push(
            `\n[LOOT] Você obteve: ${droppedItems.map((d) => `${d.quantity}x ${d.itemName}`).join(', ')}`,
          );
        } catch (emitError) {
          console.error(
            `[BattleService] Erro ao emitir combat.win.loot:`,
            emitError,
          );
        }
      }

      log.push(`\n[RECOMPENSA] Você ganhou ${xpGanho} XP e ${goldGanho} Ouro!`);
    } else {
      console.log(
        `[BattleService] Transação falhou ou updatedChar não disponível para ${playerId}`,
      );
      console.error(
        `[BattleService DEBUG] ERRO: UpdatedChar não encontrado após transação para ${playerId}! Evento combat.win.stats NÃO emitido.`,
      );
    }
  }

  // --- FIM DE COMBATE ---
  private endCombat(
    playerId: string,
    result: 'win' | 'loss' | 'flee',
    log: string[],
  ): void {
    console.log(
      `[BattleService] endCombat chamado para ${playerId} com resultado: ${result}`,
    );

    const combat = this.activeCombats.get(playerId);
    if (!combat) {
      console.log(
        `[BattleService] Combate não encontrado para ${playerId} ao tentar finalizar`,
      );
      return;
    }

    this.activeCombats.delete(playerId);
    console.log(`[BattleService] Combate removido da memória para ${playerId}`);

    // Emitir evento de fim de combate
    try {
      console.log(
        `[BattleService DEBUG] PRESTES A EMITIR combat.end para ${playerId}. Resultado: ${result}`,
      );

      this.eventEmitter.emit('combat.end', {
        playerId: playerId,
        result: result,
      });

      console.log(
        `[BattleService DEBUG] Evento combat.end EMITIDO para ${playerId}.`,
      );
    } catch (emitError) {
      console.error(`[BattleService] Erro ao emitir combat.end:`, emitError);
    }
  }

  // --- UTILS ---
  getCombat(playerId: string): CombatInstance | undefined {
    return this.activeCombats.get(playerId);
  }

  // Modificar para aceitar eco e maxEco
  private getCombatUpdatePayload(
    combat: CombatInstance,
    log: string[],
    currentEco: number, // <-- NOVO PARÂMETRO
    maxEco: number, // <-- NOVO PARÂMETRO
  ): CombatUpdatePayload {
    return {
      isActive: combat.playerHp > 0 && combat.monsterHp > 0,
      monsterName: combat.monsterTemplate.name,
      playerHp: combat.playerHp,
      playerMaxHp: combat.playerMaxHp,
      playerEco: currentEco, // <-- USAR PARÂMETRO
      playerMaxEco: maxEco, // <-- USAR PARÂMETRO
      monsterHp: combat.monsterHp,
      monsterMaxHp: combat.monsterMaxHp,
      log: log,
      isPlayerTurn: true, // Sempre será turno do jogador após a ação dele + contra-ataque
    };
  }
}
