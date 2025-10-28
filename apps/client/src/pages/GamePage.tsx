import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { GameChat } from '../components/GameChat';
import { InventoryDisplay } from '../components/InventoryDisplay';
import { KeywordsDisplay } from '../components/KeywordsDisplay';
import { AvailableSkillsDisplay } from '../components/AvailableSkillsDisplay';
import { LearnedSkillsDisplay } from '../components/LearnedSkillsDisplay';
import { EffectsDisplay } from '../components/EffectsDisplay';
import toast from 'react-hot-toast';
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
    const [uiTheme, setUiTheme] = useState<'citadel' | 'renegade'>('citadel');

    // Refs
    const userRef = useRef(user);
    const updateProfileRef = useRef(updateProfile);

    // Atualiza Refs
    useEffect(() => { userRef.current = user; }, [user]);
    useEffect(() => { updateProfileRef.current = updateProfile; }, [updateProfile]);

    // Muda o tema quando entrar em combate ou usar habilidades do Eco
    useEffect(() => {
        if (combatData?.isActive) {
            setUiTheme('renegade');
        } else {
            setUiTheme('citadel');
        }
    }, [combatData]);

    // --- EFEITOS E LISTENERS ---
    useEffect(() => {
        if (!socket) return;

        const handleUpdateRoom = (data: RoomData) => {
            setRoom(data);
            setCombatData(null);
        };

        const handleNpcDialogue = (payload: { npcName: string; dialogue: string }) => {
            toast(`${payload.npcName}:\n${payload.dialogue}`, { 
                duration: 6000,
                icon: '💬'
            });
        };

        const handleServerMessage = (message: string) => {
            toast(message, { icon: 'ℹ️' });
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
                monsterEffects: [],
                playerEffects: []
            });
            toast.error(`Batalha iniciada contra ${payload.monsterName}!`, { icon: '⚔️' });
        };

        const handleCombatUpdate = (payload: CombatUpdatePayload) => {
            setCombatData(payload);
            updateProfileRef.current({
                character: {
                    hp: payload.playerHp,
                    maxHp: payload.playerMaxHp,
                    eco: payload.playerEco,
                    maxEco: payload.playerMaxEco,
                } as any,
            });
        };

        const handleCombatEnd = (result: 'win' | 'loss' | 'flee') => {
            if (result === 'win') {
                toast.success('VITÓRIA!', { icon: '🏆' });
            } else if (result === 'loss') {
                toast.error('Derrota...', { icon: '💀' });
            } else {
                toast('Fugiu da batalha.', { icon: '💨' });
            }
            setCombatData(null);
        };

        const handlePlayerUpdated = (payload: {
            newTotalXp: string;
            goldGained: number;
            newLevel?: number;
        }) => {
            try {
                const currentUser = userRef.current;
                const currentXpBigInt = currentUser?.character?.xp ?? BigInt(0);
                const newTotalXpBigInt = BigInt(payload.newTotalXp);

                let xpGained: bigint;
                if (typeof currentXpBigInt === 'bigint' && typeof newTotalXpBigInt === 'bigint') {
                    xpGained = newTotalXpBigInt - currentXpBigInt;
                } else {
                    xpGained = BigInt(0);
                }

                const levelMsg = payload.newLevel ? ` e subiu para o Nível ${payload.newLevel}!` : '.';
                const alertMsg = `🎉 Ganhou ${xpGained.toString()} XP e ${payload.goldGained} Ouro${levelMsg}`;
                
                toast.success(alertMsg, { duration: 5000 });

                const newGoldTotal = (currentUser?.character?.gold ?? 0) + payload.goldGained;

                let newHp = currentUser?.character?.hp ?? 0;
                let newMaxHp = currentUser?.character?.maxHp ?? 100;
                let newEco = currentUser?.character?.eco ?? 50;
                let newMaxEco = currentUser?.character?.maxEco ?? 50;

                if (payload.newLevel && payload.newLevel > (currentUser?.character?.level ?? 0)) {
                    newMaxHp += 50;
                    newMaxEco += 20;
                    newHp = newMaxHp;
                    newEco = newMaxEco;
                }

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

            } catch (error) {
                console.error('Erro em handlePlayerUpdated:', error);
            }
        };

        const handleLootReceived = (payload: { drops: LootDropPayload[] }) => {
            if (payload.drops.length > 0) {
                const lootMessage = payload.drops.map(d => `${d.quantity}x ${d.itemName}`).join(', ');
                toast(`💰 Loot: ${lootMessage}`, { 
                    icon: '🪙', 
                    duration: 5000 
                });
            }
        };

        const handleUpdateInventory = (payload: { slots: InventorySlotData[] }) => {
            setInventorySlots(payload.slots);
            setShowInventory(true);
        };

        const handlePlayerStatsUpdated = (payload: CharacterTotalStats) => {
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
        };

        const handleUpdateKeywords = (payload: { keywords: KeywordData[] }) => {
            setKeywords(payload.keywords);
            setShowKeywords(true);
        };

        const handleUpdateAvailableSkills = (payload: { skills: AvailableSkillData[] }) => {
            setAvailableSkills(payload.skills);
        };

        const handleUpdateLearnedSkills = (payload: { skills: LearnedSkillData[] }) => {
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
            socket.emit('requestInventory');
        }
    }, [socket]);

    const handleRequestKeywords = useCallback(() => {
        if (socket) {
            socket.emit('requestKeywords');
        }
    }, [socket]);

    const handleRequestAvailableSkills = useCallback(() => {
        if (socket) {
            socket.emit('requestAvailableSkills');
        }
    }, [socket]);

    const handleRequestLearnedSkills = useCallback(() => {
        if (socket) {
            socket.emit('requestLearnedSkills');
        }
    }, [socket]);

    const handleLearnSkill = useCallback((skillId: string) => {
        if (socket) {
            socket.emit('learnSkill', { skillId: skillId });
        }
    }, [socket]);

    const handleUseSkill = useCallback((skillId: string) => {
        const currentCombatData = combatData;
        const currentUser = userRef.current;

        if (socket && currentCombatData?.isPlayerTurn) {
            const skill = learnedSkills.find(s => s.id === skillId);
            if (!skill) {
                toast.error('Erro: Skill não encontrada.');
                return;
            }
            
            const currentEco = currentUser?.character?.eco ?? 0;
            if (currentEco < skill.ecoCost) {
                toast.error(`Eco insuficiente para usar ${skill.name} (Custo: ${skill.ecoCost}, Atual: ${currentEco})`);
                return;
            }

            socket.emit('combatUseSkill', { skillId: skillId });
        } else if (!currentCombatData?.isPlayerTurn) {
            toast.error('Aguarde o seu turno!');
        }
    }, [socket, combatData, learnedSkills]);

    if (!room) {
        return (
            <div className="digital-distortion" style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                fontFamily: 'var(--font-display)',
                color: 'var(--color-renegade-cyan)',
                textShadow: '0 0 10px var(--color-renegade-glow)'
            }}>
                <div className="glitch-text" data-text="CARREGANDO...">
                    CARREGANDO INFORMAÇÕES DA SALA...
                </div>
            </div>
        );
    }

    const currentEco = user?.character?.eco ?? 0;
    const maxEco = user?.character?.maxEco ?? 50;

    return (
        <div className={`game-container digital-noise ${uiTheme === 'renegade' ? 'theme-renegade' : 'theme-citadel'}`} style={{
            display: 'flex',
            flexDirection: 'row',
            height: '100vh',
            overflow: 'hidden',
            fontFamily: 'var(--font-main)',
            background: 'linear-gradient(135deg, var(--color-background) 0%, #050505 100%)',
        }}>

            {/* Coluna da Esquerda (Mundo e Ações) */}
            <div className="data-overlay" style={{
                flex: '3',
                border: '1px solid var(--color-border)',
                padding: '15px',
                backgroundColor: 'var(--color-citadel-primary)',
                color: 'var(--color-citadel-text)',
                borderRadius: '4px',
                margin: '10px',
                boxShadow: uiTheme === 'renegade' ? '0 0 20px var(--color-renegade-magenta)' : '0 0 20px var(--color-citadel-glow)',
                transition: 'all 0.3s ease',
                overflow: 'auto',
                minWidth: '0',
            }}>

                {combatData?.isActive ? (
                    // --- MODO COMBATE ---
                    <div style={{ textAlign: 'center' }}>
                        <h2 className="glitch-text" data-text={`LUTANDO CONTRA: ${combatData.monsterName}`} style={{ 
                            color: 'var(--color-danger)',
                            fontFamily: 'var(--font-display)',
                            textShadow: '0 0 10px var(--color-danger)',
                            fontSize: 'clamp(1.2rem, 3vw, 1.8rem)'
                        }}>
                            Lutando contra: {combatData.monsterName}
                        </h2>

                        <div style={{ margin: '20px 0' }}>
                            <p>HP Monstro: 
                                <span style={{
                                    color: 'var(--color-warning)',
                                    textShadow: '0 0 5px var(--color-warning)',
                                    fontWeight: 'bold'
                                }}> {combatData.monsterHp}</span> / {combatData.monsterMaxHp}
                            </p>
                            
                            {/* Efeitos do Monstro */}
                            <EffectsDisplay 
                                effects={combatData.monsterEffects} 
                                targetName={combatData.monsterName} 
                            />
                        </div>

                        {/* Barras de Status */}
                        <div style={{ margin: '15px 0' }}>
                            <div style={{ marginBottom: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8em', marginBottom: '2px' }}>
                                    <span>Monstro HP:</span>
                                    <span>{combatData.monsterHp}/{combatData.monsterMaxHp}</span>
                                </div>
                                <div className="status-bar" style={{ height: '12px' }}>
                                    <div 
                                        className="health-bar"
                                        style={{ 
                                            width: `${(combatData.monsterHp / combatData.monsterMaxHp) * 100}%`,
                                            height: '100%'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8em', marginBottom: '2px' }}>
                                    <span>Seu HP:</span>
                                    <span>{combatData.playerHp}/{combatData.playerMaxHp}</span>
                                </div>
                                <div className="status-bar" style={{ height: '12px' }}>
                                    <div 
                                        className="health-bar"
                                        style={{ 
                                            width: `${(combatData.playerHp / combatData.playerMaxHp) * 100}%`,
                                            height: '100%'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8em', marginBottom: '2px' }}>
                                    <span>Seu Eco:</span>
                                    <span>{currentEco}/{maxEco}</span>
                                </div>
                                <div className="status-bar" style={{ height: '12px' }}>
                                    <div 
                                        className="eco-bar"
                                        style={{ 
                                            width: `${(currentEco / maxEco) * 100}%`,
                                            height: '100%'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Efeitos do Jogador */}
                        <div style={{ 
                            margin: '15px 0', 
                            borderTop: '1px dashed var(--color-border)', 
                            paddingTop: '15px' 
                        }}>
                            <p style={{ fontWeight: 'bold' }}>
                                Seu HP: 
                                <span style={{
                                    color: 'var(--color-hp)',
                                    textShadow: '0 0 5px var(--color-hp)'
                                }}> {combatData.playerHp}</span> / {combatData.playerMaxHp}
                            </p>
                            <p style={{ 
                                fontWeight: 'bold', 
                                color: 'var(--color-eco)',
                                textShadow: '0 0 5px var(--color-renegade-cyan)'
                            }}>
                                Seu Eco: {currentEco} / {maxEco}
                            </p>
                            
                            {/* Efeitos do Jogador */}
                            <EffectsDisplay 
                                effects={combatData.playerEffects} 
                                targetName="Você" 
                            />
                        </div>

                        <div style={{
                            height: '120px',
                            overflowY: 'auto',
                            border: '1px solid var(--color-border)',
                            margin: '10px 0',
                            textAlign: 'left',
                            padding: '8px',
                            fontSize: '0.8em',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            fontFamily: 'var(--font-main)',
                            borderRadius: '4px',
                        }}>
                            {combatData.log.map((line: string, i: number) => (
                                <div key={i} style={{ 
                                    marginBottom: '3px',
                                    color: line.includes('você') ? 'var(--color-renegade-cyan)' : 
                                           line.includes('monstro') ? 'var(--color-warning)' : 'var(--color-text)',
                                    lineHeight: '1.2'
                                }}>
                                    {line}
                                </div>
                            ))}
                        </div>

                        <p style={{ marginTop: '10px', fontFamily: 'var(--font-display)', fontSize: '0.9em' }}>
                            Turno: {combatData.isPlayerTurn ?
                                <span style={{
                                    color: 'var(--color-renegade-cyan)',
                                    textShadow: '0 0 8px var(--color-renegade-cyan)',
                                    animation: 'glitch-pulse 1s infinite'
                                }}>SEU TURNO</span> :
                                <span style={{
                                    color: 'var(--color-warning)',
                                    textShadow: '0 0 8px var(--color-warning)'
                                }}>Monstro</span>
                            }
                        </p>

                        {/* Botões de Combate */}
                        <div style={{ 
                            marginTop: '15px', 
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                            gap: '8px'
                        }}>
                            <button 
                                onClick={handleAttack} 
                                disabled={!combatData.isPlayerTurn}
                                className={combatData.isPlayerTurn ? 'renegade' : ''}
                                style={{ 
                                    padding: '8px 12px', 
                                    border: 'none', 
                                    cursor: combatData.isPlayerTurn ? 'pointer' : 'not-allowed',
                                    borderRadius: '4px',
                                    fontFamily: 'var(--font-main)',
                                    fontSize: '0.8em',
                                }}
                            >
                                ⚡ Ataque Básico
                            </button>

                            {learnedSkills.map((skill) => {
                                const hasEnoughEco = currentEco >= skill.ecoCost;
                                const canUse = combatData.isPlayerTurn && hasEnoughEco;
                                return (
                                    <button
                                        key={skill.id}
                                        onClick={() => handleUseSkill(skill.id)}
                                        disabled={!canUse}
                                        className={canUse ? 'renegade' : ''}
                                        title={`${skill.name} - Custo: ${skill.ecoCost} Eco\n${skill.description}`}
                                        style={{
                                            padding: '8px 10px',
                                            border: 'none',
                                            cursor: canUse ? 'pointer' : 'not-allowed',
                                            opacity: canUse ? 1 : 0.6,
                                            borderRadius: '4px',
                                            fontFamily: 'var(--font-main)',
                                            fontSize: '0.8em',
                                            background: canUse ? 
                                                'linear-gradient(135deg, var(--color-renegade-purple) 0%, var(--color-renegade-magenta) 100%)' :
                                                'var(--color-citadel-secondary)',
                                        }}
                                    >
                                        {skill.name} ({skill.ecoCost}⚡)
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    // --- MODO EXPLORAÇÃO ---
                    <>
                        <h2 style={{ 
                            color: 'var(--color-citadel-text)',
                            fontFamily: 'var(--font-display)',
                            textShadow: '0 0 5px var(--color-citadel-glow)',
                            fontSize: 'clamp(1.2rem, 3vw, 1.8rem)',
                            marginBottom: '15px'
                        }}>{room.name}</h2>
                        <p style={{ lineHeight: '1.5', marginBottom: '20px' }}>{room.description}</p>

                        {/* NPCs e Jogadores */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                            {room.npcs && room.npcs.length > 0 && (
                                <div>
                                    <h4 style={{ color: 'var(--color-info)', fontSize: '0.9em' }}>NPCs Presentes:</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        {room.npcs.map((npc: { id: string; name: string }) => (
                                            <button 
                                                key={npc.id}
                                                onClick={() => handleInteractNpc(npc.id)}
                                                className="citadel"
                                                style={{
                                                    padding: '6px 10px',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontFamily: 'var(--font-main)',
                                                    fontSize: '0.8em',
                                                    textAlign: 'left'
                                                }}
                                            >
                                                💬 {npc.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {room.players && room.players.length > 0 && (
                                <div>
                                    <h4 style={{ color: 'var(--color-success)', fontSize: '0.9em' }}>Outros Jogadores:</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        {room.players.map((player: { id: string; name: string }) => (
                                            <div key={player.id} style={{ 
                                                padding: '6px 10px',
                                                backgroundColor: 'rgba(255,255,255,0.1)',
                                                borderRadius: '4px',
                                                fontSize: '0.8em'
                                            }}>
                                                👤 {player.name}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <hr style={{ 
                            margin: '15px 0', 
                            borderColor: 'var(--color-border)',
                            borderStyle: 'dashed'
                        }}/>

                        {/* Ações de Teste */}
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ color: 'var(--color-warning)', fontSize: '1em', marginBottom: '10px' }}>Ações de Teste</h3>
                            <button 
                                onClick={handleStartCombat} 
                                className="renegade"
                                style={{ 
                                    padding: '8px 12px', 
                                    border: 'none', 
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                    fontFamily: 'var(--font-main)',
                                    fontSize: '0.8em',
                                }}
                            >
                                ⚔️ INICIAR COMBATE (TESTE)
                            </button>
                        </div>

                        <hr style={{ 
                            margin: '15px 0', 
                            borderColor: 'var(--color-border)',
                            borderStyle: 'dashed'
                        }}/>

                        {/* Saídas */}
                        <div>
                            <h3 style={{ color: 'var(--color-info)', fontSize: '1em', marginBottom: '10px' }}>Saídas:</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
                                {Object.keys(room.exits).map((direction) => (
                                    <button
                                        key={direction}
                                        onClick={() => handleMove(direction)}
                                        className="citadel"
                                        style={{ 
                                            textTransform: 'capitalize', 
                                            padding: '8px 10px',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontFamily: 'var(--font-main)',
                                            fontSize: '0.8em',
                                        }}
                                    >
                                        🚪 {direction}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Coluna da Direita (Info do Jogador) */}
            <div style={{
                flex: '2',
                minWidth: '300px',
                maxWidth: '400px',
                border: '1px solid var(--color-border)',
                padding: '15px',
                backgroundColor: 'var(--color-citadel-primary)',
                color: 'var(--color-citadel-text)',
                borderRadius: '4px',
                margin: '10px',
                boxShadow: '0 0 15px var(--color-citadel-glow)',
                overflow: 'auto',
            }}>
                {/* Cabeçalho do Jogador */}
                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                    <h3 style={{ 
                        color: 'var(--color-renegade-cyan)',
                        fontFamily: 'var(--font-display)',
                        textShadow: '0 0 8px var(--color-renegade-cyan)',
                        fontSize: '1.1em',
                        marginBottom: '5px'
                    }}>
                        {user?.character?.name}
                    </h3>
                    <div style={{ 
                        fontSize: '0.8em',
                        color: 'var(--color-warning)',
                        marginBottom: '10px'
                    }}>
                        Nível {user?.character?.level}
                    </div>
                </div>
                
                {/* Stats do Jogador */}
                <div style={{ 
                    backgroundColor: 'rgba(0,0,0,0.3)', 
                    padding: '12px', 
                    borderRadius: '4px',
                    marginBottom: '15px',
                    fontSize: '0.8em'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span>🏷️ Status:</span>
                        <span style={{
                            color: user?.character?.status === 'AWAKENED' ? 'var(--color-renegade-cyan)' : 'var(--color-warning)',
                            fontWeight: 'bold',
                            fontSize: '0.9em'
                        }}>
                            {user?.character?.status === 'AWAKENED' ? 'Despertado' : 'Bloqueado'}
                        </span>
                    </div>
                    
                    {/* HP */}
                    <div style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span>❤️ HP:</span>
                            <span>{user?.character?.hp} / {user?.character?.maxHp}</span>
                        </div>
                        <div className="status-bar" style={{ height: '8px' }}>
                            <div 
                                className="health-bar"
                                style={{ 
                                    width: `${((user?.character?.hp ?? 0) / (user?.character?.maxHp ?? 100)) * 100}%`
                                }}
                            />
                        </div>
                    </div>

                    {/* Eco */}
                    <div style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span>⚡ Eco:</span>
                            <span style={{ color: 'var(--color-eco)' }}>{currentEco} / {maxEco}</span>
                        </div>
                        <div className="status-bar" style={{ height: '8px' }}>
                            <div 
                                className="eco-bar"
                                style={{ 
                                    width: `${(currentEco / maxEco) * 100}%`
                                }}
                            />
                        </div>
                    </div>

                    {/* Stats em Grid */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gap: '5px',
                        marginTop: '10px'
                    }}>
                        <div>💪 Força: <strong>{user?.character?.strength}</strong></div>
                        <div>🎯 Destreza: <strong>{user?.character?.dexterity}</strong></div>
                        <div>🧠 Inteligência: <strong>{user?.character?.intelligence}</strong></div>
                        <div>🛡️ Constituição: <strong>{user?.character?.constitution}</strong></div>
                    </div>
                    
                    <div style={{ marginTop: '10px' }}>
                        <div>💰 Ouro: <strong style={{ color: 'var(--color-warning)' }}>{user?.character?.gold}</strong></div>
                        <div>⭐ XP: <strong style={{ color: 'var(--color-xp)' }}>{user?.character?.xp?.toString() ?? '0'}</strong></div>
                    </div>
                    
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--color-border)' }}>
                        📡 Conexão: {isConnected ? 
                            <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}> Ativa</span> : 
                            <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}> Inativa</span>}
                    </div>
                </div>
                
                {/* Botões de Ação */}
                <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    marginBottom: '10px'
                }}>
                    <button 
                        onClick={handleRequestInventory} 
                        className="citadel"
                        style={{ 
                            border: 'none', 
                            padding: '8px', 
                            cursor: 'pointer',
                            borderRadius: '4px',
                            fontFamily: 'var(--font-main)',
                            fontSize: '0.8em',
                        }}
                    >
                        🎒 Inventário
                    </button>

                    <button 
                        onClick={handleRequestKeywords} 
                        className="renegade"
                        style={{ 
                            border: 'none', 
                            padding: '8px', 
                            cursor: 'pointer',
                            borderRadius: '4px',
                            fontFamily: 'var(--font-main)',
                            fontSize: '0.8em',
                        }}
                    >
                        ✨ Eco/Keywords
                    </button>

                    <button
                        onClick={() => {
                            handleRequestAvailableSkills();
                            handleRequestLearnedSkills();
                            setShowSkillsManager(true);
                        }}
                        className="citadel"
                        style={{
                            border: 'none',
                            padding: '8px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            fontFamily: 'var(--font-main)',
                            fontSize: '0.8em',
                        }}
                    >
                        📚 Skills
                    </button>

                    <button 
                        onClick={logout} 
                        className="citadel"
                        style={{ 
                            border: 'none',
                            padding: '8px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            fontFamily: 'var(--font-main)',
                            fontSize: '0.8em',
                        }}
                    >
                        🚪 Sair
                    </button>
                </div>

                {/* Botões de Fechar */}
                {(showInventory || showKeywords || showSkillsManager) && (
                    <div style={{ 
                        display: 'flex', 
                        gap: '8px', 
                        marginBottom: '10px',
                        flexWrap: 'wrap'
                    }}>
                        {showInventory && (
                            <button 
                                onClick={() => setShowInventory(false)} 
                                className="citadel"
                                style={{ 
                                    border: 'none',
                                    padding: '6px 10px',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                    fontFamily: 'var(--font-main)',
                                    fontSize: '0.7em',
                                    flex: '1'
                                }}
                            >
                                ❌ Fechar Inventário
                            </button>
                        )}
                        {showKeywords && (
                            <button 
                                onClick={() => setShowKeywords(false)} 
                                className="citadel"
                                style={{ 
                                    border: 'none',
                                    padding: '6px 10px',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                    fontFamily: 'var(--font-main)',
                                    fontSize: '0.7em',
                                    flex: '1'
                                }}
                            >
                                ❌ Fechar Eco
                            </button>
                        )}
                        {showSkillsManager && (
                            <button
                                onClick={() => setShowSkillsManager(false)}
                                className="citadel"
                                style={{
                                    border: 'none',
                                    padding: '6px 10px',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                    fontFamily: 'var(--font-main)',
                                    fontSize: '0.7em',
                                    flex: '1'
                                }}
                            >
                                ❌ Fechar Skills
                            </button>
                        )}
                    </div>
                )}

                {/* Componentes Condicionais */}
                {showInventory && (
                    <div style={{ marginTop: '10px' }}>
                        <InventoryDisplay slots={inventorySlots} />
                    </div>
                )}

                {showKeywords && (
                    <div style={{ marginTop: '10px' }}>
                        <KeywordsDisplay keywords={keywords} />
                    </div>
                )}

                {showSkillsManager && (
                    <div style={{ 
                        marginTop: '10px', 
                        border: '1px solid var(--color-info)', 
                        padding: '8px', 
                        borderRadius: '4px',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        fontSize: '0.8em'
                    }}>
                        <h4 style={{
                            color: 'var(--color-info)',
                            fontFamily: 'var(--font-display)',
                            textAlign: 'center',
                            fontSize: '0.9em',
                            marginBottom: '8px'
                        }}>Gerenciador de Skills</h4>
                        <AvailableSkillsDisplay
                            skills={availableSkills}
                            onLearnSkill={handleLearnSkill}
                        />
                        <hr style={{ 
                            margin: '10px 0', 
                            borderColor: 'var(--color-border)',
                            borderStyle: 'dashed'
                        }}/>
                        <LearnedSkillsDisplay skills={learnedSkills} />
                    </div>
                )}

                {/* Chat */}
                <div style={{ marginTop: '15px' }}>
                    <GameChat />
                </div>
            </div>
        </div>
    );
}