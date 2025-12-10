import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { GameChat } from '../components/GameChat';
import { InventoryDisplay } from '../components/InventoryDisplay';
import { SkillsPanel } from '../components/SkillsPanel';
import { CombatDisplay } from '../components/CombatDisplay';
import { MiniMap } from '../components/MiniMap';
import { DeathScreen } from '../components/DeathScreen';
import { LevelUpOverlay } from '../components/LevelUpOverlay';
import { EffectsDisplay } from '../components/EffectsDisplay';
import { CharacterStatsDisplay } from '../components/CharacterStatsDisplay';
import { PrologueDisplay } from '../components/PrologueDisplay';
import { QuestDisplay } from '../components/QuestDisplay';
import { VictoryDisplay } from '../components/VictoryDisplay'; // Importado
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
// Estilos (Redesign: Terminal do Operador)
// Estilos (Redesign: Terminal do Operador)
const styles: Record<string, React.CSSProperties> = {
    containerStyle: {
        display: 'grid',
        gridTemplateColumns: '280px 1fr 300px', // Left (Status) | Center (Main) | Right (Context)
        gridTemplateRows: '60px 1fr', // Header | Content
        height: '100vh',
        overflow: 'hidden',
        fontFamily: 'var(--font-main)',
        background: 'radial-gradient(circle at center, #050505 0%, #020202 100%)',
        color: 'var(--color-renegade-text)',
    },
    header: {
        gridColumn: '1 / -1',
        gridRow: '1',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 20px',
        backgroundColor: 'rgba(0, 5, 10, 0.95)',
        borderBottom: '1px solid var(--color-border)',
        zIndex: 90,
        boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
    },
    // --- COLUNA ESQUERDA: STATUS VITAL ---
    leftPanel: {
        gridColumn: '1',
        gridRow: '2',
        backgroundColor: 'rgba(0, 5, 8, 0.9)',
        borderRight: '1px solid var(--color-border)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        overflowY: 'auto',
    },
    // --- COLUNA CENTRAL: FLUXO NARRATIVO ---
    centerPanel: {
        gridColumn: '2',
        gridRow: '2',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        overflow: 'hidden', // Importante para scroll interno
    },
    // --- COLUNA DIREITA: CONTEXTO LOCAL ---
    rightPanel: {
        gridColumn: '3',
        gridRow: '2',
        backgroundColor: 'rgba(0, 5, 8, 0.9)',
        borderLeft: '1px solid var(--color-border)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        overflowY: 'auto',
    },

    // --- SUB-COMPONENTES ---
    headerSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
    },
    characterName: {
        margin: 0,
        fontFamily: 'var(--font-display)',
        color: 'var(--color-renegade-cyan)',
        fontSize: '1.2em',
        letterSpacing: '1px',
    },
    levelDisplay: {
        fontSize: '0.8em',
        color: 'var(--color-warning)',
        border: '1px solid var(--color-warning)',
        padding: '2px 6px',
        borderRadius: '2px',
    },

    // Cards e Seções
    panelSection: {
        marginBottom: '15px',
        background: 'rgba(255, 255, 255, 0.02)',
        padding: '10px',
        borderRadius: '4px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
    },
    panelTitle: {
        fontFamily: 'var(--font-display)',
        color: 'var(--color-renegade-cyan)',
        fontSize: '0.9em',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: '5px',
        marginBottom: '10px',
        textTransform: 'uppercase',
        letterSpacing: '1px',
    },

    // Barras de Status (Left Panel)
    statusBarWrapper: {
        marginBottom: '10px',
    },
    statusBarLabel: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.8em',
        marginBottom: '4px',
        fontFamily: 'var(--font-mono)',
    },
    statusBarTrack: {
        height: '8px',
        backgroundColor: '#111',
        borderRadius: '2px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
    },
    statusBarFill: {
        height: '100%',
        transition: 'width 0.3s ease-out',
    },

    // Main Content Area (Center)
    mainLogContainer: {
        flexGrow: 1,
        padding: '20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
    },
    roomTitle: {
        fontFamily: 'var(--font-display)',
        color: '#fff',
        fontSize: '1.8em',
        margin: '0 0 10px 0',
        textShadow: '0 0 10px rgba(255,255,255,0.2)',
    },
    roomDescription: {
        lineHeight: '1.6',
        color: '#ccc',
        fontSize: '1em',
        marginBottom: '20px',
    },

    // Action Bar (Bottom of Center)
    actionBar: {
        padding: '15px',
        borderTop: '1px solid var(--color-border)',
        backgroundColor: 'rgba(0, 10, 15, 0.95)',
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
        flexWrap: 'wrap',
    },
    // loadingContainer removed (duplicate)
    loadingContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#000',
        color: '#00FF00', // Hardcoded Bright Green for visibility
        fontFamily: 'var(--font-mono)',
        zIndex: 9999, // Ensure it's on top if active
        flexDirection: 'column',
    },
    actionButton: {
        padding: '8px 16px',
        background: 'rgba(0,0,0,0.6)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text)',
        cursor: 'pointer',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.9em',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },

    // Utility
    resourceDisplay: {
        display: 'flex',
        alignItems: 'center',
        fontSize: '0.9em',
        color: 'var(--color-text-muted)',
    },
    pointsIndicator: {
        color: 'var(--color-warning)',
        marginLeft: '5px',
        fontSize: '0.8em',
        fontWeight: 'bold',
    }
};

import { useAudio } from '../contexts/AudioContext'; // Import Hook

export function GamePage() {
    const { user, logout, updateProfile } = useAuth();
    const { socket } = useSocket();
    const { playAmbience, playSfx } = useAudio(); // Use Audio Hook
    const [room, setRoom] = useState<RoomData | null>(null);
    const [combatData, setCombatData] = useState<CombatUpdatePayload | null>(null);
    const [inventorySlots, setInventorySlots] = useState<InventorySlotData[]>([]);

    // UI State Management
    const [activePanel, setActivePanel] = useState<'CONTEXT' | 'INVENTORY' | 'SKILLS' | 'ECOS' | 'QUESTS'>('CONTEXT');
    const [uiTheme, setUiTheme] = useState<'citadel' | 'renegade'>('citadel');

    // Data States (Restored)
    const [keywords, setKeywords] = useState<KeywordData[]>([]);
    const [availableSkills, setAvailableSkills] = useState<AvailableSkillData[]>([]);

    const [learnedSkills, setLearnedSkills] = useState<LearnedSkillData[]>([]);
    const [activeQuests, setActiveQuests] = useState<any[]>([]); // New State

    // Modals (Legacy/Specific)
    const [showStats, setShowStats] = useState(false);
    const [isTransitioningUI, setIsTransitioningUI] = useState(false);
    const [prologueData, setPrologueData] = useState<PrologueUpdatePayload | null>(null);

    // --- VICTORY SCREEN STATE ---
    const [victoryData, setVictoryData] = useState<{
        xpGained: number;
        goldGained: number;
        newLevel?: number;
        drops: LootDropPayload[];
    } | null>(null);

    // --- DEATH STATE ---
    const [isDead, setIsDead] = useState(false);

    // Efeito de Glitch Ambiental para Dungeon Tutorial
    const [isGlitchActive, setIsGlitchActive] = useState(false);

    useEffect(() => {
        if (user?.character?.mapId?.startsWith('td_room_')) {
            setIsGlitchActive(true);
        } else {
            setIsGlitchActive(false);
        }
    }, [user?.character?.mapId]);

    const pendingVictoryData = useRef<{
        xpGained: number;
        goldGained: number;
        newLevel?: number;
        drops: LootDropPayload[];
    }>({ xpGained: 0, goldGained: 0, drops: [] });
    // ----------------------------

    const userRef = useRef(user);
    const updateProfileRef = useRef(updateProfile);

    useEffect(() => { userRef.current = user; }, [user]);
    useEffect(() => { updateProfileRef.current = updateProfile; }, [updateProfile]);

    // --- KEYBOARD NAVIGATION ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignorar se estiver digitando em input/textarea
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
            if (!socket) return;
            if (combatData?.isActive) return; // Não mover em combate

            let direction = '';
            switch (e.key.toLowerCase()) {
                case 'w': case 'arrowup': direction = 'norte'; break;
                case 's': case 'arrowdown': direction = 'sul'; break;
                case 'a': case 'arrowleft': direction = 'oeste'; break;
                case 'd': case 'arrowright': direction = 'leste'; break;
            }

            if (direction) {
                // Feedback visual imediato (opcional)
                toast(`Movendo para ${direction}...`, {
                    id: 'nav-feedback',
                    duration: 1000,
                    icon: '🦶',
                    style: { background: 'rgba(0,0,0,0.8)', color: '#fff' }
                });
                socket.emit('playerMove', direction);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [socket, combatData?.isActive]);
    // --- END KEYBOARD NAVIGATION ---

    const isAwakened = user?.character?.status === 'AWAKENED';
    const inPrologue = user?.character?.prologueState !== 'COMPLETED';

    // Level Up Tracking
    const prevLevelRef = useRef(user?.character?.level ?? 1);
    const [showLevelUp, setShowLevelUp] = useState(false);

    useEffect(() => {
        if (!user?.character) return;

        // Level Up Detection
        if (user.character.level > prevLevelRef.current) {
            setShowLevelUp(true);
            playSfx('success');
        }
        prevLevelRef.current = user.character.level;

        // Theme switching (existing)
        const newTheme = (combatData?.isActive || isAwakened) ? 'renegade' : 'citadel';
        setUiTheme(prevTheme => {
            if (prevTheme === 'citadel' && newTheme === 'renegade') {
                setIsTransitioningUI(true);
                setTimeout(() => setIsTransitioningUI(false), 1200);
            }
            return newTheme;
        });

        // Audio Ambience Switching
        if (combatData?.isActive) {
            playAmbience('combat');
        } else {
            playAmbience('drone');
        }

    }, [combatData, isAwakened, playAmbience, user?.character?.level, playSfx]);

    const handleRespawn = useCallback(() => {
        if (socket) {
            socket.emit('playerRespawn');
            playSfx('respawn');
            setIsDead(false);
            setCombatData(null);
        }
    }, [socket, playSfx]);

    const hasUnspentPoints = (user?.character?.attributePoints ?? 0) > 0;

    useEffect(() => {
        if (!socket) return;

        // --- LISTENERS DO PRÓLOGO ---
        const handlePrologueUpdate = (payload: PrologueUpdatePayload) => {
            console.log('[Socket] Recebido prologueUpdate:', payload);
            setPrologueData(payload);
        };
        const handleProfileUpdate = (payload: any) => {
            console.log('[Socket] Profile Updated:', payload);
            updateProfile(payload);
        };

        socket.on('prologueUpdate', handlePrologueUpdate);
        socket.on('profileUpdate', handleProfileUpdate);

        // Se estiver no prólogo, pede o estado atual imediatamente (importante para refresh)
        if (inPrologue) {
            socket.emit('requestPrologueState');
        }
        // --- FIM LISTENERS PRÓLOGO ---

        const handleUpdateRoom = (data: RoomData) => {
            setRoom(data);
            setCombatData(null);
        };
        const handleNpcDialogue = (payload: { npcName: string; dialogue: string }) => {
            console.log('[GamePage] RECEBIDO DIÁLOGO:', payload);
            toast((t) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--color-citadel-glow)' }}>{payload.npcName} diz:</span>
                    <span style={{ fontStyle: 'italic', color: '#fff' }}>"{payload.dialogue}"</span>
                </div>
            ), {
                duration: 6000,
                icon: '💬',
                style: {
                    borderLeft: '4px solid var(--color-citadel-glow)',
                    background: 'rgba(10, 20, 30, 0.95)',
                    color: '#fff',
                    zIndex: 9999, // Forçar visibilidade
                }
            });
        };
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
            if (result === 'win') {
                // VITÓRIA: Mostrar tela de vitória e NÃO limpar combatData ainda
                setVictoryData({ ...pendingVictoryData.current });
                playSfx('success'); // Som de vitória extra
            }
            else {
                // DERROTA/FUGA
                if (result === 'loss') {
                    playSfx('gameover'); // Assumes 'gameover' sfx exists, or use 'loss'
                    setIsDead(true);
                    // Do NOT clear combatData immediately if we want to show last state?
                    // Actually DeathScreen covers everything.
                    setCombatData(null);
                } else {
                    toast('Fugiu da batalha.', { icon: '💨' });
                    setCombatData(null);
                    socket.emit('playerLook');
                }
            }
        };

        // **** LÓGICA DE LEVEL UP CORRIGIDA ****
        const handlePlayerUpdated = (payload: {
            newTotalXp: string;
            xpGained: number; // NOVO: Explicito
            goldGained: number;
            newLevel?: number;
        }) => {
            try {
                const currentUser = userRef.current;

                // Use explicit value from server to avoid race conditions
                const xpGained = payload.xpGained;

                // Accumulate for Victory Screen
                if (combatData?.isActive || activePanel === 'CONTEXT') {
                    pendingVictoryData.current.xpGained = xpGained;
                    pendingVictoryData.current.goldGained = payload.goldGained;
                    pendingVictoryData.current.newLevel = payload.newLevel;
                }

                const alertMsg = payload.newLevel
                    ? `🎉 NÍVEL ${payload.newLevel}! (+${xpGained} XP, +${payload.goldGained} Ouro)`
                    : `+${xpGained} XP, +${payload.goldGained} Ouro`;

                if (!combatData?.isActive) {
                    toast.success(alertMsg, { duration: 4000 });
                }

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
                // Accumulate for Victory Screen
                if (combatData?.isActive || activePanel === 'CONTEXT') {
                    pendingVictoryData.current.drops = payload.drops;
                }

                const lootMessage = payload.drops.map(d => `${d.quantity}x ${d.itemName}`).join(', ');
                if (!combatData?.isActive) {
                    toast(`💰 Loot: ${lootMessage}`, { icon: '🪙', duration: 4000 });
                }
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
        const handleUpdateQuests = (payload: { quests: any[] }) => setActiveQuests(payload.quests); // Quest Listener

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
        socket.on('updateQuests', handleUpdateQuests);

        handleRequestLearnedSkills();
        socket.emit('requestQuests');
        socket.emit('playerLook'); // Force initial room load

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
            socket.off('updateQuests', handleUpdateQuests);
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
        // Reset Victory Data for new combat
        pendingVictoryData.current = { xpGained: 0, goldGained: 0, drops: [] };
        if (socket) socket.emit('startCombat');
    }, [socket]);

    const handleVictoryContinue = useCallback(() => {
        setVictoryData(null);
        setCombatData(null);
        socket.emit('playerLook');
        // Reset pending (redundant but safe)
        pendingVictoryData.current = { xpGained: 0, goldGained: 0, drops: [] };
    }, [socket]);

    const handleAttack = useCallback(() => {
        if (socket && combatData?.isPlayerTurn) socket.emit('combatAttack');
    }, [socket, combatData]);

    const handleRequestInventory = useCallback(() => {
        if (socket) {
            socket.emit('requestInventory');
            setActivePanel('INVENTORY');
        }
    }, [socket]);

    const handleRequestKeywords = useCallback(() => {
        if (socket) {
            socket.emit('requestKeywords');
            // setShowKeywords(true); // Removido pois não estamos usando o modal antigo
        }
    }, [socket]);

    const handleRequestAvailableSkills = useCallback(() => {
        if (socket) {
            socket.emit('requestAvailableSkills');
            socket.emit('requestLearnedSkills');
            setActivePanel('SKILLS');
        }
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

    // DEV: RESPAWN
    const handleDevRespawn = useCallback(() => {
        if (socket) socket.emit('adminRespawn');
    }, [socket]);

    // Ações da Sala (Botões contextuais)
    // Variáveis de Progresso para UI
    const currentHp = user?.character?.hp ?? 0;
    const currentEco = user?.character?.eco ?? 0;

    // missing definitions restoration
    const maxHp = user?.character?.maxHp ?? 100;
    const maxEco = user?.character?.maxEco ?? 50;
    const characterStats = user?.character || { xp: 0, level: 1, attributePoints: 0 };
    // Simple Next Level XP calc (placeholder logic if actual logic is complex)
    const nextLevelXp = (characterStats.level ?? 1) * 1000;

    const renderLoadingScreen = () => (
        <div style={styles.loadingContainer}>
            <div className="glitch-text" style={{ fontSize: '1.5em' }}>INICIALIZANDO NEURAL LINK...</div>
        </div>
    );
    const xpProgress = nextLevelXp > 0 ? (Number(characterStats.xp) / Number(nextLevelXp)) * 100 : 0;


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
            <div className="crt-overlay"></div>
            {/* --- HEADER (GRID ROW 1) --- */}
            {user?.character && (
                <header style={styles.header}>
                    <div style={styles.headerSection}>
                        {[1, 2, 3].map(i => <div key={i} className="decoration-bar" style={{ height: '20px', width: '4px', background: 'var(--color-renegade-cyan)', opacity: 0.3 * i, marginRight: '2px' }}></div>)}
                        <h2 style={styles.characterName}>{user.character.name}</h2>
                        <span style={styles.levelDisplay} title={`XP: ${user.character.xp} `}>
                            NV {user.character.level ?? 1}
                        </span>
                    </div>

                    <div style={styles.headerSection}>
                        <span style={styles.resourceDisplay} title="Ouro Disponível">
                            {user.character.gold ?? 0} <span style={{ color: 'gold', marginLeft: '5px' }}>CR (Credits)</span>
                        </span>
                        <span className="separator" style={{ margin: '0 10px', color: '#333' }}>|</span>
                        <span
                            style={{ ...styles.resourceDisplay, cursor: hasUnspentPoints ? 'pointer' : 'default' }}
                            title="Pontos de Atributo"
                            onClick={() => hasUnspentPoints && setShowStats(true)}
                        >
                            {user.character.attributePoints ?? 0} <span style={{ color: 'var(--color-renegade-cyan)', marginLeft: '5px' }}>PTS</span>
                            {hasUnspentPoints && <span style={styles.pointsIndicator} className="pulse">[!]</span>}
                        </span>
                    </div>
                </header>
            )}

            {/* --- LEFT PANEL: STATUS & VITALS (GRID ROW 2, COL 1) --- */}
            <aside style={styles.leftPanel}>
                <h3 style={styles.panelTitle}>Estado Vital</h3>

                {/* HP BAR */}
                <div style={styles.statusBarWrapper}>
                    <div style={styles.statusBarLabel}>
                        <span style={{ color: 'var(--color-hp)' }}>INTEGRIDADE (HP)</span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <span>{currentHp} / {maxHp}</span>
                            {!combatData?.isActive && currentHp < maxHp && (
                                <button
                                    onClick={() => {
                                        socket?.emit('playerRest');
                                        playSfx('success');
                                    }}
                                    style={{
                                        background: 'none',
                                        border: '1px solid var(--color-renegade-cyan)',
                                        color: 'var(--color-renegade-cyan)',
                                        fontSize: '0.8em',
                                        padding: '0 4px',
                                        cursor: 'pointer',
                                        animation: 'pulse 2s infinite'
                                    }}
                                    title="Reparar Sistemas"
                                >
                                    [REPARAR]
                                </button>
                            )}
                        </div>
                    </div>
                    <div style={styles.statusBarTrack}>
                        <div
                            style={{
                                ...styles.statusBarFill,
                                width: `${maxHp > 0 ? (currentHp / maxHp) * 100 : 0}% `,
                                backgroundColor: 'var(--color-hp)',
                                boxShadow: '0 0 10px var(--color-hp)',
                            }}
                        />
                    </div>
                </div>

                {/* ECO BAR */}
                <div style={styles.statusBarWrapper}>
                    <div style={styles.statusBarLabel}>
                        <span style={{ color: 'var(--color-eco)' }}>RESSONÂNCIA (ECO)</span>
                        <span>{currentEco} / {maxEco}</span>
                    </div>
                    <div style={styles.statusBarTrack}>
                        <div
                            style={{
                                ...styles.statusBarFill,
                                width: `${maxEco > 0 ? (currentEco / maxEco) * 100 : 0}% `,
                                backgroundColor: 'var(--color-eco)',
                                boxShadow: '0 0 10px var(--color-eco)',
                            }}
                        />
                    </div>
                </div>

                {/* XP / LEVEL PROGRESS */}
                <div style={{ marginTop: '10px' }}>
                    <div style={{ ...styles.statusBarLabel, color: '#aaa' }}>Sincronização (XP)</div>
                    <div style={{ height: '2px', background: '#333', width: '100%' }}>
                        <div style={{ width: `${xpProgress}% `, height: '100%', background: 'var(--color-warning)' }}></div>
                    </div>
                </div>

                {/* ATRIBUTOS RESUMO */}
                <div style={{ marginTop: '20px', ...styles.panelSection }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.8em', color: '#666' }}>ATRIBUTOS</h4>
                        {/* Show Available Points if > 0 */}
                        {(user?.character?.attributePoints ?? 0) > 0 && (
                            <span style={{ color: 'var(--color-highlight)', fontSize: '0.8em', fontWeight: 'bold' }}>
                                +{user?.character?.attributePoints} Pts
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '5px', fontSize: '0.8em' }}>
                        {['strength', 'dexterity', 'intelligence', 'constitution'].map(attr => (
                            <div key={attr} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ textTransform: 'uppercase', color: '#aaa' }}>{attr.substring(0, 3)}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span style={{ color: '#fff' }}>{(user?.character as any)?.[attr]}</span>
                                    {(user?.character?.attributePoints ?? 0) > 0 && (
                                        <button
                                            onClick={() => socket?.emit('spendAttributePoint', { attribute: attr })}
                                            style={{
                                                background: 'var(--color-highlight)',
                                                border: 'none',
                                                color: '#000',
                                                borderRadius: '50%',
                                                width: '16px',
                                                height: '16px',
                                                lineHeight: '16px',
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                fontSize: '10px',
                                                padding: 0
                                            }}
                                        >
                                            +
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ACTIVE EFFECTS */}
                <div style={{ flexGrow: 1 }}>
                    <EffectsDisplay effects={combatData?.playerEffects || []} targetName="Você" />
                </div>
            </aside>

            {/* --- CENTER PANEL: MAIN CONTENT (GRID ROW 2, COL 2) --- */}
            <main style={styles.centerPanel}>

                {/* DEV BUTTON - Force Top Right */}
                <button
                    onClick={handleRespawn}
                    style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        zIndex: 9999,
                        background: 'rgba(255, 0, 0, 0.7)',
                        color: 'white',
                        fontSize: '0.8em',
                        padding: '5px 10px',
                        border: '1px solid #f00',
                        cursor: 'pointer'
                    }}
                >
                    DEV: RESPAWN
                </button>

                {/* VICTORY OVERLAY */}
                {victoryData && (
                    <VictoryDisplay
                        xpGained={victoryData.xpGained}
                        goldGained={victoryData.goldGained}
                        newLevel={victoryData.newLevel}
                        drops={victoryData.drops}
                        onContinue={handleVictoryContinue}
                    />
                )}

                {/* DEATH OVERLAY */}
                {isDead && (
                    <DeathScreen onRespawn={handleRespawn} />
                )}

                <div style={styles.backgroundImagePlaceholder}>
                    <div className="scanlines" style={{ zIndex: 0, position: 'absolute', inset: 0, pointerEvents: 'none' }}></div>
                </div>

                {/* CONTENT AREA */}
                <div style={styles.mainLogContainer}>
                    {inPrologue && prologueData ? (
                        <PrologueDisplay {...prologueData} />
                    ) : !inPrologue && room ? (
                        <>
                            {!combatData?.isActive ? (
                                // EXPLORATION VIEW
                                <>
                                    <h3 style={styles.roomTitle}>{room.name}</h3>
                                    <p style={styles.roomDescription} dangerouslySetInnerHTML={{ __html: room.description || '' }} />
                                </>
                            ) : (
                                // COMBAT VIEW
                                <CombatDisplay
                                    combatData={combatData}
                                    learnedSkills={learnedSkills}
                                    onAttack={handleAttack}
                                    onUseSkill={handleUseSkill}
                                />
                            )}
                        </>
                    ) : (
                        renderLoadingScreen()
                    )}
                </div>

                {/* ACTIONS FOOTER (INSIDE CENTER PANEL) */}
                <div style={styles.actionBar}>
                    {!combatData?.isActive ? (
                        // BOTOES DE EXPLORACAO
                        room?.exits && Object.keys(room.exits).map((direction) => (
                            <button
                                key={direction}
                                onClick={() => handleMove(direction)}
                                style={styles.actionButton}
                                className="citadel"
                            >
                                🚪 {direction.toUpperCase()}
                            </button>
                        ))
                    ) : (
                        <div style={{ color: '#666', fontSize: '0.8em' }}>
                            *Controles de combate ativos no painel principal*
                        </div>
                    )}
                </div>
            </main>

            {/* --- RIGHT PANEL: CONTEXT & INFO (GRID ROW 2, COL 3) --- */}
            <aside style={styles.rightPanel}>

                {/* Abas Superiores */}
                <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                    <button
                        style={{ ...styles.actionButton, flex: 1, justifyContent: 'center', background: activePanel === 'CONTEXT' ? 'var(--color-accent)' : undefined }}
                        onClick={() => setActivePanel('CONTEXT')}
                    >
                        TERRENO
                    </button>
                    <button
                        style={{ ...styles.actionButton, flex: 1, justifyContent: 'center', background: activePanel === 'QUESTS' ? 'var(--color-accent)' : undefined }}
                        onClick={() => setActivePanel('QUESTS')}
                    >
                        MISSÕES
                    </button>
                </div>

                {activePanel === 'CONTEXT' && (
                    <>
                        <h3 style={styles.panelTitle}>Sensores Locais</h3>
                        {!inPrologue && room ? (
                            <>
                                {/* MINI MAP */}
                                <MiniMap
                                    exits={room.exits}
                                    npcs={room.npcs}
                                    players={room.players}
                                />
                                {/* NPCS */}
                                {room.npcs && room.npcs.length > 0 && (
                                    <div style={styles.panelSection}>
                                        <h4 style={{ fontSize: '0.8em', color: 'var(--color-renegade-cyan)', marginBottom: '8px' }}>ENTIDADES DETECTADAS</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            {room.npcs.map(npc => (
                                                <div key={npc.id} style={{ display: 'flex', gap: '5px' }}>
                                                    <button
                                                        onClick={() => handleInteractNpc(npc.id)}
                                                        style={{ ...styles.actionButton, flexGrow: 1, fontSize: '0.8em', padding: '4px 8px' }}
                                                    >
                                                        💬 {npc.name}
                                                    </button>
                                                    <button
                                                        onClick={() => socket?.emit('startCombat', { npcInstanceId: npc.id })}
                                                        style={{ ...styles.actionButton, color: 'var(--color-danger)', borderColor: 'var(--color-danger)', padding: '4px' }}
                                                        title="Iniciar Hostilidade"
                                                    >
                                                        ⚔️
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* PLAYERS */}
                                {room.players && room.players.length > 0 && (
                                    <div style={styles.panelSection}>
                                        <h4 style={{ fontSize: '0.8em', color: 'var(--color-success)', marginBottom: '8px' }}>OUTROS AGENTES</h4>
                                        {room.players.map(p => (
                                            <div key={p.id} style={{ padding: '4px', border: '1px solid rgba(0,255,0,0.2)', marginBottom: '4px', fontSize: '0.8em' }}>
                                                👤 {p.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5, fontStyle: 'italic' }}>
                                Sem dados de sensores.
                            </div>
                        )}
                    </>
                )}

                {activePanel === 'QUESTS' && (
                    <>
                        <h3 style={styles.panelTitle}>Protocolos Ativos</h3>
                        <QuestDisplay quests={activeQuests} />
                    </>
                )}



                {
                    activePanel === 'INVENTORY' && (
                        <InventoryDisplay slots={inventorySlots} onClose={() => setActivePanel('CONTEXT')} />
                    )
                }

                {
                    activePanel === 'SKILLS' && (
                        <SkillsPanel
                            availableSkills={availableSkills}
                            learnedSkills={learnedSkills}
                            currentEco={currentEco}
                            onLearn={handleLearnSkill}
                            onClose={() => setActivePanel('CONTEXT')}
                        />
                    )
                }

                {/* Futuramente: ECOS aqui */}

                {/* SYSTEM MENU (Fixed at bottom) */}
                <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                        <button style={{ ...styles.actionButton, background: activePanel === 'INVENTORY' ? 'var(--color-renegade-cyan)' : undefined, color: activePanel === 'INVENTORY' ? '#000' : undefined }} onClick={handleRequestInventory}>🎒 BOLSA</button>
                        <button style={{ ...styles.actionButton, background: activePanel === 'SKILLS' ? 'var(--color-renegade-cyan)' : undefined, color: activePanel === 'SKILLS' ? '#000' : undefined }} onClick={handleRequestAvailableSkills}>📚 SKILLS</button>
                        <button style={styles.actionButton} onClick={() => alert('Ecos em breve aqui!')}>✨ ECOS</button>
                        <button style={{ ...styles.actionButton, borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }} onClick={logout}>🚪 SAIR</button>
                    </div>
                </div>
            </aside >

            {/* --- MODALS & OVERLAYS --- */}
            < GameChat />
            {showStats && <CharacterStatsDisplay onClose={() => setShowStats(false)} />}

            {/* GAMEPLAY LOOP OVERLAYS */}
            {user?.character?.hp !== undefined && user.character.hp <= 0 && (
                <DeathScreen onRespawn={handleRespawn} />
            )}

            {showLevelUp && user?.character && (
                <LevelUpOverlay
                    level={user.character.level}
                    onClose={() => setShowLevelUp(false)}
                />
            )}
        </div >
    );
}