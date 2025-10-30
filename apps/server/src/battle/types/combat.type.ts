// apps/server/src/battle/types/combat.type.ts

import { NPCTemplate } from '@prisma/client';
import { CharacterClass } from '@prisma/client';

// --- INTERFACE PARA EFEITOS ATIVOS ---
export interface ActiveEffect {
  id: string; // ID único para esta instância do efeito (pode ser gerado com cuid() ou uuid)
  sourceSkillId: string; // ID da skill que aplicou
  type: 'status' | 'buff' | 'debuff' | 'dot' | 'hot'; // Tipo do efeito (hot = heal over time)
  key: string; // Nome específico (e.g., 'burning', 'strength_buff', 'accuracy_debuff', 'poisoned', 'regeneration')
  value?: number; // Valor (para buffs/debuffs/dots/hots) - pode ser aditivo, multiplicativo ou absoluto dependendo da implementação
  duration: number; // Turnos/segundos restantes (precisamos definir a unidade - vamos usar turnos por enquanto)
  appliedTurn: number; // Em qual turno foi aplicado (útil para lógica de expiração e cálculo)
  // Adicionar mais campos se necessário (ex: quem aplicou, se é cumulativo, etc.)
}

// Estado da batalha em tempo real (usado no backend)
export interface CombatInstance {
  id: string; // ID da instância de combate (pode ser o characterId)
  playerId: string;
  playerHp: number;
  playerMaxHp: number;
  monsterTemplate: NPCTemplate;
  monsterHp: number;
  monsterMaxHp: number;
  lastAction: number;
  monsterName: string; // Mantido para conveniência
  turn: number; // Adicionar contador de turnos
  playerEffects: ActiveEffect[]; // Array para efeitos no jogador
  monsterEffects: ActiveEffect[]; // Array para efeitos no monstro
  playerClass: CharacterClass;
}

// --- TIPO SIMPLIFICADO PARA ENVIAR AO FRONTEND ---
export interface SimplifiedActiveEffect {
  key: string; // Nome/chave do efeito (ex: 'burning', 'strength_buff')
  duration: number; // Turnos restantes
  // Adicionar 'type' se for útil para o frontend diferenciar ícones?
  // type: 'status' | 'buff' | 'debuff' | 'dot' | 'hot';
}

// O que será enviado ao cliente (visão do frontend)
export interface CombatUpdatePayload {
  isActive: boolean;
  monsterName: string;
  playerHp: number;
  playerMaxHp: number;
  playerEco: number;
  playerMaxEco: number;
  monsterHp: number;
  monsterMaxHp: number;
  log: string[];
  isPlayerTurn: boolean;
  playerEffects?: SimplifiedActiveEffect[]; // Efeitos do jogador para o frontend
  monsterEffects?: SimplifiedActiveEffect[]; // Efeitos do monstro para o frontend
}
