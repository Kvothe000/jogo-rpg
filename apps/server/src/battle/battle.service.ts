// apps/server/src/battle/battle.service.ts

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
import {
  CombatInstance,
  CombatUpdatePayload,
  ActiveEffect,
  SimplifiedActiveEffect,
} from './types/combat.type';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  LootDropPayload,
  CharacterTotalStats,
} from 'src/game/types/socket-with-auth.type';
import { CharacterStatsService } from 'src/character-stats/character-stats.service';
import { SkillService } from 'src/skill/skill.service';
import { Prisma, Skill } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';
import * as crypto from 'crypto';

// --- Definição dos tipos de efeito (JSON) ---
interface EffectBase {
  type: string;
  chance?: number;
  target?: 'self' | 'target'; // Adicionar alvo opcional
}
interface DamageEffect extends EffectBase {
  type: 'damage';
  value: number;
  scaleStat?: 'strength' | 'dexterity' | 'intelligence';
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
  type: 'dot';
  value: number;
  element?: string;
  duration: number;
  interval: number;
  key?: string;
}
interface CleanseEffect extends EffectBase {
  type: 'cleanse';
  effectType: 'negative' | 'positive' | 'all';
  count: number;
}
interface HotEffect extends EffectBase {
  type: 'hot';
  value: number;
  duration: number;
  key?: string;
}

type SkillEffect =
  | DamageEffect
  | StatusEffect
  | HealEffect
  | BuffDebuffEffect
  | AoEEffect
  | DamageOverTimeEffect
  | CleanseEffect
  | HotEffect;

// --- NOVA INTERFACE para a Skill definida no JSON do Monstro ---
interface MonsterSkillDefinition {
  name: string;
  chance: number;
  effectData: SkillEffect | SkillEffect[];
}

// --- Interface local para stats modificados ---
interface ModifiedStats {
  totalStrength: number;
  totalDexterity: number;
  totalIntelligence: number;
  totalConstitution: number;
  totalMaxHp: number;
  totalMaxEco: number;
  totalArmor: number;
  totalDefense: number;
  totalAccuracy: number;
  totalEvasion: number;
  totalCritChance: number;
}

@Injectable()
export class BattleService {
  private activeCombats = new Map<string, CombatInstance>();

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private characterStatsService: CharacterStatsService,
    private skillService: SkillService,
  ) {}

  // --- FUNÇÃO HELPER PARA CALCULAR STATS MODIFICADOS ---
  private getModifiedStats(
    baseStats: any,
    activeEffects: ActiveEffect[],
  ): ModifiedStats {
    const modifiedStats: ModifiedStats = {
      totalStrength: baseStats.totalStrength ?? baseStats.attack ?? 5,
      totalDexterity: baseStats.totalDexterity ?? 1,
      totalIntelligence: baseStats.totalIntelligence ?? 1,
      totalConstitution: baseStats.totalConstitution ?? 5,
      totalMaxHp: baseStats.totalMaxHp ?? baseStats.hp ?? 100,
      totalMaxEco: baseStats.totalMaxEco ?? baseStats.maxEco ?? 0,
      totalArmor: baseStats.totalArmor ?? baseStats.armor ?? 0,
      totalDefense: baseStats.totalDefense ?? baseStats.defense ?? 0,
      totalAccuracy: baseStats.totalAccuracy ?? baseStats.accuracy ?? 1.0,
      totalEvasion: baseStats.totalEvasion ?? baseStats.evasion ?? 0.0,
      totalCritChance:
        baseStats.totalCritChance ??
        0.05 + (baseStats.totalDexterity ?? 1) / 200,
    };

    // Aplicar buffs/debuffs
    activeEffects.forEach((effect) => {
      if (typeof effect.value !== 'number') return;

      switch (effect.key) {
        case 'strength_buff':
        case 'strength_debuff':
          modifiedStats.totalStrength *= 1 + effect.value;
          break;
        case 'dexterity_buff':
        case 'dexterity_debuff':
          modifiedStats.totalDexterity *= 1 + effect.value;
          break;
        case 'intelligence_buff':
        case 'intelligence_debuff':
          modifiedStats.totalIntelligence *= 1 + effect.value;
          break;
        case 'constitution_buff':
        case 'constitution_debuff':
          modifiedStats.totalConstitution *= 1 + effect.value;
          break;
        case 'maxHp_buff':
        case 'maxHp_debuff':
          modifiedStats.totalMaxHp *= 1 + effect.value;
          break;
        case 'maxEco_buff':
        case 'maxEco_debuff':
          modifiedStats.totalMaxEco *= 1 + effect.value;
          break;
        case 'armor_buff':
        case 'armor_debuff':
          modifiedStats.totalArmor *= 1 + effect.value;
          break;
        case 'defense_buff':
        case 'defense_debuff':
          modifiedStats.totalDefense *= 1 + effect.value;
          break;
        case 'accuracy_buff':
        case 'accuracy_debuff':
          modifiedStats.totalAccuracy *= 1 + effect.value;
          break;
        case 'evasion_buff':
        case 'evasion_debuff':
          modifiedStats.totalEvasion *= 1 + effect.value;
          break;
        case 'crit_chance_buff':
        case 'crit_chance_debuff':
          modifiedStats.totalCritChance += effect.value;
          break;
      }
    });

    // Aplicar efeitos de STATUS
    let isBlinded = false;
    let isRooted = false;
    let isSlowed = false;

    activeEffects.forEach((effect) => {
      if (effect.type === 'status') {
        if (effect.key === 'blind') {
          isBlinded = true;
        } else if (effect.key === 'rooted') {
          isRooted = true;
        } else if (effect.key === 'slow') {
          isSlowed = true;
        }
      }
    });

    // Aplicar penalidades dos status
    if (isBlinded) {
      modifiedStats.totalAccuracy *= 0.25;
    }
    if (isRooted) {
      modifiedStats.totalEvasion = 0;
    } else if (isSlowed) {
      modifiedStats.totalEvasion *= 0.5;
    }

    // Arredondar e garantir limites
    modifiedStats.totalStrength = Math.max(
      1,
      Math.floor(modifiedStats.totalStrength),
    );
    modifiedStats.totalDexterity = Math.max(
      1,
      Math.floor(modifiedStats.totalDexterity),
    );
    modifiedStats.totalIntelligence = Math.max(
      1,
      Math.floor(modifiedStats.totalIntelligence),
    );
    modifiedStats.totalConstitution = Math.max(
      1,
      Math.floor(modifiedStats.totalConstitution),
    );
    modifiedStats.totalMaxHp = Math.max(
      1,
      Math.floor(modifiedStats.totalMaxHp),
    );
    modifiedStats.totalMaxEco = Math.max(
      0,
      Math.floor(modifiedStats.totalMaxEco),
    );
    modifiedStats.totalArmor = Math.max(
      0,
      Math.floor(modifiedStats.totalArmor),
    );
    modifiedStats.totalDefense = Math.max(
      0,
      Math.floor(modifiedStats.totalDefense),
    );

    // Garantir limites finais
    modifiedStats.totalAccuracy = Math.max(0.05, modifiedStats.totalAccuracy);
    modifiedStats.totalEvasion = Math.max(
      0,
      Math.min(0.9, modifiedStats.totalEvasion),
    );
    modifiedStats.totalCritChance = Math.max(
      0.01,
      Math.min(0.95, modifiedStats.totalCritChance),
    );

    return modifiedStats;
  }

  // --- FUNÇÃO PARA CALCULAR CHANCE DE ACERTO ---
  private checkHitChance(
    attackerModifiedStats: ModifiedStats,
    defenderModifiedStats: ModifiedStats,
    log: string[],
  ): boolean {
    const baseHitChance = 0.95;
    const attackerAccuracy = attackerModifiedStats.totalAccuracy;
    const defenderEvasion = defenderModifiedStats.totalEvasion;

    let hitChance = baseHitChance + (attackerAccuracy - 1.0) - defenderEvasion;
    hitChance = Math.max(0.05, Math.min(0.95, hitChance));

    const roll = Math.random();
    const didHit = roll <= hitChance;

    return didHit;
  }

  // --- LÓGICA DE DANO ATUALIZADA COM RESISTÊNCIAS ELEMENTAIS ---
  private calculateDamage(
    attackerModifiedStats: ModifiedStats,
    defenderModifiedStats: ModifiedStats,
    defenderResistances: { [key: string]: number } | undefined,
    defenderTypes: string[],
    attackerLevel: number,
    attackElement: string = 'physical',
    scaleStat?: 'strength' | 'dexterity' | 'intelligence',
    bonusCriticalChanceFromSkill: number = 0,
    defensePenetration: number = 0,
    bonusVsTypesFromSkill: string[] = [],
  ): { damage: number; isCritical: boolean } {
    let attackPower: number;

    // Determinar qual stat usar para o poder de ataque
    switch (scaleStat) {
      case 'dexterity':
        attackPower = attackerModifiedStats.totalDexterity ?? 1;
        break;
      case 'intelligence':
        attackPower = attackerModifiedStats.totalIntelligence ?? 1;
        break;
      case 'strength':
      default:
        attackPower = attackerModifiedStats.totalStrength ?? 5;
        break;
    }

    // 1. DANO BASE (Stat + Nível)
    const rawDamagePreMitigation = attackPower + (attackerLevel ?? 1) * 2;

    // 2. APLICAR BÔNUS VS TIPO (Multiplicador)
    let typeBonusMultiplier = 1.0;
    const isEffectiveVsType = defenderTypes.some((type) =>
      bonusVsTypesFromSkill.includes(type),
    );
    if (isEffectiveVsType) {
      typeBonusMultiplier = 1.5;
    }

    // 3. CALCULAR MITIGAÇÃO EFETIVA (Defesa/Armadura - Penetração)
    const baseDefense = defenderModifiedStats.totalDefense ?? 0;
    const baseArmor = defenderModifiedStats.totalArmor ?? 0;
    const totalMitigation = baseDefense + baseArmor;

    const validPenetration = Math.max(0, Math.min(1, defensePenetration));
    const effectiveMitigation = totalMitigation * (1 - validPenetration);

    // 4. DANO PÓS-MITIGAÇÃO (com bônus de tipo aplicado ANTES da mitigação)
    let damagePostMitigation = Math.max(
      1,
      rawDamagePreMitigation * typeBonusMultiplier - effectiveMitigation,
    );

    // 5. APLICAR MULTIPLICADOR ELEMENTAL (Resistência/Vulnerabilidade)
    const resistanceValue = defenderResistances?.[attackElement] ?? 0;
    const elementalMultiplier = 1.0 - resistanceValue;

    if (elementalMultiplier !== 1.0) {
      damagePostMitigation *= elementalMultiplier;
    }

    // Garantir dano mínimo 1 após todos os cálculos
    let finalDamage = Math.max(1, Math.floor(damagePostMitigation));

    // 6. CÁLCULO DE CRÍTICO (APÓS todos os outros cálculos)
    let finalCritChance =
      attackerModifiedStats.totalCritChance + bonusCriticalChanceFromSkill;
    finalCritChance = Math.max(0.01, Math.min(0.95, finalCritChance));

    const critRoll = Math.random();
    const isCritical = critRoll <= finalCritChance;
    const critMultiplier = 1.5;

    if (isCritical) {
      finalDamage = Math.floor(finalDamage * critMultiplier);
    }

    return { damage: finalDamage, isCritical: isCritical };
  }

  // --- NOVA FUNÇÃO HELPER PARA APLICAR EFEITOS DA SKILL DO MONSTRO ---
  private applyMonsterSkillEffects(
    combat: CombatInstance,
    skill: MonsterSkillDefinition,
    monsterStats: ModifiedStats,
    playerStats: ModifiedStats,
    log: string[],
  ): void {
    log.push(`${combat.monsterName} usa ${skill.name}!`);

    const effects = Array.isArray(skill.effectData)
      ? skill.effectData
      : [skill.effectData];

    for (const effect of effects) {
      if (
        typeof effect !== 'object' ||
        effect === null ||
        !('type' in effect)
      ) {
        continue;
      }
      if (effect.chance !== undefined && Math.random() > effect.chance) {
        log.push(` -> O efeito ${effect.type} falhou (chance).`);
        continue;
      }

      // Determinar alvo
      const isTargetSelf = effect.target === 'self';
      const targetIsPlayer = !isTargetSelf;

      // Verificar acerto SE o efeito for ofensivo e direcionado ao jogador
      let hitCheckPassed = true;
      const requiresHitCheck =
        ['damage', 'status', 'debuff', 'dot'].includes(effect.type) &&
        targetIsPlayer;
      if (requiresHitCheck) {
        hitCheckPassed = this.checkHitChance(monsterStats, playerStats, log);
        if (!hitCheckPassed) {
          log.push(` -> ...mas errou o alvo!`);
          continue;
        }
      }

      // Aplicar efeito
      switch (effect.type) {
        case 'damage': {
          const damageEffect = effect;
          if (typeof damageEffect.value !== 'number') continue;
          const monsterLevel =
            (combat.monsterTemplate.stats as any)?.level ?? 1;

          const attackResult = this.calculateDamage(
            monsterStats,
            playerStats,
            undefined, // Resistências do jogador (TODO)
            [], // Tipos do jogador (TODO)
            monsterLevel,
            damageEffect.element ?? 'physical',
            damageEffect.scaleStat,
            damageEffect.bonusCriticalChance ?? 0,
            damageEffect.defensePenetration ?? 0,
            damageEffect.bonusVsType ?? [],
          );
          const finalDamage = damageEffect.value + attackResult.damage;
          combat.playerHp = Math.max(0, combat.playerHp - finalDamage);
          const critIndicator = attackResult.isCritical ? ' (CRÍTICO!)' : '';
          log.push(
            ` -> Causa ${finalDamage} de dano a você${critIndicator}. (Seu HP: ${combat.playerHp})`,
          );
          break;
        }
        case 'status': {
          const statusEffect = effect;
          if (
            typeof statusEffect.effect !== 'string' ||
            typeof statusEffect.duration !== 'number'
          )
            continue;
          const targetName = targetIsPlayer
            ? 'Você é afetado'
            : `${combat.monsterName} é afetado`;
          log.push(
            ` -> ${targetName} por ${statusEffect.effect} por ${statusEffect.duration} turnos.`,
          );
          this.addEffectToCombatant(combat, targetIsPlayer, {
            id: crypto.randomUUID(),
            sourceSkillId: `mon_${skill.name}`,
            type: 'status',
            key: statusEffect.effect,
            duration: statusEffect.duration,
            appliedTurn: combat.turn,
          });
          break;
        }
        case 'buff':
        case 'debuff': {
          const buffDebuffEffect = effect;
          if (
            typeof buffDebuffEffect.stat !== 'string' ||
            typeof buffDebuffEffect.value !== 'number' ||
            typeof buffDebuffEffect.duration !== 'number'
          )
            continue;

          const actualTargetIsPlayer = effect.target === 'self' ? false : true;
          const targetName = actualTargetIsPlayer ? 'Você' : combat.monsterName;
          const key = `${buffDebuffEffect.stat}_${effect.type}`;
          const effectTypeString = effect.type === 'buff' ? 'recebe' : 'sofre';

          log.push(
            ` -> ${targetName} ${effectTypeString} ${buffDebuffEffect.stat} (${buffDebuffEffect.value > 0 ? '+' : ''}${buffDebuffEffect.value * 100}%) por ${buffDebuffEffect.duration} turnos.`,
          );
          this.addEffectToCombatant(combat, actualTargetIsPlayer, {
            id: crypto.randomUUID(),
            sourceSkillId: `mon_${skill.name}`,
            type: effect.type,
            key: key,
            value: buffDebuffEffect.value,
            duration: buffDebuffEffect.duration,
            appliedTurn: combat.turn,
          });
          break;
        }
        case 'dot': {
          const dotEffect = effect;
          if (
            typeof dotEffect.value !== 'number' ||
            typeof dotEffect.duration !== 'number'
          )
            continue;
          const key =
            dotEffect.key ?? dotEffect.element ?? `mon_dot_${skill.name}`;
          const targetName = targetIsPlayer
            ? 'Você começa'
            : `${combat.monsterName} começa`;
          log.push(
            ` -> ${targetName} a sofrer dano de ${key} por ${dotEffect.duration} turnos.`,
          );
          this.addEffectToCombatant(combat, targetIsPlayer, {
            id: crypto.randomUUID(),
            sourceSkillId: `mon_${skill.name}`,
            type: 'dot',
            key: key,
            value: dotEffect.value,
            duration: dotEffect.duration,
            appliedTurn: combat.turn,
          });
          break;
        }
        default:
          log.push(` -> Efeito ${effect.type} não implementado para monstros.`);
      }
      // Verificar morte do jogador após cada efeito
      if (targetIsPlayer && combat.playerHp <= 0) break;
    }
  }

  async initializeCombat(
    player: UserPayload,
    monsterTemplateId: string,
  ): Promise<CombatInstance | null> {
    if (!player.character) return null;
    if (this.activeCombats.has(player.character.id)) {
      console.warn(
        `[BattleService] Tentativa de iniciar combate para ${player.character.id} que já está em combate.`,
      );
      return this.activeCombats.get(player.character.id) ?? null;
    }

    const monsterTemplate = await this.prisma.nPCTemplate.findUnique({
      where: { id: monsterTemplateId, isHostile: true },
    });
    if (!monsterTemplate || !monsterTemplate.isHostile) return null;

    const stats = monsterTemplate.stats as any;
    const monsterMaxHp = stats.hp ?? 100;

    const newCombat: CombatInstance = {
      id: player.character.id,
      playerId: player.character.id,
      playerHp: player.character.hp,
      playerMaxHp: player.character.maxHp,
      monsterTemplate: monsterTemplate,
      monsterHp: monsterMaxHp,
      monsterMaxHp: monsterMaxHp,
      lastAction: Date.now(),
      monsterName: monsterTemplate.name,
      turn: 1,
      playerEffects: [],
      monsterEffects: [],
    };

    this.activeCombats.set(player.character.id, newCombat);
    console.log(
      `[BattleService] Combate iniciado para ${player.character.id} contra ${monsterTemplate.name}, Turno ${newCombat.turn}`,
    );
    return newCombat;
  }

  // --- PROCESSAR EFEITOS NO INÍCIO DO TURNO ---
  private applyTurnStartEffects(
    combat: CombatInstance,
    isPlayerTurn: boolean,
    log: string[],
  ): void {
    const targetEffects = isPlayerTurn
      ? combat.playerEffects
      : combat.monsterEffects;
    const targetName = isPlayerTurn ? 'Você' : combat.monsterName;

    const effectsToRemove: string[] = [];

    [...targetEffects].forEach((effect) => {
      // 1. Aplicar DoT/HoT
      if (effect.type === 'dot') {
        const dotDamage = effect.value ?? 0;
        if (dotDamage > 0) {
          if (isPlayerTurn) {
            combat.playerHp = Math.max(0, combat.playerHp - dotDamage);
            log.push(
              `${targetName} sofre ${dotDamage} de dano de ${effect.key}. (HP: ${combat.playerHp})`,
            );
          } else {
            combat.monsterHp = Math.max(0, combat.monsterHp - dotDamage);
            log.push(
              `${targetName} sofre ${dotDamage} de dano de ${effect.key}. (HP: ${combat.monsterHp})`,
            );
          }
        }
      } else if (effect.type === 'hot') {
        const hotHeal = effect.value ?? 0;
        if (hotHeal > 0) {
          if (isPlayerTurn) {
            combat.playerHp = Math.min(
              combat.playerMaxHp,
              combat.playerHp + hotHeal,
            );
            log.push(
              `${targetName} recupera ${hotHeal} HP de ${effect.key}. (HP: ${combat.playerHp})`,
            );
          } else {
            combat.monsterHp = Math.min(
              combat.monsterMaxHp,
              combat.monsterHp + hotHeal,
            );
            log.push(
              `${targetName} recupera ${hotHeal} HP de ${effect.key}. (HP: ${combat.monsterHp})`,
            );
          }
        }
      }

      // 2. Decrementar duração
      effect.duration -= 1;

      // 3. Marcar para remover
      if (effect.duration <= 0) {
        effectsToRemove.push(effect.id);
        log.push(
          `O efeito ${effect.key} em ${targetName.toLowerCase()} acabou.`,
        );
      }
    });

    // 4. Remover efeitos expirados
    if (isPlayerTurn) {
      combat.playerEffects = combat.playerEffects.filter(
        (e) => !effectsToRemove.includes(e.id),
      );
    } else {
      combat.monsterEffects = combat.monsterEffects.filter(
        (e) => !effectsToRemove.includes(e.id),
      );
    }

    // 5. Verificar morte por DoT
    if (isPlayerTurn && combat.playerHp <= 0) {
      log.push(`${targetName} sucumbiu aos ferimentos...`);
    } else if (!isPlayerTurn && combat.monsterHp <= 0) {
      log.push(`${targetName} sucumbiu aos ferimentos...`);
    }
  }

  // --- HELPER PARA ADICIONAR EFEITOS ---
  private addEffectToCombatant(
    combat: CombatInstance,
    targetIsPlayer: boolean,
    effectToAdd: ActiveEffect, // Usa o tipo importado de combat.type.ts
  ): void {
    const targetEffects = targetIsPlayer
      ? combat.playerEffects
      : combat.monsterEffects;

    // --- VALIDAÇÃO REVISADA COM SWITCH ---
    switch (effectToAdd.type) {
      case 'status':
      case 'buff':
      case 'debuff':
      case 'dot':
      case 'hot':
        // Tipo é válido, pode prosseguir
        break; // Sai do switch e continua a função
      default:
        // Tipo inválido
        console.error(
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          `[BattleService] Tentativa de adicionar efeito com tipo inválido: ${effectToAdd.type}`,
        );
        // Opcional: Ajuda TypeScript a garantir que todos os casos foram tratados
        // const _exhaustiveCheck: never = effectToAdd.type;
        return; // Sai da função se o tipo for inválido
    }
    // --- FIM DA VALIDAÇÃO REVISADA ---

    // Restante da função (lógica para substituir/adicionar efeito)
    const existingEffectIndex = targetEffects.findIndex(
      (e) => e.key === effectToAdd.key,
    );
    if (existingEffectIndex > -1) {
      console.log(
        `[BattleService] Substituindo efeito ${effectToAdd.key} existente.`,
      );
      targetEffects.splice(existingEffectIndex, 1);
    }

    targetEffects.push(effectToAdd);
    console.log(
      `[BattleService] Efeito ${effectToAdd.key} adicionado a ${targetIsPlayer ? 'jogador' : 'monstro'}. Duração: ${effectToAdd.duration}`,
    );
  }

  // --- PROCESSAR ATAQUE BÁSICO ---
  async processPlayerAttack(
    playerId: string,
  ): Promise<CombatUpdatePayload | null> {
    const combat = this.activeCombats.get(playerId);
    if (!combat) {
      throw new HttpException(
        'Você não está em combate.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const log: string[] = [];

    try {
      // --- TURNO DO JOGADOR ---
      log.push(`--- Turno ${combat.turn} (Sua Vez) ---`);
      this.applyTurnStartEffects(combat, true, log);
      if (combat.playerHp <= 0) {
        this.endCombat(playerId, 'loss', log);
        return null;
      }

      const charCurrentStats = await this.prisma.character.findUnique({
        where: { id: playerId },
        select: { hp: true, eco: true, maxEco: true },
      });
      if (!charCurrentStats)
        throw new NotFoundException('Personagem não encontrado.');
      combat.playerHp = charCurrentStats.hp;

      const playerBaseTotalStats =
        await this.characterStatsService.calculateTotalStats(playerId);
      const playerLevel =
        (
          await this.prisma.character.findUnique({
            where: { id: playerId },
            select: { level: true },
          })
        )?.level ?? 1;

      const monsterStats = combat.monsterTemplate.stats as any;
      const monsterBaseStats: any = {
        totalStrength: monsterStats.attack ?? 5,
        totalDexterity: monsterStats.dexterity ?? 1,
        totalIntelligence: monsterStats.intelligence ?? 1,
        totalConstitution: monsterStats.constitution ?? 5,
        totalMaxHp: monsterStats.hp ?? 100,
        totalMaxEco: monsterStats.maxEco ?? 0,
        totalArmor: monsterStats.armor ?? 0,
        totalDefense: monsterStats.defense ?? 0,
        totalAccuracy: monsterStats.accuracy ?? 1.0,
        totalEvasion: monsterStats.evasion ?? 0.0,
        totalCritChance: monsterStats.critChance ?? 0.05,
      };

      // Obter resistências do monstro
      const monsterResistances = (combat.monsterTemplate.stats as any)
        ?.resistances;
      const monsterTypes = combat.monsterTemplate.types ?? [];

      // Calcular stats modificados
      const playerModifiedStats = this.getModifiedStats(
        playerBaseTotalStats,
        combat.playerEffects,
      );
      const monsterModifiedStats = this.getModifiedStats(
        monsterBaseStats,
        combat.monsterEffects,
      );

      // Atualizar MaxHP na instância de combate
      combat.playerMaxHp = playerModifiedStats.totalMaxHp;
      combat.monsterMaxHp = monsterModifiedStats.totalMaxHp;

      // 1. Dano do Jogador -> Monstro
      log.push(`Você ataca ${combat.monsterName}...`);
      if (this.checkHitChance(playerModifiedStats, monsterModifiedStats, log)) {
        const attackResult = this.calculateDamage(
          playerModifiedStats,
          monsterModifiedStats,
          monsterResistances,
          monsterTypes,
          playerLevel,
          'physical',
          undefined,
          0,
          0,
          [],
        );
        combat.monsterHp = Math.max(0, combat.monsterHp - attackResult.damage);
        const critIndicator = attackResult.isCritical ? ' (CRÍTICO!)' : '';

        let resistanceInfo = '';
        if (monsterResistances?.['physical'] !== undefined) {
          const resistance = monsterResistances['physical'];
          if (resistance > 0) {
            resistanceInfo = ` (Monstro resistiu ${Math.round(resistance * 100)}%)`;
          } else if (resistance < 0) {
            resistanceInfo = ` (Monstro vulnerável ${Math.round(-resistance * 100)}%)`;
          }
        }

        log.push(
          `...e causa ${attackResult.damage} de dano${critIndicator}${resistanceInfo}.`,
        );
      } else {
        log.push('...mas você errou!');
      }

      // 2. Monstro Morre?
      if (combat.monsterHp <= 0) {
        await this.handleCombatWin(playerId, combat, log);
        this.endCombat(playerId, 'win', log);
        return null;
      }

      // --- TURNO DO MONSTRO ---
      log.push(`--- Turno ${combat.turn} (Vez do ${combat.monsterName}) ---`);
      this.applyTurnStartEffects(combat, false, log);
      if (combat.monsterHp <= 0) {
        await this.handleCombatWin(playerId, combat, log);
        this.endCombat(playerId, 'win', log);
        return null;
      }

      const playerModifiedStats_Def = this.getModifiedStats(
        playerBaseTotalStats,
        combat.playerEffects,
      );
      const monsterModifiedStats_Atk = this.getModifiedStats(
        monsterBaseStats,
        combat.monsterEffects,
      );

      // --- Decisão da Ação do Monstro ---
      let monsterActionTaken = false;
      const monsterSkills = (combat.monsterTemplate.stats as any)?.skills as
        | MonsterSkillDefinition[]
        | undefined;

      if (monsterSkills && monsterSkills.length > 0) {
        // Tentar usar uma skill
        for (const skill of monsterSkills) {
          if (Math.random() <= skill.chance) {
            this.applyMonsterSkillEffects(
              combat,
              skill,
              monsterModifiedStats_Atk,
              playerModifiedStats_Def,
              log,
            );
            monsterActionTaken = true;
            break;
          }
        }
      }

      // Se nenhuma skill foi usada, fazer ataque básico
      if (!monsterActionTaken) {
        log.push(`${combat.monsterName} ataca você...`);
        if (
          this.checkHitChance(
            monsterModifiedStats_Atk,
            playerModifiedStats_Def,
            log,
          )
        ) {
          const playerResistances = undefined;
          const playerTypes = [];
          const monsterAttackResult = this.calculateDamage(
            monsterModifiedStats_Atk,
            playerModifiedStats_Def,
            playerResistances,
            playerTypes,
            monsterStats.level ?? 1,
            monsterStats.attackElement ?? 'physical',
            undefined,
            0,
            0,
            [],
          );
          combat.playerHp = Math.max(
            0,
            combat.playerHp - monsterAttackResult.damage,
          );
          const critIndicator = monsterAttackResult.isCritical
            ? ' (CRÍTICO!)'
            : '';
          log.push(
            `...e causa ${monsterAttackResult.damage} de dano${critIndicator}.`,
          );
        } else {
          log.push('...mas ele errou!');
        }
      }
      // --- Fim da Ação do Monstro ---

      await this.prisma.character.update({
        where: { id: playerId },
        data: { hp: combat.playerHp },
      });

      // 4. Jogador Morre?
      if (combat.playerHp <= 0) {
        this.endCombat(playerId, 'loss', log);
        return null;
      }

      // 5. Incrementar turno e retornar
      combat.turn += 1;
      combat.lastAction = Date.now();
      const finalCharEco =
        (
          await this.prisma.character.findUnique({
            where: { id: playerId },
            select: { eco: true },
          })
        )?.eco ?? 0;
      return this.getCombatUpdatePayload(
        combat,
        log,
        finalCharEco,
        playerModifiedStats_Def.totalMaxEco,
      );
    } catch (error) {
      console.error(
        `[BattleService] Erro em processPlayerAttack para ${playerId}:`,
        error,
      );
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Erro interno ao processar ataque.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // --- PROCESSAR USO DE SKILL ---
  async processPlayerSkill(
    playerId: string,
    skillId: string,
  ): Promise<CombatUpdatePayload | null> {
    const combat = this.activeCombats.get(playerId);
    if (!combat) {
      throw new HttpException(
        'Você não está em combate.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const log: string[] = [];

    try {
      // --- TURNO DO JOGADOR ---
      log.push(`--- Turno ${combat.turn} (Sua Vez) ---`);
      this.applyTurnStartEffects(combat, true, log);
      if (combat.playerHp <= 0) {
        this.endCombat(playerId, 'loss', log);
        return null;
      }

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
        this.prisma.skill.findUnique({ where: { id: skillId } }),
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

      // --- STATS ---
      const playerBaseTotalStats =
        await this.characterStatsService.calculateTotalStats(playerId);
      const playerLevel = characterData.level ?? 1;

      const monsterStats = combat.monsterTemplate.stats as any;
      const monsterBaseStats: any = {
        totalStrength: monsterStats.attack ?? 5,
        totalDexterity: monsterStats.dexterity ?? 1,
        totalIntelligence: monsterStats.intelligence ?? 1,
        totalConstitution: monsterStats.constitution ?? 5,
        totalMaxHp: monsterStats.hp ?? 100,
        totalMaxEco: monsterStats.maxEco ?? 0,
        totalArmor: monsterStats.armor ?? 0,
        totalDefense: monsterStats.defense ?? 0,
        totalAccuracy: monsterStats.accuracy ?? 1.0,
        totalEvasion: monsterStats.evasion ?? 0.0,
        totalCritChance: monsterStats.critChance ?? 0.05,
      };

      // Obter resistências do monstro
      const monsterResistances = (combat.monsterTemplate.stats as any)
        ?.resistances;

      // Calcular stats modificados
      const playerModifiedStats = this.getModifiedStats(
        playerBaseTotalStats,
        combat.playerEffects,
      );
      const monsterModifiedStats = this.getModifiedStats(
        monsterBaseStats,
        combat.monsterEffects,
      );

      combat.playerMaxHp = playerModifiedStats.totalMaxHp;
      combat.monsterMaxHp = monsterModifiedStats.totalMaxHp;

      // --- DEDUZIR ECO ---
      const newEco = characterData.eco - skillData.ecoCost;
      await this.prisma.character.update({
        where: { id: playerId },
        data: { eco: newEco },
      });
      log.push(`Você usa ${skillData.name} (Eco: -${skillData.ecoCost}).`);

      // --- APLICAR EFEITOS DA SKILL ---
      const effectsInput = skillData.effectData;
      let effects: SkillEffect[];
      if (Array.isArray(effectsInput)) {
        effects = effectsInput as unknown as SkillEffect[];
      } else if (typeof effectsInput === 'object' && effectsInput !== null) {
        effects = [effectsInput as unknown as SkillEffect];
      } else {
        log.push(
          `Ignorando effectData inválido: ${JSON.stringify(effectsInput)}`,
        );
        effects = [];
      }

      // Obter tipos do monstro
      const defenderTypes = combat.monsterTemplate.types ?? [];

      for (const effect of effects) {
        if (
          typeof effect !== 'object' ||
          effect === null ||
          !('type' in effect) ||
          typeof effect.type !== 'string'
        ) {
          log.push(
            `Ignorando efeito inválido no array: ${JSON.stringify(effect)}`,
          );
          continue;
        }
        if (effect.chance !== undefined && Math.random() > effect.chance) {
          log.push(`O efeito ${effect.type} falhou (chance).`);
          continue;
        }

        switch (effect.type) {
          case 'damage': {
            const damageEffect = effect;
            if (typeof damageEffect.value !== 'number') {
              log.push(`Ignorando 'damage' com valor inválido.`);
              continue;
            }

            log.push(
              `Tentando acertar ${combat.monsterName} com o dano da skill...`,
            );
            if (
              this.checkHitChance(
                playerModifiedStats,
                monsterModifiedStats,
                log,
              )
            ) {
              const attackResult = this.calculateDamage(
                playerModifiedStats,
                monsterModifiedStats,
                monsterResistances,
                defenderTypes,
                playerLevel,
                damageEffect.element ?? 'physical',
                damageEffect.scaleStat,
                damageEffect.bonusCriticalChance ?? 0,
                damageEffect.defensePenetration ?? 0,
                damageEffect.bonusVsType ?? [],
              );

              const finalSkillDamage = damageEffect.value + attackResult.damage;
              combat.monsterHp = Math.max(
                0,
                combat.monsterHp - finalSkillDamage,
              );
              const critIndicator = attackResult.isCritical
                ? ' (CRÍTICO!)'
                : '';

              const penetrationInfo =
                (damageEffect.defensePenetration ?? 0) > 0
                  ? ` ignorando ${Math.round((damageEffect.defensePenetration ?? 0) * 100)}% da defesa`
                  : '';

              const effectivenessInfo =
                (damageEffect.bonusVsType?.length ?? 0 > 0) &&
                defenderTypes.some((type) =>
                  damageEffect.bonusVsType?.includes(type),
                )
                  ? ' (Eficaz!)'
                  : '';

              let resistanceInfo = '';
              const attackElement = damageEffect.element ?? 'physical';
              if (monsterResistances?.[attackElement] !== undefined) {
                const resistance = monsterResistances[attackElement];
                if (resistance > 0) {
                  resistanceInfo = ` (Monstro resistiu ${Math.round(resistance * 100)}%)`;
                } else if (resistance < 0) {
                  resistanceInfo = ` (Monstro vulnerável ${Math.round(-resistance * 100)}%)`;
                }
              }

              log.push(
                `...Acertou! Causa ${finalSkillDamage} de dano ${damageEffect.element ?? ''}${critIndicator}${effectivenessInfo}${resistanceInfo}${penetrationInfo}.`,
              );
            } else {
              log.push('...Errou!');
            }
            break;
          }
          // ... (outros casos de efeito permanecem iguais) ...
          default:
            log.push(`Efeito desconhecido: ${(effect as EffectBase).type}`);
        }
        if (combat.monsterHp <= 0) break;
      }

      // --- VERIFICAR MORTE MONSTRO PÓS-SKILL ---
      if (combat.monsterHp <= 0) {
        await this.handleCombatWin(playerId, combat, log);
        this.endCombat(playerId, 'win', log);
        return null;
      }

      // --- TURNO DO MONSTRO ---
      log.push(`--- Turno ${combat.turn} (Vez do ${combat.monsterName}) ---`);
      this.applyTurnStartEffects(combat, false, log);
      if (combat.monsterHp <= 0) {
        await this.handleCombatWin(playerId, combat, log);
        this.endCombat(playerId, 'win', log);
        return null;
      }

      const playerModifiedStats_Def = this.getModifiedStats(
        playerBaseTotalStats,
        combat.playerEffects,
      );
      const monsterModifiedStats_Atk = this.getModifiedStats(
        monsterBaseStats,
        combat.monsterEffects,
      );

      // --- Decisão da Ação do Monstro ---
      let monsterActionTaken = false;
      const monsterSkills = (combat.monsterTemplate.stats as any)?.skills as
        | MonsterSkillDefinition[]
        | undefined;

      if (monsterSkills && monsterSkills.length > 0) {
        for (const skill of monsterSkills) {
          if (Math.random() <= skill.chance) {
            this.applyMonsterSkillEffects(
              combat,
              skill,
              monsterModifiedStats_Atk,
              playerModifiedStats_Def,
              log,
            );
            monsterActionTaken = true;
            break;
          }
        }
      }

      // Se nenhuma skill foi usada, fazer ataque básico
      if (!monsterActionTaken) {
        log.push(`${combat.monsterName} ataca você...`);
        if (
          this.checkHitChance(
            monsterModifiedStats_Atk,
            playerModifiedStats_Def,
            log,
          )
        ) {
          const playerResistances = undefined;
          const playerTypes = [];
          const monsterAttackResult = this.calculateDamage(
            monsterModifiedStats_Atk,
            playerModifiedStats_Def,
            playerResistances,
            playerTypes,
            monsterStats.level ?? 1,
            monsterStats.attackElement ?? 'physical',
            undefined,
            0,
            0,
            [],
          );
          combat.playerHp = Math.max(
            0,
            combat.playerHp - monsterAttackResult.damage,
          );
          const critIndicator = monsterAttackResult.isCritical
            ? ' (CRÍTICO!)'
            : '';
          log.push(
            `...e causa ${monsterAttackResult.damage} de dano${critIndicator}.`,
          );
        } else {
          log.push('...mas ele errou!');
        }
      }
      // --- Fim da Ação do Monstro ---

      await this.prisma.character.update({
        where: { id: playerId },
        data: { hp: combat.playerHp },
      });

      // 4. Jogador Morre?
      if (combat.playerHp <= 0) {
        this.endCombat(playerId, 'loss', log);
        return null;
      }

      // 5. Incrementar turno e retornar
      combat.turn += 1;
      combat.lastAction = Date.now();
      return this.getCombatUpdatePayload(
        combat,
        log,
        newEco,
        playerModifiedStats_Def.totalMaxEco,
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
      try {
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

      if (droppedItems.length > 0) {
        try {
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
      console.error(
        `[BattleService DEBUG] ERRO: UpdatedChar não encontrado após transação para ${playerId}!`,
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

  private getCombatUpdatePayload(
    combat: CombatInstance,
    log: string[],
    currentEco: number,
    maxEco: number,
  ): CombatUpdatePayload {
    const simplifiedPlayerEffects: SimplifiedActiveEffect[] =
      combat.playerEffects.map((eff) => ({
        key: eff.key,
        duration: eff.duration,
      }));
    const simplifiedMonsterEffects: SimplifiedActiveEffect[] =
      combat.monsterEffects.map((eff) => ({
        key: eff.key,
        duration: eff.duration,
      }));

    return {
      isActive: combat.playerHp > 0 && combat.monsterHp > 0,
      monsterName: combat.monsterTemplate.name,
      playerHp: combat.playerHp,
      playerMaxHp: combat.playerMaxHp,
      playerEco: currentEco,
      playerMaxEco: maxEco,
      monsterHp: combat.monsterHp,
      monsterMaxHp: combat.monsterMaxHp,
      log: log,
      isPlayerTurn: true,
      playerEffects: simplifiedPlayerEffects,
      monsterEffects: simplifiedMonsterEffects,
    };
  }
}
