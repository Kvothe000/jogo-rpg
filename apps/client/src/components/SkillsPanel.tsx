import React, { useState } from 'react';
import type { AvailableSkillData, LearnedSkillData } from '../../../server/src/game/types/socket-with-auth.type';

interface SkillsPanelProps {
    availableSkills: AvailableSkillData[];
    learnedSkills: LearnedSkillData[];
    currentEco: number; // For visualization only
    onLearn: (skillId: string) => void;
    onClose: () => void;
}

export function SkillsPanel({ availableSkills, learnedSkills, currentEco, onLearn, onClose }: SkillsPanelProps) {
    const [viewMode, setViewMode] = useState<'LEARNED' | 'AVAILABLE'>('LEARNED');

    const styles = {
        container: {
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '10px',
        },
        header: {
            fontSize: '0.9em',
            color: 'var(--color-renegade-cyan)',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '5px',
            marginBottom: '5px',
            textTransform: 'uppercase' as const,
            letterSpacing: '1px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        tabContainer: {
            display: 'flex',
            gap: '5px',
            marginBottom: '10px',
        },
        tab: {
            flex: 1,
            padding: '6px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            cursor: 'pointer',
            fontSize: '0.8em',
            fontFamily: 'var(--font-mono)',
            textAlign: 'center' as const,
            transition: 'all 0.2s ease',
        },
        activeTab: {
            background: 'var(--color-renegade-cyan)',
            color: '#000',
            fontWeight: 'bold',
            borderColor: 'var(--color-renegade-cyan)',
            boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)',
        },
        list: {
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '8px',
            overflowY: 'auto' as const,
            paddingRight: '5px', // For scrollbar space
        },
        item: {
            border: '1px solid rgba(255,255,255,0.05)',
            padding: '10px',
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '4px',
            position: 'relative' as const,
        },
        itemName: {
            fontWeight: 'bold',
            color: '#ddd',
            fontSize: '0.9em',
            display: 'block',
            marginBottom: '4px',
        },
        itemMeta: {
            fontSize: '0.75em',
            color: 'var(--color-citadel-highlight)',
            marginBottom: '4px',
            display: 'flex',
            justifyContent: 'space-between',
        },
        description: {
            fontSize: '0.75em',
            color: '#aaa',
            lineHeight: '1.3',
            marginBottom: '8px',
        },
        actionButton: {
            width: '100%',
            padding: '6px',
            fontSize: '0.8em',
            cursor: 'pointer',
            border: 'none',
            borderRadius: '2px',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase' as const,
        },
        learnButton: {
            background: 'linear-gradient(90deg, var(--color-success) 0%, #004400 100%)',
            color: '#fff',
        },
        emptyMessage: {
            textAlign: 'center' as const,
            padding: '20px',
            color: '#666',
            fontStyle: 'italic',
            fontSize: '0.85em',
        },
        backButton: {
            background: 'none',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            cursor: 'pointer',
            fontSize: '0.8em',
            padding: '2px 6px',
            fontFamily: 'var(--font-mono)'
        }
    };

    return (
        <div style={styles.container} className="simple-fade-in">
            <div style={styles.header}>
                <span>Sistemas de Combate</span>
                <button onClick={onClose} style={styles.backButton}> VOLTAR</button>
            </div>

            <div style={styles.tabContainer}>
                <button
                    onClick={() => setViewMode('LEARNED')}
                    style={{ ...styles.tab, ...(viewMode === 'LEARNED' ? styles.activeTab : {}) }}
                >
                    MEMÓRIA ({learnedSkills.length})
                </button>
                <button
                    onClick={() => setViewMode('AVAILABLE')}
                    style={{ ...styles.tab, ...(viewMode === 'AVAILABLE' ? styles.activeTab : {}) }}
                >
                    NOVO ({availableSkills.length})
                </button>
            </div>

            <div style={styles.list}>
                {viewMode === 'LEARNED' && (
                    <>
                        {learnedSkills.length === 0 ? (
                            <div style={styles.emptyMessage}>Nenhum protocolo de combate instalado.</div>
                        ) : (
                            learnedSkills.map((skill) => (
                                <div key={skill.id} style={styles.item}>
                                    <span style={styles.itemName}>⚡ {skill.name}</span>
                                    <div style={styles.itemMeta}>
                                        <span>Custo: {skill.ecoCost} ECO</span>
                                        <span style={{ marginLeft: '10px' }}>CD: {skill.cooldown > 0 ? `${skill.cooldown}T` : '-'}</span>
                                        {/* <span>Nível: {skill.level}</span> -- Nível do "upgrade" da skill futuramente */}
                                    </div>
                                    <p style={styles.description}>{skill.description}</p>
                                    <div style={{ fontSize: '0.7em', color: '#666', marginTop: '5px' }}>
                                        *Equipado automaticamente no terminal de combate.*
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}

                {viewMode === 'AVAILABLE' && (
                    <>
                        {availableSkills.length === 0 ? (
                            <div style={styles.emptyMessage}>Nenhum novo protocolo disponível para download.</div>
                        ) : (
                            availableSkills.map((skill) => (
                                <div key={skill.id} style={styles.item}>
                                    <span style={styles.itemName}>💾 {skill.name}</span>
                                    <div style={styles.itemMeta}>
                                        <span>Custo: {skill.ecoCost} ECO</span>
                                        <span style={{ marginLeft: '10px' }}>CD: {skill.cooldown > 0 ? `${skill.cooldown}T` : '-'}</span>
                                        <span style={{ color: 'var(--color-warning)', marginLeft: 'auto' }}>
                                            {skill.minLevel > 1 ? `Nv. ${skill.minLevel}` : ''}
                                        </span>
                                    </div>
                                    <p style={styles.description}>{skill.description}</p>
                                    <button
                                        style={{ ...styles.actionButton, ...styles.learnButton }}
                                        onClick={() => onLearn(skill.id)}
                                    >
                                        Aprender Protocolo
                                    </button>
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
