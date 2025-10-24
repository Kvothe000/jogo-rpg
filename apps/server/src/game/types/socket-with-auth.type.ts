import { Socket } from 'socket.io';
import type { UserPayload } from 'src/auth/types/user-payload.type';
import { CombatUpdatePayload } from 'src/battle/types/combat.type';

// 1. Usamos 'Record<string, never>' para sermos explícitos
interface ClientToServerEvents {
  sendChatMessage: (message: string) => void;
  playerLook: () => void; // Jogador pede para "olhar"
  playerMove: (direction: string) => void;
  playerInteractNpc: (npcInstanceId: string) => void; // Jogador pede para "mover"
  startCombat: () => void;
  combatAttack: () => void;
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
    xpGained: string; // XP como string (BigInt)
    goldGained: number;
    newLevel?: number; // Opcional, se houver level up
  }) => void;
}

// 3. Usamos 'Record<string, never>'
type InterServerEvents = Record<string, never>;

// 4. A interface SocketData está correta
interface SocketData {
  user: UserPayload;
}

// 5. O tipo final está correto
export type SocketWithAuth = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
