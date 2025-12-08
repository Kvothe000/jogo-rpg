import React, { useEffect, useState } from 'react';
import { useAudio } from '../contexts/AudioContext';

interface LevelUpOverlayProps {
    level: number;
    onClose: () => void;
}

export function LevelUpOverlay({ level, onClose }: LevelUpOverlayProps) {
    const { playSfx } = useAudio();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Animation delay
        setTimeout(() => setVisible(true), 100);
        playSfx('success'); // Assuming we add a success sound, or fall back to generic
    }, [playSfx]);

    const styles = {
        overlay: {
            position: 'fixed' as const,
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 9998,
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-display)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.5s ease-in',
        },
        container: {
            border: '2px solid var(--color-warning)',
            padding: '40px',
            backgroundColor: 'rgba(20, 20, 0, 0.9)',
            boxShadow: '0 0 50px rgba(255, 200, 0, 0.3)',
            transform: visible ? 'scale(1)' : 'scale(0.8)',
            transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            textAlign: 'center' as const,
            position: 'relative' as const,
        },
        title: {
            fontSize: '3em',
            color: 'var(--color-warning)',
            marginBottom: '10px',
            textShadow: '0 0 10px var(--color-warning)',
        },
        levelText: {
            fontSize: '1.5em',
            color: '#fff',
            marginBottom: '30px',
        },
        button: {
            padding: '10px 20px',
            backgroundColor: 'var(--color-warning)',
            color: '#000',
            border: 'none',
            fontSize: '1.2em',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.container}>
                <div style={styles.title}>UPGRADE DE SISTEMA</div>
                <div style={styles.levelText}>
                    NÍVEL {level} ALCANÇADO
                </div>
                <div style={{ marginBottom: '20px', color: '#aaa', fontSize: '0.9em' }}>
                    + PONTOS DE ATRIBUTO DISPONÍVEIS
                </div>
                <button
                    style={styles.button}
                    onClick={onClose}
                >
                    CONFIRMAR
                </button>
            </div>
        </div>
    );
}
