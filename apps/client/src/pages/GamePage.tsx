import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { GameChat } from '../components/GameChat';
import { InventoryDisplay } from '../components/InventoryDisplay';
import { KeywordsDisplay } from '../components/KeywordsDisplay';
import { AvailableSkillsDisplay } from '../components/AvailableSkillsDisplay';
import { LearnedSkillsDisplay } from '../components/LearnedSkillsDisplay';
import { EffectsDisplay } from '../components/EffectsDisplay';
import { CharacterStatsDisplay } from '../components/CharacterStatsDisplay';
import { PrologueDisplay } from '../components/PrologueDisplay';
import toast from 'react-hot-toast';
import type {
    CombatUpdatePayload,
    LootDropPayload,
    InventorySlotData,
    CharacterTotalStats,
    KeywordData,
    AvailableSkillData,
    LearnedSkillData,
    PrologueUpdatePayload
} from '../../../server/src/game/types/socket-with-auth.type';

// Tipos necessários (definidos localmente)
interface RoomData {
    name: string;
    description: string;
    exits: Record<string, string>;
    players: { id: string; name: string }[];
    npcs: { id: string; name: string }[];
}

interface BaseStatsPayload {
  strength: number;
  dexterity: number;
  intelligence: number;
  constitution: number;
  attributePoints: number;
}

interface CombatStartedPayload {
    monsterName: string;
    monsterHp: number;
    message: string;
}

// Estilos atualizados para o header refinado
const styles: Record<string, React.CSSProperties> = {
  containerStyle: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    fontFamily: 'var(--font-main)',
    background: 'linear-gradient(135deg, var(--color-background) 0%, #050505 100%)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 15px',
    backgroundColor: 'var(--color-renegade-bg-transparent)',
    borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-renegade-text)',
    fontFamily: 'var(--font-main)',
    position: 'sticky',
    top: 0,
    zIndex: 90,
    boxShadow: '0 2px 10px var(--color-renegade-glow)',
    gap: '20px',
  },
  headerSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flexBasis: '30%',
  },
  characterName: {
    margin: 0,
    fontFamily: 'var(--font-display)',
    color: 'var(--color-renegade-cyan)',
    fontSize: '1.3em',
    textShadow: '0 0 8px var(--color-renegade-glow)',
    whiteSpace: 'nowrap',
  },
  levelDisplay: {
    fontSize: '0.9em',
    fontWeight: 'bold',
    color: 'var(--color-warning)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: '2px 6px',
    borderRadius: '3px',
    border: '1px solid var(--color-warning)',
  },
  statusBarsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flexBasis: '40%',
    minWidth: '180px',
  },
  statusBarWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusBarLabel: {
    fontSize: '0.75em',
    fontWeight: 'bold',
    width: '30px',
    textAlign: 'right',
  },
  statusBarTrack: {
    flexGrow: 1,
    height: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    overflow: 'hidden',
    position: 'relative',
  },
  statusBarFill: {
    height: '100%',
    transition: 'width 0.5s ease-out',
    borderRadius: '4px',
  },
  statusBarValue: {
    fontSize: '0.75em',
    minWidth: '55px',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },
  resourceDisplay: {
    fontSize: '0.9em',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: '3px 8px',
    borderRadius: '3px',
    border: '1px solid var(--color-border)',
    whiteSpace: 'nowrap',
  },
  pointsIndicator: {
    color: 'var(--color-success)',
    marginLeft: '5px',
    fontWeight: 'bold',
    fontSize: '1em',
  },
  mainContentArea: {
    flexGrow: 1,
    position: 'relative',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  backgroundImagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#050a0f',
    zIndex: 0,
  },
  textContentContainer: {
    position: 'relative',
    zIndex: 1,
    padding: '20px',
    flexGrow: 1,
    backgroundColor: 'rgba(0, 5, 8, 0.4)',
  },
  roomTitle: {
    fontFamily: 'var(--font-display)',
    color: 'var(--color-renegade-cyan)',
    textShadow: '0 0 8px var(--color-renegade-glow)',
    marginBottom: '15px',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '10px',
    marginTop: 0,
  },
  roomDescription: {
    whiteSpace: 'pre-wrap',
    lineHeight: 1.6,
    color: 'var(--color-renegade-text)',
    fontSize: '1rem',
    marginBottom: '20px',
  },
  roomActions: {
    marginTop: '25px',
    paddingTop: '15px',
    borderTop: '1px dashed var(--color-border)',
    display: 'flex',
    gap: '10px',
  },
  actionButton: {
    padding: '8px 15px',
    fontFamily: 'var(--font-main)',
    cursor: 'pointer',
    border: '1px solid var(--color-border)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    color: 'var(--color-renegade-text)',
  },
  combatDisplay: {
    textAlign: 'center',
  },
  combatLog: {
    maxHeight: '40vh',
    overflowY: 'auto',
    border: '1px dashed var(--color-border)',
    padding: '10px',
    marginBottom: '15px',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  combatLogEntry: {
    margin: '0 0 5px 0',
    fontSize: '0.9rem',
    color: '#ccc',
    lineHeight: 1.4,
  },
};

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
    const [showStats, setShowStats] = useState(false);
    const [isTransitioningUI, setIsTransitioningUI] = useState(false);
    const [prologueData, setPrologueData] = useState<PrologueUpdatePayload | null>(null);

    // Refs
    const userRef = useRef(user);
    const updateProfileRef = useRef(updateProfile);

    // Atualiza Refs
    useEffect(() => { userRef.current = user; }, [user]);
    useEffect(() => { updateProfileRef.current = updateProfile; }, [updateProfile]);

    // Determinar se o jogador já despertou (baseado no status ou nível)
    const isAwakened = user?.character?.status === 'AWAKENED';
    const inPrologue = user?.character?.prologueState !== 'COMPLETED';

    // Muda o tema quando entrar em combate ou usar habilidades do Eco
    useEffect(() => {
        const previousTheme = uiTheme;

        if (combatData?.isActive) {
            setUiTheme('renegade');
        } else {
            // Aplica tema baseado no estado do personagem
            setUiTheme(isAwakened ? 'renegade' : 'citadel');
        }

        // Verifica se a mudança foi de Cidadela para Renegada (O DESPERTAR!)
        if (previousTheme === 'citadel' && (isAwakened || combatData?.isActive)) {
            setIsTransitioningUI(true);
            setTimeout(() => {
                setIsTransitioningUI(false);
            }, 1200);
        }
    }, [combatData, isAwakened, uiTheme]);

    // Verificar se há pontos de atributo não gastos
    const hasUnspentPoints = (user?.character?.attributePoints ?? 0) > 0;

    // --- EFEITOS E LISTENERS ---
    useEffect(() => {
        if (!socket) return;

        // Listener do Prólogo
        const handlePrologueUpdate = (payload: PrologueUpdatePayload) => {
            console.log('[Socket] Recebido prologueUpdate:', payload);
            setPrologueData(payload);
        };

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

                updateProfileRef.current({
                    character: {
                        xp: payload.newTotalXp,
                        gold: newGoldTotal,
                        level: payload.newLevel,
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

        // Listener para atualizar stats base (str, dex, pontos)
        const handleBaseStatsUpdated = (payload: BaseStatsPayload) => {
            console.log(
                '[Socket] Recebido playerBaseStatsUpdated:',
                payload,
            );
            updateProfileRef.current({
                character: {
                    strength: payload.strength,
                    dexterity: payload.dexterity,
                    intelligence: payload.intelligence,
                    constitution: payload.constitution,
                    attributePoints: payload.attributePoints,
                } as any,
            });
        };

        // Listener de Vitals (HP/ECO)
        const handlePlayerVitalsUpdated = (payload: {
            hp: number;
            maxHp: number;
            eco: number;
            maxEco: number;
        }) => {
            console.log('[Socket] Recebido playerVitalsUpdated:', payload);
            updateProfileRef.current({
                character: {
                    hp: payload.hp,
                    maxHp: payload.maxHp,
                    eco: payload.eco,
                    maxEco: payload.maxEco,
                } as any,
            });
        };

        // Liga os ouvintes
        socket.on('prologueUpdate', handlePrologueUpdate);
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
        socket.on('playerVitalsUpdated', handlePlayerVitalsUpdated);
        socket.on('playerBaseStatsUpdated', handleBaseStatsUpdated);

        // Pedir skills aprendidas ao conectar
        handleRequestLearnedSkills();

        // Função de limpeza
        return () => {
            socket.off('prologueUpdate', handlePrologueUpdate);
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
            socket.off('playerVitalsUpdated', handlePlayerVitalsUpdated);
            socket.off('playerBaseStatsUpdated', handleBaseStatsUpdated);
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

    const handleLook = useCallback(() => {
        if (socket) {
            socket.emit('playerLook');
        }
    }, [socket]);

    // Ações da Sala
    const roomActions = (
        <div style={styles.roomActions}>
            <button 
                style={styles.actionButton} 
                onClick={handleLook}
                className="citadel"
            >
                👁️ Olhar ao Redor
            </button>
        </div>
    );

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

    // Valores atuais para as barras de status
    const currentHp = user?.character?.hp ?? 0;
    const maxHp = user?.character?.maxHp ?? 100;
    const currentEco = user?.character?.eco ?? 0;
    const maxEco = user?.character?.maxEco ?? 50;

    return (
        <div 
            className={`
                game-container 
                digital-noise 
                ${uiTheme === 'renegade' ? 'theme-renegade' : 'theme-citadel'}
                ${isTransitioningUI ? 'ui-glitch-transition' : ''} 
            `} 
            style={styles.containerStyle}
        >

            {/* Header Refinado */}
            {user?.character && (
                <header style={styles.header}>
                    {/* Secção Esquerda: Nome e Nível */}
                    <div style={styles.headerSection}>
                        <h2 style={styles.characterName}>{user.character.name}</h2>
                        <span style={styles.levelDisplay}>
                            Nv. {user.character.level ?? 1}
                        </span>
                    </div>

                    {/* Secção Central: Barras de Status */}
                    <div style={styles.statusBarsContainer}>
                        {/* HP */}
                        <div style={styles.statusBarWrapper}>
                            <span style={{ ...styles.statusBarLabel, color: 'var(--color-hp)' }}>HP</span>
                            <div style={styles.statusBarTrack}>
                                <div
                                    className="hp-bar"
                                    style={{
                                        ...styles.statusBarFill,
                                        width: `${maxHp > 0 ? (currentHp / maxHp) * 100 : 0}%`,
                                        boxShadow: '0 0 8px var(--color-hp)',
                                    }}
                                />
                            </div>
                            <span style={styles.statusBarValue}>
                                {currentHp} / {maxHp}
                            </span>
                        </div>
                        {/* Eco */}
                        <div style={styles.statusBarWrapper}>
                            <span style={{ ...styles.statusBarLabel, color: 'var(--color-eco)' }}>ECO</span>
                            <div style={styles.statusBarTrack}>
                                <div
                                    className="eco-bar"
                                    style={{
                                        ...styles.statusBarFill,
                                        width: `${maxEco > 0 ? (currentEco / maxEco) * 100 : 0}%`,
                                        boxShadow: '0 0 8px var(--color-eco)',
                                    }}
                                />
                            </div>
                            <span style={styles.statusBarValue}>
                                {currentEco} / {maxEco}
                            </span>
                        </div>
                    </div>

                    {/* Secção Direita: Ouro e Pontos */}
                    <div style={{...styles.headerSection, justifyContent: 'flex-end'}}>
                        <span style={styles.resourceDisplay} title="Ouro">
                            💰<span style={{ marginLeft: '5px' }}>{user.character.gold ?? 0}</span>
                        </span>
                        <span style={styles.resourceDisplay} title="Pontos de Atributo Disponíveis">
                            ✨<span style={{ marginLeft: '5px' }}>{user.character.attributePoints ?? 0}</span>
                            {hasUnspentPoints && (
                                <span style={styles.pointsIndicator} className="pulse">
                                    [!]
                                </span>
                            )}
                        </span>
                    </div>
                </header>
            )}

            {/* --- Conteúdo Principal com Prólogo Integrado --- */}
            {inPrologue && prologueData ? (
                // 1. Se estamos NO PRÓLOGO, renderiza o Display do Prólogo
                <PrologueDisplay {...prologueData} />
            ) : (
                // 2. Se NÃO estamos no prólogo, renderiza o jogo normal
                <main style={styles.mainContentArea}>
                    <div style={styles.backgroundImagePlaceholder}>
                        <div className="scanlines" style={{ zIndex: 1, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}></div>
                    </div>
                    <div style={styles.textContentContainer}>
                        {!combatData?.isActive ? (
                            // --- MODO EXPLORAÇÃO ---
                            <>
                                <h3 style={styles.roomTitle}>{room?.name}</h3>
                                <p 
                                    style={styles.roomDescription}
                                    dangerouslySetInnerHTML={{ __html: room?.description || '' }}
                                />
                                
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

                                {roomActions}
                                
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
                        ) : (
                            // --- MODO COMBATE ---
                            <div style={styles.combatDisplay}>
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
                                                    width: `${maxEco > 0 ? (currentEco / maxEco) * 100 : 0}%`,
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

                                <div style={styles.combatLog}>
                                    {combatData.log.map((line: string, i: number) => (
                                        <div key={i} style={styles.combatLogEntry}>
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
                        )}
                    </div>
                </main>
            )}

            {/* Chat Persistente */}
            <GameChat />

            {/* --- NOVA BARRA DE AÇÕES --- */}
            <footer className="game-action-bar">
                <button 
                    className="action-bar-button citadel"
                    onClick={() => setShowStats(true)}
                >
                    👤 Personagem
                    {hasUnspentPoints && <span className="action-button-notify pulse">!</span>}
                </button>
                <button 
                    className="action-bar-button citadel"
                    onClick={handleRequestInventory}
                >
                    🎒 Inventário
                </button>
                <button 
                    className="action-bar-button renegade"
                    onClick={handleRequestKeywords}
                >
                    ✨ Ecos
                </button>
                <button 
                    className="action-bar-button citadel"
                    onClick={() => {
                        handleRequestAvailableSkills();
                        handleRequestLearnedSkills();
                        setShowSkillsManager(true);
                    }}
                >
                    📚 Skills
                </button>
                <button 
                    className="action-bar-button citadel"
                    style={{borderColor: 'var(--color-danger)', color: 'var(--color-danger)'}} 
                    onClick={logout}
                >
                    🚪 Sair
                </button>
            </footer>

            {/* Modais */}
            {showInventory && <InventoryDisplay slots={inventorySlots} onClose={() => setShowInventory(false)} />}
            {showStats && <CharacterStatsDisplay onClose={() => setShowStats(false)} />}
            {showKeywords && <KeywordsDisplay keywords={keywords} onClose={() => setShowKeywords(false)} />}
            {showSkillsManager && (
                <div 
                    className="theme-renegade data-overlay modal-enter-animation" 
                    style={{ 
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1000,
                        backgroundColor: 'var(--color-citadel-primary)',
                        border: '1px solid var(--color-border)',
                        padding: '25px',
                        borderRadius: '8px',
                        maxWidth: '90vw',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        boxShadow: '0 0 30px var(--color-renegade-glow)',
                        width: '90%',
                    }}
                >
                    <button 
                        onClick={() => setShowSkillsManager(false)} 
                        style={{ 
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            padding: '6px 10px',
                            fontSize: '0.8em',
                            cursor: 'pointer',
                            border: '1px solid var(--color-danger)',
                            color: 'var(--color-danger)',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            borderRadius: '4px',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        ❌ Fechar Skills
                    </button>
                    <h4 style={{
                        color: 'var(--color-renegade-cyan)',
                        fontFamily: 'var(--font-display)',
                        textShadow: '0 0 10px var(--color-renegade-cyan)',
                        textAlign: 'center',
                        marginBottom: '20px',
                        fontSize: '1.4em',
                        borderBottom: '2px solid var(--color-renegade-cyan)',
                        paddingBottom: '12px'
                    }}>
                        GERENCIADOR DE SKILLS
                    </h4>
                    <AvailableSkillsDisplay
                        skills={availableSkills}
                        onLearnSkill={handleLearnSkill}
                    />
                    <hr style={{ 
                        margin: '20px 0', 
                        borderColor: 'var(--color-border)',
                        borderStyle: 'dashed'
                    }}/>
                    <LearnedSkillsDisplay skills={learnedSkills} />
                </div>
            )}
        </div>
    );
}