import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { GameChat } from '../components/GameChat'; 
import { InventoryDisplay } from '../components/InventoryDisplay';
import type { LootDropPayload, InventorySlotData } from '../../../server/src/game/types/socket-with-auth.type'; // <-- ADICIONE/CORRIJA ESTA LINHA

// Tipos necessários
interface RoomData {
  name: string;
  description: string;
  exits: Record<string, string>;
  players: { id: string; name: string }[];
  npcs: { id: string; name: string }[];
}

interface CombatUpdatePayload {
  isActive: boolean;
  monsterName: string;
  playerHp: number;
  playerMaxHp: number;
  monsterHp: number;
  monsterMaxHp: number;
  log: string[];
  isPlayerTurn: boolean;
}

export function GamePage() {
  const { user, logout, updateProfile } = useAuth();
  const { socket, isConnected } = useSocket();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [combatData, setCombatData] = useState<CombatUpdatePayload | null>(null);
  // NOVO ESTADO PARA O INVENTÁRIO
  const [inventorySlots, setInventorySlots] = useState<InventorySlotData[]>([]);
  const [showInventory, setShowInventory] = useState(false);
  
  // Refs para acessar valores atualizados nos listeners
  const userRef = useRef(user);
  const updateProfileRef = useRef(updateProfile);
  const combatDataRef = useRef(combatData);

  // Atualizar as refs quando os valores mudam
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    updateProfileRef.current = updateProfile;
  }, [updateProfile]);

  useEffect(() => {
    combatDataRef.current = combatData;
  }, [combatData]);

  // --- EFEITOS E LISTENERS ---
  useEffect(() => {
    if (!socket) return;

    console.log('GAMEPAGE: Registrando listeners do socket...');

    const handleUpdateRoom = (data: RoomData) => {
      console.log('Dados da sala recebidos:', data);
      setRoom(data);
      setCombatData(null);
    };

    const handleNpcDialogue = (payload: { npcName: string; dialogue: string }) => {
      alert(`${payload.npcName} diz:\n${payload.dialogue}`);
    };

    const handleServerMessage = (message: string) => {
      alert(`[SISTEMA]: ${message}`);
    };

    const handleCombatStarted = (payload: any) => {
      const currentUser = userRef.current;
      const currentHp = currentUser?.character?.hp ?? 100;
      const maxHp = currentUser?.character?.maxHp ?? 100;
      
      setCombatData({
        isActive: true,
        monsterName: payload.monsterName,
        playerHp: currentHp,
        playerMaxHp: maxHp,
        monsterHp: payload.monsterHp,
        monsterMaxHp: payload.monsterHp,
        log: [payload.message],
        isPlayerTurn: true,
      });
      alert(payload.message);
    };

    const handleCombatUpdate = (payload: CombatUpdatePayload) => {
      setCombatData(payload);
    };

    const handleCombatEnd = (result: 'win' | 'loss' | 'flee') => {
      alert(`Batalha Encerrada: ${result === 'win' ? 'VITÓRIA!' : result === 'loss' ? 'DERROTA!' : 'FUGIU!'}`);
      setCombatData(null);
    };

    const handlePlayerUpdated = (payload: { 
      newTotalXp: string; 
      goldGained: number; 
      newLevel?: number;
      newHp?: number;
    }) => {
      const currentUser = userRef.current;
      const currentCombatData = combatDataRef.current;
      
      // Calcular XP ganho a partir do total
      const currentXp = currentUser?.character?.xp ?? BigInt(0);
      const xpGained = BigInt(payload.newTotalXp) - currentXp;
      
      const levelMsg = payload.newLevel ? ` e subiu para o Nível ${payload.newLevel}!` : '.';
      alert(`🎉 RECOMPENSA! Ganhou ${xpGained.toString()} XP e ${payload.goldGained} Ouro${levelMsg}`);

      // Usar HP do payload se disponível, caso contrário usar HP do combate ou do usuário
      const updatedHp = payload.newHp ?? currentCombatData?.playerHp ?? currentUser?.character?.hp;
      
      updateProfileRef.current({
        character: {
          xp: payload.newTotalXp,
          gold: (currentUser?.character?.gold ?? 0) + payload.goldGained,
          level: payload.newLevel ?? currentUser?.character?.level,
          hp: payload.newLevel ? currentUser?.character?.maxHp : updatedHp,
          maxHp: payload.newLevel ? (currentUser?.character?.maxHp ?? 100) + 50 : currentUser?.character?.maxHp,
          eco: payload.newLevel ? currentUser?.character?.maxEco : currentUser?.character?.eco,
        } as any,
      });
    };

    const handleLootReceived = (payload: { drops: LootDropPayload[] }) => {
      if (payload.drops.length > 0) {
        const lootMessage = payload.drops.map(d => `${d.quantity}x ${d.itemName}`).join(', ');
        alert(`💰 LOOT! Você obteve: ${lootMessage}`);
      }
    };

    // NOVO OUVINTE para atualização do inventário
    const handleUpdateInventory = (payload: { slots: InventorySlotData[] }) => {
      console.log("Inventário recebido:", payload.slots);
      setInventorySlots(payload.slots);
      setShowInventory(true);
    };

    // Liga os ouvintes
    socket.on('updateRoom', handleUpdateRoom);
    socket.on('npcDialogue', handleNpcDialogue);
    socket.on('serverMessage', handleServerMessage);
    socket.on('combatStarted', handleCombatStarted);
    socket.on('combatUpdate', handleCombatUpdate);
    socket.on('combatEnd', handleCombatEnd);
    socket.on('playerUpdated', handlePlayerUpdated);
    socket.on('lootReceived', handleLootReceived);
    socket.on('updateInventory', handleUpdateInventory); // NOVO: Ouvinte de inventário

    // Pede os dados da sala apenas uma vez quando o socket conecta
    if (isConnected) {
      console.log("Socket conectado, pedindo dados da sala...");
      socket.emit('playerLook');
    }

    // Função de limpeza
    return () => {
      console.log('GAMEPAGE: Limpando listeners do socket...');
      socket.off('updateRoom', handleUpdateRoom);
      socket.off('npcDialogue', handleNpcDialogue);
      socket.off('serverMessage', handleServerMessage);
      socket.off('combatStarted', handleCombatStarted);
      socket.off('combatUpdate', handleCombatUpdate);
      socket.off('combatEnd', handleCombatEnd);
      socket.off('playerUpdated', handlePlayerUpdated);
      socket.off('lootReceived', handleLootReceived);
      socket.off('updateInventory', handleUpdateInventory); // NOVO: Remove ouvinte de inventário
    };
  }, [socket, isConnected]);

  // --- FUNÇÕES DE AÇÃO ---

  const handleMove = useCallback((direction: string) => {
    if (socket) {
      socket.emit('playerMove', direction);
    }
  }, [socket]);

  const handleInteractNpc = useCallback((npcInstanceId: string) => {
    if (socket) {
      socket.emit('playerInteractNpc', npcInstanceId);
    }
  }, [socket]);

  const handleStartCombat = useCallback(() => {
    if (socket) {
      socket.emit('startCombat'); 
    }
  }, [socket]);

  const handleAttack = useCallback(() => {
    if (socket && combatData?.isPlayerTurn) {
      socket.emit('combatAttack');
    }
  }, [socket, combatData]);

  // NOVA FUNÇÃO para pedir o inventário
  const handleRequestInventory = useCallback(() => {
    if (socket) {
      console.log("Pedindo inventário...");
      socket.emit('requestInventory');
    }
  }, [socket]);

  if (!room) {
    return <div>Carregando informações da sala...</div>;
  }

  // RENDERIZAÇÃO DA PÁGINA
  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', padding: '20px', fontFamily: 'sans-serif' }}>

      {/* Coluna da Esquerda (Mundo e Ações) */}
      <div style={{ width: '60%', border: '1px solid #ccc', padding: '15px' }}>

        {/* RENDERIZAÇÃO CONDICIONAL */}
        {combatData?.isActive ? (
          // --- MODO COMBATE ---
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: 'red' }}>Lutando contra: {combatData.monsterName}</h2>

            <div style={{ margin: '20px 0' }}>
              <p>HP Monstro: **{combatData.monsterHp} / {combatData.monsterMaxHp}**</p>
              <p style={{ fontWeight: 'bold' }}>Seu HP: {combatData.playerHp} / {combatData.playerMaxHp}</p>
            </div>

            <div style={{ 
              height: '150px', 
              overflowY: 'scroll', 
              border: '1px solid #eee', 
              margin: '10px 0', 
              textAlign: 'left', 
              padding: '5px', 
              fontSize: '0.9em' 
            }}>
              {combatData.log.map((line, i) => <div key={i}>{line}</div>)}
            </div>

            <p style={{ marginTop: '10px' }}>
              Turno: **{combatData.isPlayerTurn ? 'SEU ATAQUE' : 'Monstro'}**
            </p>
            <button 
              onClick={handleAttack} 
              disabled={!combatData.isPlayerTurn}
              style={{ 
                padding: '10px 20px', 
                background: 'darkgreen', 
                color: 'white', 
                border: 'none', 
                cursor: combatData.isPlayerTurn ? 'pointer' : 'not-allowed' 
              }}
            >
              Ataque Básico (Força)
            </button>
          </div>
        ) : (
          // --- MODO EXPLORAÇÃO ---
          <>
            <h2>{room.name}</h2>
            <p>{room.description}</p>

            {/* Seções de NPCs e Jogadores */}
            {room.npcs && room.npcs.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <h4>NPCs Presentes:</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {room.npcs.map((npc) => (
                    <li key={npc.id} style={{ marginBottom: '5px' }}>
                      <button onClick={() => handleInteractNpc(npc.id)}>
                        {npc.name} (Conversar)
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {room.players && room.players.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <h4>Outros Jogadores:</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {room.players.map((player) => (
                    <li key={player.id} style={{ marginBottom: '5px' }}>
                      {player.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <hr style={{ margin: '20px 0' }}/>

            {/* BOTÃO DE INICIAR COMBATE (FORA DO MODO COMBATE) */}
            <h3>Ações de Teste</h3>
            <button 
              onClick={handleStartCombat} 
              style={{ 
                padding: '10px 15px', 
                background: 'red', 
                color: 'white', 
                border: 'none', 
                cursor: 'pointer' 
              }}
            >
              ⚔️ INICIAR COMBATE (TESTE)
            </button>

            <hr style={{ margin: '20px 0' }}/>

            <h3>Saídas:</h3>
            <div>
              {Object.keys(room.exits).map((direction) => (
                <button
                  key={direction}
                  onClick={() => handleMove(direction)}
                  style={{ 
                    marginRight: '10px', 
                    textTransform: 'capitalize', 
                    padding: '8px 12px' 
                  }}
                >
                  {direction}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Coluna da Direita (Info do Jogador, Chat e Inventário) */}
      <div style={{ width: '40%', border: '1px solid #ccc', padding: '15px' }}>
        <h3>{user?.character?.name} (Nível {user?.character?.level})</h3>
        <p>Status: {user?.character?.status === 'AWAKENED' ? 'Despertado' : 'Bloqueado'}</p>
        <p>HP: {user?.character?.hp}/{user?.character?.maxHp}</p>
        <p>Eco: {user?.character?.eco}/{user?.character?.maxEco}</p>
        <p>Ouro: {user?.character?.gold}</p>
        <p>XP: {user?.character?.xp?.toString() ?? '0'}</p>

        <p>Estado da Ligação: {isConnected ? 
          <span style={{ color: 'green' }}> Ligado</span> : 
          <span style={{ color: 'red' }}> Desligado</span>}
        </p>
        
        {/* BOTÃO PARA ABRIR/PEDIR INVENTÁRIO */}
        <div style={{ marginTop: '10px' }}>
          <button 
            onClick={handleRequestInventory} 
            style={{ 
              background: 'orange', 
              border: 'none', 
              padding: '8px 10px', 
              cursor: 'pointer', 
              marginRight: '5px' 
            }}
          >
            🎒 Inventário
          </button>
          {/* Botão para fechar (opcional) */}
          {showInventory && (
            <button 
              onClick={() => setShowInventory(false)} 
              style={{ 
                background: 'grey', 
                color: 'white',
                border: 'none',
                padding: '8px 10px',
                cursor: 'pointer'
              }}
            >
              Fechar Inv.
            </button>
          )}
        </div>

        {/* RENDERIZAÇÃO CONDICIONAL DO INVENTÁRIO */}
        {showInventory && (
          <div style={{ marginTop: '15px' }}>
            <InventoryDisplay slots={inventorySlots} />
          </div>
        )}

        <button onClick={logout} style={{ marginTop: '10px' }}>Sair</button>
        <hr style={{ margin: '20px 0' }}/>
        <GameChat />
      </div>
    </div>
  );
}