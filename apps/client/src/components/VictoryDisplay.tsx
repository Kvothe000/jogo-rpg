import React, { useEffect, useState } from 'react';
import '../styles/animations.css';

interface VictoryDisplayProps {
    xpGained: number;
    goldGained: number;
    newLevel?: number;
    drops: { itemName: string; quantity: number }[];
    onContinue: () => void;
}

export function VictoryDisplay({ xpGained, goldGained, newLevel, drops, onContinue }: VictoryDisplayProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(true);
    }, []);

    const styles = {
        overlay: {
            position: 'absolute' as const,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.5s ease-out'
        },
        container: {
            width: '90%',
            maxWidth: '500px',
            padding: '30px',
            border: '2px solid var(--color-gold, #ffd700)',
            backgroundColor: 'rgba(20, 20, 0, 0.4)',
            borderRadius: '8px',
            textAlign: 'center' as const,
            boxShadow: '0 0 50px rgba(255, 215, 0, 0.2)',
            transform: visible ? 'scale(1)' : 'scale(0.8)',
            opacity: visible ? 1 : 0,
            transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        },
        title: {
            fontSize: '3em',
            color: 'var(--color-gold, #ffd700)',
            marginBottom: '20px',
            textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
            fontFamily: 'var(--font-display)',
            letterSpacing: '5px'
        },
        statsRow: {
            display: 'flex',
            justifyContent: 'center',
            gap: '40px',
            marginBottom: '30px',
            fontSize: '1.2em'
        },
        statItem: {
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            gap: '5px'
        },
        statValue: {
            fontSize: '1.5em',
            fontWeight: 'bold',
            color: '#fff'
        },
        label: {
            color: '#aaa',
            fontSize: '0.8em',
            textTransform: 'uppercase' as const
        },
        lootContainer: {
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '20px',
            marginBottom: '30px'
        },
        lootTitle: {
            color: '#ccc',
            marginBottom: '10px',
            fontSize: '1em'
        },
        lootList: {
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '10px',
            alignItems: 'center'
        },
        lootItem: {
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '10px 20px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            justifyContent: 'center'
        },
        button: {
            padding: '15px 40px',
            fontSize: '1.2em',
            backgroundColor: 'var(--color-gold, #ffd700)',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            textTransform: 'uppercase' as const,
            transition: 'transform 0.2s, box-shadow 0.2s',
            boxShadow: '0 0 20px rgba(255, 215, 0, 0.3)'
        },
        levelUp: {
            color: 'var(--color-neon-blue, #00ffff)',
            fontSize: '1.2em',
            fontWeight: 'bold',
            marginTop: '10px',
            animation: 'pulse 1s infinite'
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.container}>
                <h1 style={styles.title}>VITÓRIA</h1>

                {newLevel && (
                    <div style={styles.levelUp}>
                        SUBIU PARA O NÍVEL {newLevel}!
                    </div>
                )}

                <div style={styles.statsRow}>
                    <div style={styles.statItem}>
                        <span style={{ ...styles.statValue, color: '#aaa' }}>+{xpGained}</span>
                        <span style={styles.label}>XP Ganho</span>
                    </div>
                    <div style={styles.statItem}>
                        <span style={{ ...styles.statValue, color: '#e8c734' }}>+{goldGained}</span>
                        <span style={styles.label}>Ouro</span>
                    </div>
                </div>

                {drops.length > 0 && (
                    <div style={styles.lootContainer}>
                        <div style={styles.lootTitle}>ITENS OBTIDOS</div>
                        <div style={styles.lootList}>
                            {drops.map((drop, idx) => (
                                <div key={idx} style={styles.lootItem}>
                                    <span>📦</span>
                                    <span style={{ color: '#fff' }}>{drop.quantity}x {drop.itemName}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    style={styles.button}
                    onClick={onContinue}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 215, 0, 0.5)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.3)';
                    }}
                >
                    Continuar
                </button>
            </div>
        </div>
    );
}
