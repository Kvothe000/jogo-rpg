import React from 'react';

interface DeathScreenProps {
    onRespawn: () => void;
}

export function DeathScreen({ onRespawn }: DeathScreenProps) {
    const styles = {
        overlay: {
            position: 'fixed' as const,
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#000',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            justifyContent: 'center',
            color: 'red',
            fontFamily: 'var(--font-mono)',
        },
        glitchText: {
            fontSize: '4em',
            fontWeight: 'bold',
            textShadow: '2px 2px 0px #0ff, -2px -2px 0px #f00',
            animation: 'glitch-skew 1s infinite linear alternate-reverse',
            marginBottom: '20px',
        },
        message: {
            fontSize: '1.2em',
            marginBottom: '40px',
            color: '#fff',
            textAlign: 'center' as const,
            maxWidth: '600px',
        },
        respawnButton: {
            padding: '15px 30px',
            fontSize: '1.2em',
            backgroundColor: 'transparent',
            border: '2px solid red',
            color: 'red',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase' as const,
            transition: 'all 0.2s',
            animation: 'pulse 2s infinite',
        }
    };

    return (
        <div style={styles.overlay}>
            <div className="noise-overlay"></div>
            <h1 style={styles.glitchText}>FALHA CRÍTICA</h1>
            <p style={styles.message}>
                SINAL VITAL PERDIDO. SISTEMAS COMPROMETIDOS.<br />
                INICIANDO PROTOCOLO DE RECONSTRUÇÃO...
            </p>
            <button
                style={styles.respawnButton}
                onClick={onRespawn}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'red';
                    e.currentTarget.style.color = 'black';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'red';
                }}
            >
                REINICIALIZAR SISTEMA
            </button>
        </div>
    );
}
