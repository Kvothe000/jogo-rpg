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
import toast from 'react-hot-toast'; // CORRIGIDO: Removido 'Toaster'
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

// Tipos
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

// Estilos
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
        height: '60px',
    },
    headerSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        flexBasis: '30%',
        minWidth: 0,
    },
    characterName: {
        margin: 0,
        fontFamily: 'var(--font-display)',
        color: 'var(--color-renegade-cyan)',
        fontSize: '1.3em',
        textShadow: '0 0 8px var(--color-renegade-glow)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    levelDisplay: {
        fontSize: '0.9em',
        fontWeight: 'bold',
        color: 'var(--color-warning)',
        backgroundColor: 'rgba(0,0,0,0.4)',
        padding: '2px 6px',
        borderRadius: '3px',
        border: '1px solid var(--color-warning)',
        whiteSpace: 'nowrap',
        cursor: 'help',
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
        cursor: 'help',
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
        color: 'var(--color-renegade-text-muted, #aaa)',
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
        color: 'var(--color-renegade-text)',
        transition: 'background-color 0.2s, border-color 0.2s',
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
        paddingBottom: '80px', // Espaço para o footer
    },
    backgroundImagePlaceholder: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#050a0f',
        zIndex: 0,
        opacity: 0.7,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    },
    textContentContainer: {
        position: 'relative',
        zIndex: 1,
        padding: '25px',
        flexGrow: 1,
        overflowY: 'auto',
        backgroundColor: 'rgba(0, 5, 8, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
    },
    roomTitle: {
        fontFamily: 'var(--font-display)',
        color: 'var(--color-renegade-cyan)',
        textShadow: '0 0 8px var(--color-renegade-glow)',
        marginBottom: '15px',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: '10px',
        marginTop: 0,
        fontSize: '1.5em',
    },
    roomDescription: {
        whiteSpace: 'pre-wrap',
        lineHeight: 1.7,
        color: 'var(--color-renegade-text)',
        fontSize: '1rem',
        marginBottom: '20px',
    },
    roomInfoGrid: {
         display: 'grid', 
         gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
         gap: '20px', 
         marginBottom: '20px' 
    },
    roomInfoSection: {
         fontSize: '0.9em',
    },
    roomInfoTitle: {
         color: 'var(--color-info)', 
         fontSize: '1em',
         marginBottom: '10px',
         borderBottom: '1px dashed var(--color-border)',
         paddingBottom: '5px',
         fontFamily: 'var(--font-display)',
    },
    roomInfoList: {
         display: 'flex', 
         flexDirection: 'column', 
         gap: '5px' 
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
        backgroundColor: 'rgba(0,0,0,0.4)',
        color: 'var(--color-renegade-text)',
        borderRadius: '3px',
        transition: 'background-color 0.2s, border-color 0.2s',
        fontSize: '0.9em',
    },
    combatDisplay: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        textAlign: 'center',
    },
    combatTitle: {
        fontFamily: 'var(--font-display)',
        color: 'var(--color-danger)',
        textShadow: '0 0 8px var(--color-danger)',
        textAlign: 'center',
        marginTop: 0,
        marginBottom: '15px',
        fontSize: '1.4em',
    },
    combatStatusBars: {
         marginBottom: '15px',
         display: 'flex',
         flexDirection: 'column',
         gap: '8px',
    },
    combatLog: {
        flexGrow: 1,
        overflowY: 'auto',
        border: '1px dashed var(--color-border)',
        padding: '15px',
        marginBottom: '15px',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: '4px',
        minHeight: '200px',
    },
    combatLogEntry: {
        margin: '0 0 8px 0',
        fontSize: '0.9rem',
        color: 'var(--color-renegade-text)',
        lineHeight: 1.5,
    },
    combatActions: {
         display: 'grid',
         gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
         gap: '10px',
         marginTop: 'auto',
         paddingTop: '15px',
         borderTop: '1px solid var(--color-border)',
    },
    // Estilo para a Tela de Carregamento
    loadingContainer: { 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%', // Ocupa todo o textContentContainer
        fontFamily: 'var(--font-display)', 
        color: 'var(--color-renegade-cyan)',
        textShadow: '0 0 10px var(--color-renegade-glow)'
    }
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

    const userRef = useRef(user);
    const updateProfileRef = useRef(updateProfile);

    useEffect(() => { userRef.current = user; }, [user]);
    useEffect(() => { updateProfileRef.current = updateProfile; }, [updateProfile]);

    const isAwakened = user?.character?.status === 'AWAKENED';
    const inPrologue = user?.character?.prologueState !== 'COMPLETED';

    useEffect(() => {
        const newTheme = (combatData?.isActive || isAwakened) ? 'renegade' : 'citadel';
        setUiTheme(prevTheme => {
            if (prevTheme === 'citadel' && newTheme === 'renegade') {
                setIsTransitioningUI(true); 
                setTimeout(() => setIsTransitioningUI(false), 1200); 
            }
            return newTheme;
        });
    }, [combatData, isAwakened]);

    const hasUnspentPoints = (user?.character?.attributePoints ?? 0) > 0;

    useEffect(() => {
        if (!socket) return;

        // --- LISTENERS DO PRÓLOGO ---
        const handlePrologueUpdate = (payload: PrologueUpdatePayload) => {
          console.log('[Socket] Recebido prologueUpdate:', payload);
          setPrologueData(payload);
        };
        socket.on('prologueUpdate', handlePrologueUpdate);
        // --- FIM LISTENERS PRÓLOGO ---

        const handleUpdateRoom = (data: RoomData) => {
            setRoom(data);
            setCombatData(null); 
        };
        const handleNpcDialogue = (payload: { npcName: string; dialogue: string }) => toast(`${payload.npcName}:\n${payload.dialogue}`, { duration: 6000, icon: '💬' });
        const handleServerMessage = (message: string) => toast(message, { icon: 'ℹ️' });

        const handleCombatStarted = (payload: CombatStartedPayload) => {
            const currentUser = userRef.current;
            setCombatData({
                isActive: true,
                monsterName: payload.monsterName,
                playerHp: currentUser?.character?.hp ?? 100,
                playerMaxHp: currentUser?.character?.maxHp ?? 100,
                playerEco: currentUser?.character?.eco ?? 50,
                playerMaxEco: currentUser?.character?.maxEco ?? 50,
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
            if (result === 'win') toast.success('VITÓRIA!', { icon: '🏆' });
            else if (result === 'loss') toast.error('Derrota...', { icon: '💀' });
            else toast('Fugiu da batalha.', { icon: '💨' });
            setCombatData(null);
            socket.emit('playerLook');
        };

        // **** LÓGICA DE LEVEL UP CORRIGIDA ****
        const handlePlayerUpdated = (payload: {
            newTotalXp: string;
            goldGained: number;
            newLevel?: number;
        }) => {
            try {
                const currentUser = userRef.current;
                const currentXpBigInt = currentUser?.character?.xp ?? BigInt(0);
                const newTotalXpBigInt = BigInt(payload.newTotalXp);
                const xpGained = newTotalXpBigInt - currentXpBigInt;
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
                toast(`💰 Loot: ${lootMessage}`, { icon: '🪙', duration: 5000 });
            }
        };

        const handleUpdateInventory = (payload: { slots: InventorySlotData[] }) => {
            setInventorySlots(payload.slots);
            toast.success('Inventário atualizado!', { icon: '🎒' });
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

        const handleUpdateAvailableSkills = (payload: { skills: AvailableSkillData[] }) => setAvailableSkills(payload.skills);
        const handleUpdateLearnedSkills = (payload: { skills: LearnedSkillData[] }) => setLearnedSkills(payload.skills);
        
        const handleBaseStatsUpdated = (payload: BaseStatsPayload) => {
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

        const handlePlayerVitalsUpdated = (payload: { hp: number; maxHp: number; eco: number; maxEco: number; }) => {
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
    
        handleRequestLearnedSkills();
    
        // Limpeza
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
            if (socket) socket.emit('playerMove', direction);
        }, [socket]);
    
        const handleInteractNpc = useCallback((npcInstanceId: string) => {
            if (socket) socket.emit('playerInteractNpc', npcInstanceId);
        }, [socket]);
    
        const handleStartCombat = useCallback(() => {
            if (socket) socket.emit('startCombat'); 
        }, [socket]);
    
        const handleAttack = useCallback(() => {
            if (socket && combatData?.isPlayerTurn) socket.emit('combatAttack');
        }, [socket, combatData]);
    
        const handleRequestInventory = useCallback(() => {
            if (socket) {
                socket.emit('requestInventory');
                setShowInventory(true); 
            }
        }, [socket]);
    
        const handleRequestKeywords = useCallback(() => {
            if (socket) {
                socket.emit('requestKeywords');
                setShowKeywords(true);
            }
        }, [socket]);
    
        const handleRequestAvailableSkills = useCallback(() => {
            if (socket) socket.emit('requestAvailableSkills');
        }, [socket]);
    
        const handleRequestLearnedSkills = useCallback(() => {
            if (socket) socket.emit('requestLearnedSkills');
        }, [socket]);
    
        const handleLearnSkill = useCallback((skillId: string) => {
            if (socket) socket.emit('learnSkill', { skillId: skillId });
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
            if (socket) socket.emit('playerLook');
        }, [socket]);
    
        // Ações da Sala (Botões contextuais)
        const roomActions = (
            <div style={styles.roomActions}>
                <button 
                    style={styles.actionButton} 
                    onClick={handleLook}
                    className="citadel"
                >
                    👁️ Olhar ao Redor
                </button>
                 <button 
                    onClick={handleStartCombat} 
                    className="renegade"
                    style={{ ...styles.actionButton, borderColor: 'var(--color-danger)' }}
                >
                    ⚔️ INICIAR COMBATE (TESTE)
                </button>
            </div>
        );
    
        // Valores atuais para as barras de status
        const currentHp = user?.character?.hp ?? 0;
        const maxHp = user?.character?.maxHp ?? 100;
        const currentEco = user?.character?.eco ?? 0;
        const maxEco = user?.character?.maxEco ?? 50;
    
        // CORREÇÃO: Mover a tela de carregamento para dentro da lógica de renderização
        const renderLoadingScreen = () => (
            <div style={styles.loadingContainer}>
                <div className="glitch-text" data-text="CARREGANDO...">
                    CARREGANDO...
                </div>
            </div>
        );

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
                {/* CORRIGIDO (BUG 1): Toaster removido */}
    
                {/* Header (Renderiza SE TIVER DADOS DO JOGADOR) */}
                {user?.character && (
                    <header style={styles.header}>
                        <div style={styles.headerSection}>
                            <h2 style={styles.characterName}>{user.character.name}</h2>
                            <span style={styles.levelDisplay} title={`XP: ${user.character.xp}`}>
                                Nv. {user.character.level ?? 1}
                            </span>
                        </div>
                        <div style={styles.statusBarsContainer}>
                            <div style={styles.statusBarWrapper}>
                                <span style={{ ...styles.statusBarLabel, color: 'var(--color-hp)' }}>HP</span>
                                <div style={styles.statusBarTrack} title={`${currentHp} / ${maxHp}`}>
                                    <div
                                        className="hp-bar"
                                        style={{
                                            ...styles.statusBarFill,
                                            width: `${maxHp > 0 ? (currentHp / maxHp) * 100 : 0}%`,
                                            boxShadow: '0 0 8px var(--color-hp)',
                                        }}
                                    />
                                </div>
                                <span style={styles.statusBarValue}>{currentHp} / {maxHp}</span>
                            </div>
                            <div style={styles.statusBarWrapper}>
                                <span style={{ ...styles.statusBarLabel, color: 'var(--color-eco)' }}>ECO</span>
                                <div style={styles.statusBarTrack} title={`${currentEco} / ${maxEco}`}>
                                    <div
                                        className="eco-bar"
                                        style={{
                                            ...styles.statusBarFill,
                                            width: `${maxEco > 0 ? (currentEco / maxEco) * 100 : 0}%`,
                                            boxShadow: '0 0 8px var(--color-eco)',
                                        }}
                                    />
                                </div>
                                <span style={styles.statusBarValue}>{currentEco} / {maxEco}</span>
                            </div>
                        </div>
                        <div style={{...styles.headerSection, justifyContent: 'flex-end'}}>
                            <span style={styles.resourceDisplay} title="Ouro">
                                💰<span style={{ marginLeft: '5px' }}>{user.character.gold ?? 0}</span>
                            </span>
                            <span 
                                style={{...styles.resourceDisplay, cursor: hasUnspentPoints ? 'pointer' : 'default'}} 
                                title="Pontos de Atributo Disponíveis"
                                onClick={() => hasUnspentPoints && setShowStats(true)}
                            >
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
    
                {/* Conteúdo Principal (Layout de Ecrã Inteiro Corrigido) */}
                <main style={styles.mainContentArea}>
                    <div style={styles.backgroundImagePlaceholder}>
                        <div className="scanlines" style={{ zIndex: 1, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}></div>
                    </div>
                    <div style={styles.textContentContainer}>
                        {/* CORREÇÃO DA LÓGICA DE RENDERIZAÇÃO:
                          Verifica o prólogo primeiro, depois a sala, e senão, loading.
                        */}
                        {inPrologue && prologueData ? (
                             // 1. MODO PRÓLOGO
                             <PrologueDisplay {...prologueData} /> // CORRIGIDO (TS2322)
                        ) : !inPrologue && room ? (
                             // 2. MODO JOGO NORMAL
                            <>
                                {!combatData?.isActive ? (
                                    // --- MODO EXPLORAÇÃO ---
                                    <>
                                        <h3 style={styles.roomTitle}>{room.name}</h3>
                                        <p 
                                            style={styles.roomDescription}
                                            dangerouslySetInnerHTML={{ __html: room.description || '' }}
                                        />
                                        
                                        {/* GRELHA CORRIGIDA (BUG 2 Layout Torto) */}
                                        <div style={styles.roomInfoGrid}>
                                            {room.npcs && room.npcs.length > 0 && (
                                                <div style={styles.roomInfoSection}>
                                                    <h4 style={styles.roomInfoTitle}>NPCs Presentes:</h4>
                                                    <div style={styles.roomInfoList}>
                                                        {room.npcs.map((npc: { id: string; name: string }) => (
                                                            <button 
                                                                key={npc.id}
                                                                onClick={() => handleInteractNpc(npc.id)}
                                                                className="citadel"
                                                                style={{...styles.actionButton, textAlign: 'left', background: 'rgba(0, 10, 15, 0.5)'}}
                                                            >
                                                                💬 {npc.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {room.players && room.players.length > 0 && (
                                                <div style={styles.roomInfoSection}>
                                                    <h4 style={{...styles.roomInfoTitle, color: 'var(--color-success)'}}>Outros Jogadores:</h4>
                                                    <div style={styles.roomInfoList}>
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
                                            {room.exits && Object.keys(room.exits).length > 0 && (
                                                <div style={styles.roomInfoSection}>
                                                    <h3 style={styles.roomInfoTitle}>Saídas:</h3>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
                                                        {Object.keys(room.exits).map((direction) => (
                                                            <button
                                                                key={direction}
                                                                onClick={() => handleMove(direction)}
                                                                className="citadel"
                                                                style={{ ...styles.actionButton, textTransform: 'capitalize' }}
                                                            >
                                                                🚪 {direction}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
            
                                        <hr style={{ margin: '15px 0', borderColor: 'var(--color-border)', borderStyle: 'dashed' }}/>
                                        {roomActions}
                                    </>
                                ) : (
                                    // --- MODO COMBATE ---
                                    <div style={styles.combatDisplay}>
                                        <h2 className="glitch-text" data-text={`LUTANDO CONTRA: ${combatData.monsterName}`} style={{...styles.combatTitle}}>
                                            Lutando contra: {combatData.monsterName}
                                        </h2>
                                        
                                        <div style={styles.combatStatusBars}>
                                            <div style={{ marginBottom: '10px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8em', marginBottom: '2px' }}>
                                                    <span>Monstro HP:</span>
                                                    <span>{combatData.monsterHp}/{combatData.monsterMaxHp}</span>
                                                </div>
                                                <div className="status-bar" style={{ height: '12px' }}>
                                                    <div 
                                                        className="hp-bar enemy" 
                                                        style={{ 
                                                            width: `${(combatData.monsterHp / combatData.monsterMaxHp) * 100}%`,
                                                            height: '100%',
                                                            backgroundColor: 'var(--color-danger)',
                                                            boxShadow: '0 0 8px var(--color-danger)',
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <EffectsDisplay 
                                            effects={combatData.monsterEffects} 
                                            targetName={combatData.monsterName} 
                                        />
            
                                        <div style={styles.combatLog}>
                                            {combatData.log.map((line: string, i: number) => (
                                                <div key={i} style={styles.combatLogEntry} dangerouslySetInnerHTML={{ __html: line }} />
                                            ))}
                                        </div>
            
                                        <EffectsDisplay 
                                            effects={combatData.playerEffects} 
                                            targetName="Você" 
                                        />
                                        
                                        <p style={{ marginTop: '10px', fontFamily: 'var(--font-display)', fontSize: '0.9em' }}>
                                            Turno: {combatData.isPlayerTurn ?
                                                <span style={{ color: 'var(--color-renegade-cyan)', textShadow: '0 0 8px var(--color-renegade-cyan)', animation: 'glitch-pulse 1s infinite' }}>
                                                    SEU TURNO
                                                </span> :
                                                <span style={{ color: 'var(--color-warning)', textShadow: '0 0 8px var(--color-warning)' }}>
                                                    Monstro
                                                </span>
                                            }
                                        </p>
            
                                        <div style={styles.combatActions}>
                                            <button 
                                                onClick={handleAttack} 
                                                disabled={!combatData.isPlayerTurn}
                                                className={combatData.isPlayerTurn ? 'renegade' : ''}
                                                style={{ ...styles.actionButton, padding: '10px' }}
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
                                                            ...styles.actionButton,
                                                            padding: '10px',
                                                            opacity: canUse ? 1 : 0.6,
                                                            background: canUse 
                                                                ? 'linear-gradient(135deg, var(--color-renegade-purple) 0%, var(--color-renegade-magenta) 100%)' 
                                                                : 'var(--color-citadel-secondary)',
                                                        }}
                                                    >
                                                        {skill.name} ({skill.ecoCost}⚡)
                                                    </button>
                                                );
                                            })}
                                            <button 
                                                onClick={handleRequestInventory} 
                                                disabled={!combatData.isPlayerTurn}
                                                className={combatData.isPlayerTurn ? 'citadel' : ''}
                                                style={{ ...styles.actionButton, padding: '10px', opacity: combatData.isPlayerTurn ? 1 : 0.6 }}
                                            >
                                                🎒 Bolsa
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                             // 3. MODO CARREGAMENTO (Default)
                             renderLoadingScreen()
                        )}
                    </div>
                </main>
    
                {/* --- BARRA DE AÇÕES (FIXA E FUNCIONAL) --- */}
                <footer className="game-action-bar">
                    <button 
                        className="action-bar-button" 
                        onClick={() => setShowStats(true)}
                    >
                        👤 Personagem
                        {hasUnspentPoints && <span className="action-button-notify pulse">[!]</span>}
                    </button>
                    <button 
                        className="action-bar-button" 
                        onClick={handleRequestInventory}
                    >
                        🎒 Inventário
                    </button>
                    <button 
                        className="action-bar-button" 
                        onClick={handleRequestKeywords}
                    >
                        ✨ Ecos
                    </button>
                    <button 
                        className="action-bar-button"
                        onClick={() => {
                            handleRequestAvailableSkills();
                            handleRequestLearnedSkills();
                            setShowSkillsManager(true);
                        }}
                    >
                        📚 Skills
                    </button>
                    <button 
                        className="action-bar-button" 
                        onClick={logout} 
                        style={{borderColor: 'var(--color-danger)', color: 'var(--color-danger)'}}
                    >
                        🚪 Sair
                    </button>
                </footer>
    
                {/* Chat Persistente (Flutuante) */}
                <GameChat />
    
                {/* Modais (Flutuantes) */}
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
                        <hr style={{ margin: '20px 0', borderColor: 'var(--color-border)', borderStyle: 'dashed' }}/>
                        <LearnedSkillsDisplay skills={learnedSkills} />
                    </div>
                )}
            </div>
        );
    }