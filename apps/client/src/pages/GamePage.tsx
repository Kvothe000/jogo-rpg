import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { GameChat } from '../components/GameChat'; 

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
  // Estado principal para o combate
  const [combatData, setCombatData] = useState<CombatUpdatePayload | null>(null);

  // --- EFEITOS E LISTENERS ---
  useEffect(() => {
    if (!socket) return;
// NOVO: Tratamento de atualização de perfil/recompensa
    const handlePlayerUpdated = (payload: { newTotalXp: string; goldGained: number; newLevel?: number }) => {
        // 1. Exibir a recompensa visualmente
        const levelMsg = payload.newLevel ? ` e subiu para o Nível ${payload.newLevel}!` : '.';
        alert(`🎉 RECOMPENSA! Ganhou ${payload.newTotalXp} XP e ${payload.goldGained} Ouro${levelMsg}`);

        // 2. Atualiza o perfil no contexto com os novos valores do DB
        updateProfile({
            character: {
                xp: payload.newTotalXp, 
                gold: (user?.character?.gold ?? 0) + payload.goldGained, // Faz um cálculo local aproximado
                level: payload.newLevel,
                hp: user?.character?.maxHp, // Assume cura total no level up
                eco: user?.character?.maxEco, // Assume cura total no level up
            } as any, // Usamos 'as any' para forçar as props parciais
        });
    };
    const handleUpdateRoom = (data: RoomData) => {
      setRoom(data);
      // Ao mudar de sala, removemos o estado de combate (se houver)
      setCombatData(null); 
    };
    const handleNpcDialogue = (payload: { npcName: string; dialogue: string }) => {
      alert(`${payload.npcName} diz:\n${payload.dialogue}`);
    };
    const handleServerMessage = (message: string) => {
      alert(`[SISTEMA]: ${message}`);
    };

    // NOVO: Tratamento do início de combate
const handleCombatStarted = (payload: any) => {
    // VERIFICAÇÃO DE SEGURANÇA: Garantimos que o HP seja pelo menos 100
    const currentHp = user?.character?.hp ?? 100; 
    const maxHp = user?.character?.maxHp ?? 100;

    setCombatData({
        isActive: true,
        monsterName: payload.monsterName,

        // CORRIGIDO: Agora usa o HP verificado
        playerHp: currentHp, 
        playerMaxHp: maxHp, 

        monsterHp: payload.monsterHp,
        monsterMaxHp: payload.monsterHp,
        log: [payload.message],
        isPlayerTurn: true,
    });
    alert(payload.message);
};

    // NOVO: Atualização de combate (dano, log, etc.)
    const handleCombatUpdate = (payload: CombatUpdatePayload) => {
      setCombatData(payload);
    };

    /// NOVO: Fim de combate
const handleCombatEnd = (result: 'win' | 'loss' | 'flee') => {
  alert(`Batalha Encerrada: ${result === 'win' ? 'VITÓRIA!' : result === 'loss' ? 'DERROTA!' : 'FUGIU!'}`);
  setCombatData(null); // Sai da tela de combate
  // socket?.emit('playerLook'); // <-- REMOVA ESTA LINHA! O backend deve mandar a atualização de volta
};


    // Liga os ouvintes
    socket.on('updateRoom', handleUpdateRoom);
    socket.on('npcDialogue', handleNpcDialogue);
    socket.on('serverMessage', handleServerMessage);
    socket.on('combatStarted', handleCombatStarted); 
    socket.on('combatUpdate', handleCombatUpdate); 
    socket.on('combatEnd', handleCombatEnd);     
    socket.off('playerUpdated', handlePlayerUpdated);
    // Pede os dados da sala assim que o socket conecta (playerLook)
    if (isConnected) {
      socket.emit('playerLook');
    }

    // Função de limpeza
    return () => {
      socket.off('updateRoom', handleUpdateRoom);
      socket.off('npcDialogue', handleNpcDialogue);
      socket.off('serverMessage', handleServerMessage);
      socket.off('combatStarted', handleCombatStarted);
      socket.off('combatUpdate', handleCombatUpdate);
      socket.off('combatEnd', handleCombatEnd);
    };
  }, [socket, isConnected, user, updateProfile]); // Adicione 'user' para garantir que o HP inicial esteja correto

  // --- FUNÇÕES DE AÇÃO ---

  // Função chamada quando um botão de direção é clicado
const handleMove = (direction: string) => {
    if (socket) {
        socket.emit('playerMove', direction); // <-- CHAMA O BACKEND
    }
};

// Função chamada quando o botão de um NPC é clicado
const handleInteractNpc = (npcInstanceId: string) => {
    if (socket) {
        socket.emit('playerInteractNpc', npcInstanceId); // <-- CHAMA O BACKEND
    }
};

  const handleStartCombat = () => {
    if (socket) {
      socket.emit('startCombat'); 
    }
  };

  // NOVO: Função de Ataque
  const handleAttack = () => {
      if (socket && combatData?.isPlayerTurn) {
          socket.emit('combatAttack');
      }
  };

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

                <div style={{ height: '150px', overflowY: 'scroll', border: '1px solid #eee', margin: '10px 0', textAlign: 'left', padding: '5px', fontSize: '0.9em' }}>
                    {combatData.log.map((line, i) => <div key={i}>{line}</div>)}
                </div>

                <p style={{ marginTop: '10px' }}>Turno: **{combatData.isPlayerTurn ? 'SEU ATAQUE' : 'Monstro'}**</p>
                <button 
                    onClick={handleAttack} 
                    disabled={!combatData.isPlayerTurn}
                    style={{ padding: '10px 20px', background: 'darkgreen', color: 'white', border: 'none', cursor: combatData.isPlayerTurn ? 'pointer' : 'not-allowed' }}
                >
                    Ataque Básico (Força)
                </button>
                {/* Futuramente: Botão de Habilidades */}
            </div>
        ) : (
            // --- MODO EXPLORAÇÃO ---
            <>
                <h2>{room.name}</h2>
                <p>{room.description}</p>

                {/* ... (Seções de NPCs e Jogadores) ... */}
                {/* Mantive o código da sala e dos NPCs aqui (do código anterior) */}
                {room.npcs && room.npcs.length > 0 && (
                    <div style={{ marginTop: '15px' }}>
                        <h4>NPCs Presentes:</h4>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {room.npcs.map((npc) => (
                            <li key={npc.id} style={{ marginBottom: '5px' }}>
                                <button onClick={() => handleInteractNpc(npc.id)}>{npc.name} (Conversar)</button>
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
                    style={{ padding: '10px 15px', background: 'red', color: 'white', border: 'none', cursor: 'pointer' }}
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
                            style={{ marginRight: '10px', textTransform: 'capitalize', padding: '8px 12px' }}
                        >
                            {direction}
                        </button>
                    ))}
                </div>
            </>
        )}

      </div>

      {/* Coluna da Direita (Info do Jogador e Chat) */}
      <div style={{ width: '40%', border: '1px solid #ccc', padding: '15px' }}>
        <h3>{user?.character?.name} (Nível {user?.character?.level})</h3>
        <p>Status: {user?.character?.status === 'AWAKENED' ? 'Despertado' : 'Bloqueado'}</p>
        <p>HP: {user?.character?.hp}/{user?.character?.maxHp}</p>
        <p>Eco: {user?.character?.eco}/{user?.character?.maxEco}</p>
        <p>Ouro: {user?.character?.gold}</p>
        <p>XP: {user?.character?.xp?.toString() ?? '0'}</p>

        <p>Estado da Ligação: {isConnected ? <span style={{ color: 'green' }}> Ligado</span> : <span style={{ color: 'red' }}> Desligado</span>}</p>
        <button onClick={logout} style={{ marginTop: '10px' }}>Sair</button>
        <hr style={{ margin: '20px 0' }}/>
        <GameChat />
      </div>
    </div>
  );
}