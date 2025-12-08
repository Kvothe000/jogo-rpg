import { useState, useEffect, useRef } from 'react';
import type { CombatUpdatePayload, LearnedSkillData } from '../../../server/src/game/types/socket-with-auth.type';
import '../styles/animations.css';
import { useAudio } from '../contexts/AudioContext';

interface CombatDisplayProps {
    combatData: CombatUpdatePayload;
    learnedSkills: LearnedSkillData[];
    onAttack: () => void;
    onUseSkill: (skillId: string) => void;
}

interface DamageNumber {
    id: number;
    value: number;
    isCrit: boolean;
    isPlayer: boolean;
    x: number;
    y: number;
}

export function CombatDisplay({ combatData, learnedSkills, onAttack, onUseSkill }: CombatDisplayProps) {
    const { playSfx } = useAudio();
    const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
    const [isMonsterShaking, setIsMonsterShaking] = useState(false);

    // Refs to track previous HP to detect value changes
    const prevMonsterHp = useRef(combatData.monsterHp);

    // Counter for unique IDs
    const nextId = useRef(0);

    useEffect(() => {
        // Detect Monster Damage
        if (combatData.monsterHp < prevMonsterHp.current) {
            const damage = prevMonsterHp.current - combatData.monsterHp;
            addDamageNumber(damage, false, false); // Not crit (diff logic), Not player
            triggerMonsterShake();
            playSfx('hit');
        }
        prevMonsterHp.current = combatData.monsterHp;
    }, [combatData.monsterHp, playSfx]);

    const addDamageNumber = (value: number, isCrit: boolean, isPlayer: boolean) => {
        const id = nextId.current++;
        const x = Math.random() * 40 - 20;
        const y = Math.random() * 20 - 10;

        setDamageNumbers(prev => [...prev, { id, value, isCrit, isPlayer, x, y }]);

        setTimeout(() => {
            setDamageNumbers(prev => prev.filter(dn => dn.id !== id));
        }, 1000);
    };

    const triggerMonsterShake = () => {
        setIsMonsterShaking(true);
        setTimeout(() => setIsMonsterShaking(false), 500);
    };

    const handleAttackClick = () => {
        playSfx('attack');
        onAttack();
    };

    const handleSkillClick = (skillId: string) => {
        playSfx('attack'); // Using generic attack sound for skill for now
        onUseSkill(skillId);
    };

    const styles = {
        container: {
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '20px',
            position: 'relative' as const,
        },
        monsterContainer: {
            position: 'relative' as const,
            padding: '20px',
            border: '2px solid var(--color-danger)',
            backgroundColor: 'rgba(50, 0, 0, 0.2)',
            borderRadius: '8px',
            width: '80%',
            maxWidth: '400px',
            textAlign: 'center' as const,
            transition: 'transform 0.1s',
        },
        monsterName: {
            fontSize: '1.5em',
            color: 'var(--color-danger)',
            textTransform: 'uppercase' as const,
            marginBottom: '10px',
            fontFamily: 'var(--font-display)',
        },
        hpBarTrack: {
            height: '12px',
            background: '#300',
            border: '1px solid var(--color-danger)',
            borderRadius: '2px',
            overflow: 'hidden',
            marginTop: '5px',
        },
        hpBarFill: {
            height: '100%',
            background: 'var(--color-danger)',
            transition: 'width 0.3s ease-out',
        },
        actionsContainer: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            width: '100%',
            maxWidth: '500px',
        },
        actionButton: {
            padding: '12px',
            border: '1px solid var(--color-border)',
            background: 'rgba(0, 50, 50, 0.3)',
            color: '#fff',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase' as const,
            transition: 'all 0.1s',
        },
        logContainer: {
            marginTop: '15px',
            fontSize: '0.9em',
            color: '#bbb',
            fontStyle: 'italic',
            maxHeight: '100px',
            overflowY: 'auto' as const,
            width: '100%',
            textAlign: 'left' as const,
            padding: '10px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '4px'
        }
    };

    return (
        <div style={styles.container}>
            {/* MONSTER DISPLAY */}
            <div
                style={styles.monsterContainer}
                className={isMonsterShaking ? 'shake' : ''}
            >
                <div style={styles.monsterName}>{combatData.monsterName}</div>
                <div style={{ fontSize: '2em', fontWeight: 'bold' }}>👹</div>

                <div style={styles.hpBarTrack}>
                    <div style={{ ...styles.hpBarFill, width: `${(combatData.monsterHp / combatData.monsterMaxHp) * 100}%` }} />
                </div>
                <div style={{ fontSize: '0.8em', marginTop: '5px', color: '#aaa' }}>
                    HP: {combatData.monsterHp} / {combatData.monsterMaxHp}
                </div>

                {/* Floating Damage Numbers */}
                {damageNumbers.map(dn => (
                    <div
                        key={dn.id}
                        className={`damage-number ${dn.isCrit ? 'crit' : ''}`}
                        style={{
                            left: `calc(50% + ${dn.x}px)`,
                            top: `calc(20% + ${dn.y}px)`
                        }}
                    >
                        -{dn.value}
                    </div>
                ))}
            </div>

            {/* COMBAT LOG MSG */}
            <div style={styles.logContainer}>
                Last: {combatData.message}
            </div>

            {/* PLAYER ACTIONS */}
            <div style={styles.actionsContainer}>
                <button
                    style={{ ...styles.actionButton, backgroundColor: '#400', borderColor: '#f00' }}
                    onClick={handleAttackClick}
                    disabled={!combatData.isPlayerTurn}
                >
                    🗡️ Atacar
                </button>

                {learnedSkills.map(skill => (
                    <button
                        key={skill.id}
                        style={{ ...styles.actionButton, backgroundColor: '#004444', borderColor: 'cyan' }}
                        onClick={() => handleSkillClick(skill.id)}
                        disabled={!combatData.isPlayerTurn}
                        title={`${skill.description} (Custo: ${skill.ecoCost})`}
                    >
                        ⚡ {skill.name}
                    </button>
                ))}
            </div>

            {!combatData.isPlayerTurn && (
                <div style={{ color: '#aaa', fontSize: '0.9em', marginTop: '10px' }} className="pulse">
                    Aguardando inimigo...
                </div>
            )}
        </div>
    );
}
