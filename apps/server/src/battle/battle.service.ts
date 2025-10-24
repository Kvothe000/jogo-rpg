/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import type { UserPayload } from 'src/auth/types/user-payload.type';
import { GameGateway } from 'src/game/game.gateway';
import { CombatInstance, CombatUpdatePayload } from './types/combat.type';

@Injectable()
export class BattleService {
  // Gerenciador de estado em memória (Mapeia CharacterId para CombatInstance)
  private activeCombats = new Map<string, CombatInstance>();

  constructor(private prisma: PrismaService) {}

  // Lidar com a dependência circular: GameGateway precisa do BattleService, e vice-versa
  private gateway: GameGateway;
  setGateway(gateway: GameGateway) {
    this.gateway = gateway;
  }

  // --- LÓGICA DE DANO BASE (MVP) ---

  /**
   * Calcula o dano básico: (Ataque Bruto + Nível * 2) - Defesa
   */
  private calculateDamage(
    attackerStats: any,
    defenderStats: any,
    attackerIsPlayer: boolean,
  ): number {
    // Stats do atacante são player.character ou monsterTemplate.stats
    const attackPower = attackerIsPlayer
      ? attackerStats.strength
      : attackerStats.attack;
    const level = attackerIsPlayer ? attackerStats.level : 1;
    const defense = attackerIsPlayer
      ? defenderStats.defense
      : defenderStats.constitution; // Simplificação

    const baseDamage = (attackPower ?? 5) + (level ?? 1) * 2;
    const finalDamage = Math.max(1, baseDamage - (defense ?? 0));

    return Math.floor(finalDamage);
  }

  // --- INICIALIZAÇÃO DE COMBATE ---

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

  // --- LOOP DE COMBATE: ATAQUE DO JOGADOR ---

  async processPlayerAttack(
    playerId: string,
  ): Promise<CombatUpdatePayload | null> {
    const combat = this.activeCombats.get(playerId);
    if (!combat) return null;

    // Buscar stats completos do DB (usamos 'select' para pegar apenas o necessário)
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

    if (!playerStats) return null;

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

    // 2. Monstro Morre?
    if (combat.monsterHp <= 0) {
      log.push(`Você derrotou ${combat.monsterTemplate.name}!`);
      this.endCombat(playerId, 'win', log);
      return this.getCombatUpdatePayload(combat, log);
    }

    // 3. Dano do Monstro -> Jogador (Contra-ataque instantâneo)
    const monsterDamage = this.calculateDamage(
      monsterStats,
      playerStats,
      false,
    );
    combat.playerHp = Math.max(0, combat.playerHp - monsterDamage);
    log.push(
      `${combat.monsterTemplate.name} contra-ataca e causa ${monsterDamage} de dano.`,
    );

    // 4. Jogador Morre?
    if (combat.playerHp <= 0) {
      log.push(`Você foi derrotado por ${combat.monsterTemplate.name}...`);
      this.endCombat(playerId, 'loss', log);
    }

    // Se o jogador perdeu HP, o DB PRECISA ser atualizado (isso afeta o status na Sidebar)
    await this.prisma.character.update({
      where: { id: playerId },
      data: { hp: combat.playerHp },
    });

    // O objeto 'combat' tem o novo HP atualizado do jogador para o payload
    return this.getCombatUpdatePayload(combat, log);
  }

  // --- FIM DE COMBATE ---

  private endCombat(
    playerId: string,
    result: 'win' | 'loss' | 'flee',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _log: string[],
  ): void {
    const combat = this.activeCombats.get(playerId);
    if (!combat) return;

    this.activeCombats.delete(playerId);

    if (this.gateway) {
      // Avisa o cliente que o combate acabou
      this.gateway.getClientSocket(playerId)?.emit('combatEnd', result);
    }

    // (FUTURO): Lógica de EXP, Loot, etc.
    // (FUTURO): Se 'loss', personagem deve ser movido para a sala inicial (respawn).
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
      isPlayerTurn: true, // Simplificamos para o jogador sempre ser o próximo
    };
  }
}
