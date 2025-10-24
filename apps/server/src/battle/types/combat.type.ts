/* eslint-disable @typescript-eslint/no-unused-vars */
import { GameMap } from '@prisma/client';
import { NPCTemplate } from '@prisma/client';
import { SocketWithAuth } from 'src/game/types/socket-with-auth.type';
import { TokenPayload } from 'src/auth/types/user-payload.type';

// Estado da batalha em tempo real (usado no backend)
export interface CombatInstance {
  monsterName: string;
  id: string; // ID da instância de combate (pode ser o characterId)
  playerId: string;
  playerHp: number;
  playerMaxHp: number;
  monsterTemplate: NPCTemplate; // O template do monstro
  monsterHp: number;
  monsterMaxHp: number;
  lastAction: number; // Timestamp da última ação
}

// O que será enviado ao cliente (visão do frontend)
export interface CombatUpdatePayload {
  isActive: boolean;
  monsterName: string;
  playerHp: number;
  playerMaxHp: number;
  monsterHp: number;
  monsterMaxHp: number;
  log: string[];
  isPlayerTurn: boolean;
}
