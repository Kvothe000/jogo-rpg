import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { GameChat } from '../components/GameChat';
import { InventoryDisplay } from '../components/InventoryDisplay';
import { KeywordsDisplay } from '../components/KeywordsDisplay';
import { AvailableSkillsDisplay } from '../components/AvailableSkillsDisplay';
import { LearnedSkillsDisplay } from '../components/LearnedSkillsDisplay';
import type {
    CombatUpdatePayload,
    LootDropPayload,
    InventorySlotData,
    CharacterTotalStats,
    KeywordData,
    AvailableSkillData,
    LearnedSkillData
} from '../../../server/src/game/types/socket-with-auth.type';

// Tipos necessários (definidos localmente)
interface RoomData {
    name: string;
    description: string;
    exits: Record<string, string>;
    players: { id: string; name: string }[];
    npcs: { id: string; name: string }[];
}

interface CombatStartedPayload {
    monsterName: string;
    monsterHp: number;
    message: string;
}

export function GamePage() {
    const { user, logout, updateProfile } = useAuth();
    const { socket, isConnected } = useSocket();
    const [room, setRoom] = useState<RoomData | null>(null);
    const [combatData, setCombatData] = useState<CombatUpdatePayload | null>(null);
    const [inventorySlots, setInventorySlots] = useState<InventorySlotData[]>([]);
    const [showInventory, setShowInventory] = useState(false);
    const [keywords, setKeywords] = useState<KeywordData[]>([]);
    const [showKeywords, setShowKeywords] = useState(false);
    const [availableSkills, setAvailableSkills] = useState<AvailableSkillData[]>([]);
    const [learnedSkills, setLearnedSkills] = useState<LearnedSkillData[]>([]);
    const [showSkillsManager, setShowSkillsManager] = useState(false);

    // Refs
    const userRef = useRef(user);
    const updateProfileRef = useRef(updateProfile);

    // Atualiza Refs
    useEffect(() => { userRef.current = user; }, [user]);
    useEffect(() => { updateProfileRef.current = updateProfile; }, [updateProfile]);

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

        const handleCombatStarted = (payload: CombatStartedPayload) => {
            const currentUser = userRef.current;
            const currentHp = currentUser?.character?.hp ?? 100;
            const maxHp = currentUser?.character?.maxHp ?? 100;
            const currentEco = currentUser?.character?.eco ?? 50;
            const maxEco = currentUser?.character?.maxEco ?? 50;
            
            setCombatData({
                isActive: true,
                monsterName: payload.monsterName,
                playerHp: currentHp,
                playerMaxHp: maxHp,
                playerEco: currentEco,
                playerMaxEco: maxEco,
                monsterHp: payload.monsterHp,
                monsterMaxHp: payload.monsterHp,
                log: [payload.message],
                isPlayerTurn: true,
            });
            alert(payload.message);
        };

        const handleCombatUpdate = (payload: CombatUpdatePayload) => {
            console.log("Combat Update Recebido:", payload);
            setCombatData(payload);

            // --- ATUALIZAR AuthContext ---
            updateProfileRef.current({
                character: {
                    hp: payload.playerHp,
                    maxHp: payload.playerMaxHp,
                    eco: payload.playerEco,
                    maxEco: payload.playerMaxEco,
                } as any,
            });
            console.log("[GamePage DEBUG] AuthContext atualizado com HP/Eco do combatUpdate.");
        };

        const handleCombatEnd = (result: 'win' | 'loss' | 'flee') => {
            alert(`Batalha Encerrada: ${result === 'win' ? 'VITÓRIA!' : result === 'loss' ? 'DERROTA!' : 'FUGIU!'}`);
            setCombatData(null);
        };

        const handlePlayerUpdated = (payload: {
            newTotalXp: string;
            goldGained: number;
            newLevel?: number;
        }) => {
            console.log('[GamePage DEBUG] handlePlayerUpdated CHAMADO! Payload:', payload);

            try {
                const currentUser = userRef.current;
                console.log('[GamePage DEBUG] currentUser (ref):', currentUser);

                // Calcular XP ganho APENAS para o alert
                const currentXpBigInt = currentUser?.character?.xp ?? BigInt(0);
                console.log('[GamePage DEBUG] currentXpBigInt:', currentXpBigInt);

                const newTotalXpBigInt = BigInt(payload.newTotalXp);
                console.log('[GamePage DEBUG] newTotalXpBigInt:', newTotalXpBigInt);

                // Verificar se a subtração é válida (evitar erro BigInt)
                let xpGained: bigint;
                if (typeof currentXpBigInt === 'bigint' && typeof newTotalXpBigInt === 'bigint') {
                    xpGained = newTotalXpBigInt - currentXpBigInt;
                    console.log('[GamePage DEBUG] xpGained calculado:', xpGained);
                } else {
                    console.error('[GamePage DEBUG] ERRO: Tipos inválidos para cálculo de xpGained!');
                    xpGained = BigInt(0);
                }

                const levelMsg = payload.newLevel ? ` e subiu para o Nível ${payload.newLevel}!` : '.';
                const alertMsg = `🎉 RECOMPENSA! Ganhou ${xpGained.toString()} XP e ${payload.goldGained} Ouro${levelMsg}`;
                console.log('[GamePage DEBUG] Mensagem do Alerta:', alertMsg);

                // Mostra o Alerta
                alert(alertMsg);

                console.log('[GamePage DEBUG] Alerta exibido. Chamando updateProfileRef...');

                // Calcula o novo total de ouro (Number)
                const newGoldTotal = (currentUser?.character?.gold ?? 0) + payload.goldGained;

                // Calcula o novo HP (considerando cura no level up)
                let newHp = currentUser?.character?.hp ?? 0;
                let newMaxHp = currentUser?.character?.maxHp ?? 100;
                let newEco = currentUser?.character?.eco ?? 50;
                let newMaxEco = currentUser?.character?.maxEco ?? 50;

                if (payload.newLevel && payload.newLevel > (currentUser?.character?.level ?? 0)) {
                    // Se houve level up, recalcula max stats e cura (como no backend)
                    newMaxHp += 50;
                    newMaxEco += 20;
                    newHp = newMaxHp; // Cura total
                    newEco = newMaxEco; // Restaura Eco total
                }

                console.log('🔄 Atualizando perfil com:', {
                    xp: payload.newTotalXp,
                    gold: newGoldTotal,
                    level: payload.newLevel,
                    hp: newHp,
                    maxHp: payload.newLevel ? newMaxHp : undefined,
                    eco: newEco,
                    maxEco: payload.newLevel ? newMaxEco : undefined,
                });

                // Chama updateProfile APENAS com os dados que mudaram
                updateProfileRef.current({
                    character: {
                        xp: payload.newTotalXp,
                        gold: newGoldTotal,
                        level: payload.newLevel,
                        hp: newHp,
                        maxHp: payload.newLevel ? newMaxHp : undefined,
                        eco: newEco,
                        maxEco: payload.newLevel ? newMaxEco : undefined,
                    } as any,
                });

                console.log('[GamePage DEBUG] updateProfileRef chamado com sucesso.');

            } catch (error) {
                console.error('[GamePage DEBUG] ERRO DENTRO de handlePlayerUpdated:', error);
            }
        };

        const handleLootReceived = (payload: { drops: LootDropPayload[] }) => {
            if (payload.drops.length > 0) {
                const lootMessage = payload.drops.map(d => `${d.quantity}x ${d.itemName}`).join(', ');
                alert(`💰 LOOT! Você obteve: ${lootMessage}`);
            }
        };

        const handleUpdateInventory = (payload: { slots: InventorySlotData[] }) => {
            console.log("Inventário recebido:", payload.slots);
            setInventorySlots(payload.slots);
            setShowInventory(true);
        };

        const handlePlayerStatsUpdated = (payload: CharacterTotalStats) => {
            console.log("[GamePage DEBUG] Stats Totais Recebidos:", payload);

            updateProfileRef.current({
                character: {
                    strength: payload.totalStrength,
                    dexterity: payload.totalDexterity,
                    intelligence: payload.totalIntelligence,
                    constitution: payload.totalConstitution,
                    maxHp: payload.totalMaxHp,
                    maxEco: payload.totalMaxEco,
                } as any,
            });
            console.log("[GamePage DEBUG] updateProfile chamado com novos stats.");
        };

        const handleUpdateKeywords = (payload: { keywords: KeywordData[] }) => {
            console.log("[GamePage DEBUG] Keywords recebidas:", payload.keywords);
            setKeywords(payload.keywords);
            setShowKeywords(true);
        };

        // --- NOVOS HANDLERS PARA SKILLS ---
        const handleUpdateAvailableSkills = (payload: { skills: AvailableSkillData[] }) => {
            console.log("[GamePage DEBUG] Skills Disponíveis recebidas:", payload.skills);
            setAvailableSkills(payload.skills);
        };

        const handleUpdateLearnedSkills = (payload: { skills: LearnedSkillData[] }) => {
            console.log("[GamePage DEBUG] Skills Aprendidas recebidas:", payload.skills);
            setLearnedSkills(payload.skills);
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
        socket.on('updateInventory', handleUpdateInventory);
        socket.on('playerStatsUpdated', handlePlayerStatsUpdated);
        socket.on('updateKeywords', handleUpdateKeywords);
        socket.on('updateAvailableSkills', handleUpdateAvailableSkills);
        socket.on('updateLearnedSkills', handleUpdateLearnedSkills);

        // Pedir skills aprendidas ao conectar
        handleRequestLearnedSkills();

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
            socket.off('updateInventory', handleUpdateInventory);
            socket.off('playerStatsUpdated', handlePlayerStatsUpdated);
            socket.off('updateKeywords', handleUpdateKeywords);
            socket.off('updateAvailableSkills', handleUpdateAvailableSkills);
            socket.off('updateLearnedSkills', handleUpdateLearnedSkills);
        };
    }, [socket]);

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

    const handleRequestInventory = useCallback(() => {
        if (socket) {
            console.log("Pedindo inventário...");
            socket.emit('requestInventory');
        }
    }, [socket]);

    const handleRequestKeywords = useCallback(() => {
        if (socket) {
            console.log("Pedindo keywords...");
            socket.emit('requestKeywords');
        }
    }, [socket]);

    // --- NOVAS FUNÇÕES PARA SKILLS ---
    const handleRequestAvailableSkills = useCallback(() => {
        if (socket) {
            console.log("Pedindo skills disponíveis...");
            socket.emit('requestAvailableSkills');
        }
    }, [socket]);

    const handleRequestLearnedSkills = useCallback(() => {
        if (socket) {
            console.log("Pedindo skills aprendidas...");
            socket.emit('requestLearnedSkills');
        }
    }, [socket]);

    const handleLearnSkill = useCallback((skillId: string) => {
        if (socket) {
            console.log(`Tentando aprender skill ${skillId}...`);
            socket.emit('learnSkill', { skillId: skillId });
        }
    }, [socket]);

    // --- NOVA FUNÇÃO PARA USAR SKILL ---
    const handleUseSkill = useCallback((skillId: string) => {
        const currentCombatData = combatData;
        const currentUser = userRef.current;

        if (socket && currentCombatData?.isPlayerTurn) {
            // Busca a skill na lista de aprendidas para pegar o custo
            const skill = learnedSkills.find(s => s.id === skillId);
            if (!skill) {
                console.error(`Tentativa de usar skill desconhecida: ${skillId}`);
                alert('Erro: Skill não encontrada.');
                return;
            }
            
            // Verificação de Eco no frontend (feedback rápido)
            const currentEco = currentUser?.character?.eco ?? 0;
            if (currentEco < skill.ecoCost) {
                alert(`Eco insuficiente para usar ${skill.name} (Custo: ${skill.ecoCost}, Atual: ${currentEco})`);
                return;
            }

            console.log(`Usando skill ${skillId}...`);
            socket.emit('combatUseSkill', { skillId: skillId });
        } else if (!currentCombatData?.isPlayerTurn) {
            alert('Aguarde o seu turno!');
        }
    }, [socket, combatData, learnedSkills]);

    if (!room) {
        return <div>Carregando informações da sala...</div>;
    }

    // Pegar eco atual para exibição - agora sincronizado automaticamente via handleCombatUpdate
    const currentEco = user?.character?.eco ?? 0;
    const maxEco = user?.character?.maxEco ?? 50;

    // RENDERIZAÇÃO DA PÁGINA
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '20px',
            padding: '20px',
            fontFamily: 'var(--font-main)',
            minHeight: 'calc(100vh - 40px)',
        }}>

            {/* Coluna da Esquerda (Mundo e Ações) */}
            <div style={{
                width: '60%',
                border: '1px solid var(--color-border)',
                padding: '15px',
                backgroundColor: 'var(--color-citadel-primary)',
                color: 'var(--color-citadel-text)',
                borderRadius: '4px',
            }}>

                {/* RENDERIZAÇÃO CONDICIONAL */}
                {combatData?.isActive ? (
                    // --- MODO COMBATE ---
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ color: 'var(--color-danger)' }}>
                            Lutando contra: {combatData.monsterName}
                        </h2>

                        <div style={{ margin: '20px 0' }}>
                            <p>HP Monstro: <span style={{color: 'var(--color-warning)'}}>{combatData.monsterHp}</span> / {combatData.monsterMaxHp}</p>
                            <p style={{ fontWeight: 'bold' }}>Seu HP: <span style={{color: 'var(--color-hp)'}}>{combatData.playerHp}</span> / {combatData.playerMaxHp}</p>
                            <p style={{ fontWeight: 'bold', color: 'var(--color-eco)' }}>Seu Eco: {currentEco} / {maxEco}</p>
                        </div>

                        <div style={{
                            height: '150px',
                            overflowY: 'scroll',
                            border: '1px solid var(--color-border)',
                            margin: '10px 0',
                            textAlign: 'left',
                            padding: '8px',
                            fontSize: '0.9em',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            fontFamily: 'var(--font-display)',
                        }}>
                            {combatData.log.map((line: string, i: number) => <div key={i}>{line}</div>)}
                        </div>

                        <p style={{ marginTop: '10px' }}>
                            Turno: {combatData.isPlayerTurn ?
                                <span style={{color: 'var(--color-renegade-cyan)'}}>SEU TURNO</span> :
                                <span style={{color: 'var(--color-warning)'}}>Monstro</span>
                            }
                        </p>

                        {/* --- BOTÕES DE AÇÃO DE COMBATE --- */}
                        <div style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {/* Botão Ataque Básico */}
                            <button 
                                onClick={handleAttack} 
                                disabled={!combatData.isPlayerTurn}
                                style={{ 
                                    padding: '10px 20px', 
                                    background: 'var(--color-danger)', 
                                    color: 'white', 
                                    border: 'none', 
                                    cursor: combatData.isPlayerTurn ? 'pointer' : 'not-allowed',
                                    borderRadius: '4px',
                                }}
                            >
                                Ataque Básico (Força)
                            </button>

                            {/* --- BOTÕES DE SKILL --- */}
                            {learnedSkills.map((skill) => {
                                const hasEnoughEco = currentEco >= skill.ecoCost;
                                const canUse = combatData.isPlayerTurn && hasEnoughEco;
                                return (
                                    <button
                                        key={skill.id}
                                        onClick={() => handleUseSkill(skill.id)}
                                        disabled={!canUse}
                                        title={`${skill.name} - Custo: ${skill.ecoCost} Eco\n${skill.description}`}
                                        style={{
                                            padding: '10px 15px',
                                            background: 'var(--color-renegade-purple)',
                                            color: 'white',
                                            border: 'none',
                                            cursor: canUse ? 'pointer' : 'not-allowed',
                                            opacity: canUse ? 1 : 0.6,
                                            borderRadius: '4px',
                                        }}
                                    >
                                        {skill.name} ({skill.ecoCost})
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    // --- MODO EXPLORAÇÃO ---
                    <>
                        <h2 style={{ color: 'var(--color-citadel-text)' }}>{room.name}</h2>
                        <p>{room.description}</p>

                        {/* Seções de NPCs e Jogadores */}
                        {room.npcs && room.npcs.length > 0 && (
                            <div style={{ marginTop: '15px' }}>
                                <h4>NPCs Presentes:</h4>
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {room.npcs.map((npc: { id: string; name: string }) => (
                                        <li key={npc.id} style={{ marginBottom: '5px' }}>
                                            <button 
                                                onClick={() => handleInteractNpc(npc.id)}
                                                style={{
                                                    padding: '8px 12px',
                                                    background: 'var(--color-info)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
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
                                    {room.players.map((player: { id: string; name: string }) => (
                                        <li key={player.id} style={{ marginBottom: '5px' }}>
                                            {player.name}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <hr style={{ margin: '20px 0', borderColor: 'var(--color-border)' }}/>

                        {/* BOTÃO DE INICIAR COMBATE (FORA DO MODO COMBATE) */}
                        <h3>Ações de Teste</h3>
                        <button 
                            onClick={handleStartCombat} 
                            style={{ 
                                padding: '10px 15px', 
                                background: 'var(--color-warning)', 
                                color: 'black', 
                                border: 'none', 
                                cursor: 'pointer',
                                borderRadius: '4px',
                            }}
                        >
                            ⚔️ INICIAR COMBATE (TESTE)
                        </button>

                        <hr style={{ margin: '20px 0', borderColor: 'var(--color-border)' }}/>

                        <h3>Saídas:</h3>
                        <div>
                            {Object.keys(room.exits).map((direction) => (
                                <button
                                    key={direction}
                                    onClick={() => handleMove(direction)}
                                    style={{ 
                                        marginRight: '10px', 
                                        textTransform: 'capitalize', 
                                        padding: '8px 12px',
                                        background: 'var(--color-citadel-secondary)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
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
            <div style={{
                width: '40%',
                border: '1px solid var(--color-border)',
                padding: '15px',
                backgroundColor: 'var(--color-citadel-primary)',
                color: 'var(--color-citadel-text)',
                borderRadius: '4px',
            }}>
                <h3 style={{ color: 'var(--color-renegade-cyan)' }}>{user?.character?.name} (Nível {user?.character?.level})</h3>
                <p>Status: {user?.character?.status === 'AWAKENED' ? 'Despertado' : 'Bloqueado'}</p>
                
                {/* EXIBIR STATS QUE MUDAM COM EQUIPAMENTO */}
                <p>HP: <span style={{color: 'var(--color-hp)'}}>{user?.character?.hp}</span> / {user?.character?.maxHp}</p>
                <p>Eco: <span style={{color: 'var(--color-eco)'}}>{currentEco}</span> / {maxEco}</p>
                <p>Força: {user?.character?.strength}</p>
                <p>Destreza: {user?.character?.dexterity}</p>
                <p>Inteligência: {user?.character?.intelligence}</p>
                <p>Constituição: {user?.character?.constitution}</p>
                
                <p>Ouro: {user?.character?.gold}</p>
                <p>XP: {user?.character?.xp?.toString() ?? '0'}</p>
                <p>Estado da Ligação: {isConnected ? 
                    <span style={{ color: 'var(--color-success)' }}> Ligado</span> : 
                    <span style={{ color: 'var(--color-danger)' }}> Desligado</span>}
                </p>
                
                {/* BOTÕES DE AÇÃO DA SIDEBAR */}
                <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Botão Inventário */}
                    <button 
                        onClick={handleRequestInventory} 
                        style={{ 
                            background: 'var(--color-info)', 
                            color: 'white',
                            border: 'none', 
                            padding: '8px 10px', 
                            cursor: 'pointer',
                            borderRadius: '4px',
                        }}
                    >
                        🎒 Inventário
                    </button>
                    {showInventory && (
                        <button 
                            onClick={() => setShowInventory(false)} 
                            style={{ 
                                background: 'var(--color-citadel-secondary)', 
                                color: 'white',
                                border: 'none',
                                padding: '8px 10px',
                                cursor: 'pointer',
                                borderRadius: '4px',
                            }}
                        >
                            Fechar Inv.
                        </button>
                    )}

                    {/* Botão Keywords/Eco */}
                    <button 
                        onClick={handleRequestKeywords} 
                        style={{ 
                            background: 'var(--color-renegade-purple)', 
                            color: 'white', 
                            border: 'none', 
                            padding: '8px 10px', 
                            cursor: 'pointer',
                            borderRadius: '4px',
                        }}
                    >
                        ✨ Eco/Keywords
                    </button>
                    {showKeywords && (
                        <button 
                            onClick={() => setShowKeywords(false)} 
                            style={{ 
                                background: 'var(--color-citadel-secondary)', 
                                color: 'white',
                                border: 'none',
                                padding: '8px 10px',
                                cursor: 'pointer',
                                borderRadius: '4px',
                            }}
                        >
                            Fechar Eco
                        </button>
                    )}

                    {/* Botão para Skills */}
                    <button
                        onClick={() => {
                            handleRequestAvailableSkills();
                            handleRequestLearnedSkills();
                            setShowSkillsManager(true);
                        }}
                        style={{
                            background: 'var(--color-info)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 10px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                        }}
                    >
                        📚 Skills
                    </button>
                    {showSkillsManager && (
                        <button
                            onClick={() => setShowSkillsManager(false)}
                            style={{
                                background: 'var(--color-citadel-secondary)',
                                color: 'white',
                                border: 'none',
                                padding: '8px 10px',
                                cursor: 'pointer',
                                borderRadius: '4px',
                            }}
                        >
                            Fechar Skills
                        </button>
                    )}
                </div>

                {/* RENDERIZAÇÃO CONDICIONAL DO INVENTÁRIO */}
                {showInventory && (
                    <div style={{ marginTop: '15px' }}>
                        <InventoryDisplay slots={inventorySlots} />
                    </div>
                )}

                {/* RENDERIZAÇÃO CONDICIONAL DAS KEYWORDS */}
                {showKeywords && (
                    <div style={{ marginTop: '15px' }}>
                        <KeywordsDisplay keywords={keywords} />
                    </div>
                )}

                {/* RENDERIZAÇÃO CONDICIONAL PARA SKILLS */}
                {showSkillsManager && (
                    <div style={{ marginTop: '15px', border: '1px solid var(--color-info)', padding: '10px', borderRadius: '4px' }}>
                        <h4 style={{color: 'var(--color-info)'}}>Gerenciador de Skills</h4>
                        <AvailableSkillsDisplay
                            skills={availableSkills}
                            onLearnSkill={handleLearnSkill}
                        />
                        <hr style={{ margin: '15px 0', borderColor: 'var(--color-border)' }}/>
                        <LearnedSkillsDisplay skills={learnedSkills} />
                    </div>
                )}

                <button 
                    onClick={logout} 
                    style={{ 
                        marginTop: '10px',
                        background: 'var(--color-citadel-secondary)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                    }}
                >
                    Sair
                </button>
                <hr style={{ margin: '20px 0', borderColor: 'var(--color-border)' }}/>
                <GameChat />
            </div>
        </div>
    );
}