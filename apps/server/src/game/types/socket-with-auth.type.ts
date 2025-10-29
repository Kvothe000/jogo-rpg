import { Socket } from 'socket.io';
import type { UserPayload } from 'src/auth/types/user-payload.type';
import { CombatUpdatePayload } from 'src/battle/types/combat.type';
import { ItemType, EquipSlot, PowerKeyword, Skill } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { types } from 'util';

// --- PAYLOAD TYPES ---

/**
 * Payload para atualizar os atributos base do jogador no cliente.
 */
export interface BaseStatsPayload {
  strength: number;
  dexterity: number;
  intelligence: number;
  constitution: number;
  attributePoints: number;
}

// 1. Usamos 'Record<string, never>' para sermos explícitos
interface ClientToServerEvents {
  sendChatMessage: (message: string) => void;
  playerLook: () => void; // Jogador pede para "olhar"
  playerMove: (direction: string) => void;
  playerInteractNpc: (npcInstanceId: string) => void; // Jogador pede para "mover"
  startCombat: () => void;
  combatAttack: () => void;
  requestInventory: () => void;
  equipItem: (payload: { slotId: string }) => void;
  unequipItem: (payload: { slotId: string }) => void;
  useItem: (payload: { slotId: string }) => void;
  spendAttributePoint: (payload: { attribute: string }) => void; // <-- NOVO EVENTO
  requestKeywords: () => void;
  requestAvailableSkills: () => void; // Pedir skills que podem ser aprendidas
  requestLearnedSkills: () => void; // Pedir skills já aprendidas
  learnSkill: (payload: { skillId: string }) => void; // Tentar aprender uma skill
  combatUseSkill: (payload: { skillId: string }) => void;
}

// 2. Usamos 'Record<string, never>'
interface ServerToClientEvents {
  receiveChatMessage: (payload: { sender: string; message: string }) => void;
  serverMessage: (message: string) => void;
  // Evento para atualizar a visão do jogador sobre o mundo
  updateRoom: (roomData: {
    name: string;
    description: string;
    exits: Record<string, string>; // { "norte": "id_sala", "sul": "id_sala" }
    players: { id: string; name: string }[];
    npcs: { id: string; name: string }[];
  }) => void;
  npcDialogue: (payload: { npcName: string; dialogue: string }) => void;
  combatStarted: (payload: {
    monsterName: string;
    monsterHp: number;
    message: string;
  }) => void;
  combatUpdate: (payload: CombatUpdatePayload) => void; // NOVO: Atualiza a interface de combate
  combatEnd: (result: 'win' | 'loss' | 'flee') => void; // NOVO: Fim do combate
  playerUpdated: (payload: {
    newTotalXp: string; // XP como string (BigInt)
    goldGained: number;
    newLevel?: number; // Opcional, se houver level up
  }) => void;
  lootReceived: (payload: { drops: LootDropPayload[] }) => void;
  updateInventory: (payload: { slots: InventorySlotData[] }) => void;
  playerStatsUpdated: (payload: CharacterTotalStats) => void;
  updateKeywords: (payload: { keywords: KeywordData[] }) => void;
  updateAvailableSkills: (payload: { skills: AvailableSkillData[] }) => void; // Enviar skills disponíveis
  updateLearnedSkills: (payload: { skills: LearnedSkillData[] }) => void; // Enviar skills aprendidas
  playerVitalsUpdated: (payload: {
    hp: number;
    maxHp: number;
    eco: number;
    maxEco: number;
  }) => void;
  playerBaseStatsUpdated: (payload: BaseStatsPayload) => void; // <-- NOVO EVENTO
}

// 3. Usamos 'Record<string, never>'
type InterServerEvents = Record<string, never>;

// 4. A interface SocketData está correta
interface SocketData {
  user: UserPayload;
}

export interface LootDropPayload {
  itemId: string;
  itemName: string;
  quantity: number;
}

// NOVO: Tipo para os dados de um slot do inventário enviados ao cliente
export interface InventorySlotData {
  slotId: string; // ID do InventorySlot
  itemId: string;
  itemName: string;
  itemDescription: string;
  itemType: ItemType;
  itemSlot: EquipSlot | null; // Onde equipa (se for equipamento)
  quantity: number;
  isEquipped: boolean;
  // Futuro: itemStats: Record<string, number>;
}

export interface CharacterTotalStats {
  // Inclui APENAS os stats que podem ser modificados por equipamento
  totalStrength: number;
  totalDexterity: number;
  totalIntelligence: number;
  totalConstitution: number;
  totalMaxHp: number; // MaxHP pode ser afectado por Constitution E itens
  totalMaxEco: number; // MaxEco pode ser afectado por Intelligence E itens
  // Adicionar outros stats derivados se necessário (ex: totalDefense, totalAttack)
  types: string[];
}

// NOVO: Tipo para os dados de uma Keyword enviados ao cliente
interface KeywordData {
  id: string;
  name: string;
  description: string;
}

// Dados enviados para "AvailableSkill" (simplificado para o frontend)
export interface AvailableSkillData
  extends Omit<Skill, 'requiredKeywords' | 'characters'> {
  requiredKeywordsData: Pick<PowerKeyword, 'id' | 'name'>[];
}

// Dados enviados para "LearnedSkill" (pode incluir nível da skill no futuro)
export interface LearnedSkillData
  extends Omit<Skill, 'requiredKeywords' | 'characters'> {
  // level?: number; // Poderíamos adicionar o nível da skill aqui vindo de CharacterSkill
  requiredKeywordsData: Pick<PowerKeyword, 'id' | 'name'>[]; // Manter os requisitos visíveis
}

// 5. O tipo final está correto
export type SocketWithAuth = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type { CombatUpdatePayload, KeywordData };
