import React, { useEffect, useState } from 'react';
import type { DialogueOption } from '../../../server/src/game/types/socket-with-auth.type';
import { useSocket } from '../contexts/SocketContext';

interface PrologueDisplayProps {
  scene: string;
  step: string; // Adicionado para controle de tema
  message?: string;
  dialogueOptions?: DialogueOption[];
  targetId?: string;
}

export function PrologueDisplay({
  step,
  message,
  dialogueOptions,
  targetId,
}: PrologueDisplayProps) {
  const { socket } = useSocket();
  const [isInteracting, setIsInteracting] = useState(false);

  const handleInteract = () => {
    if (socket && targetId) {
      setIsInteracting(true);
      // Simula tempo de interação
      const delay = step === 'SCENE_1_INTRO' ? 1500 : 0;

      setTimeout(() => {
        console.log(`[PrologueDisplay] Emitindo prologueInteract: ${targetId}`);
        socket.emit('prologueInteract', { targetId });
        setIsInteracting(false);
      }, delay);
    }
  };

  const handleChoice = (choiceId: string) => {
    if (socket) {
      console.log(`[PrologueDisplay] Emitindo prologueChoice: ${choiceId}`);
      socket.emit('prologueChoice', { choiceId });
    }
  };

  // Determina o tema com base no passo
  const getThemeClass = () => {
    if (step.includes('GLITCH') || step === 'SCENE_3_ESCAPE_START') return 'theme-renegade ui-glitch-transition';
    if (step.includes('SCENE_2')) return 'theme-dark';
    return 'theme-citadel';
  };

  const themeClass = getThemeClass();
  const isGlitch = step.includes('GLITCH');

  return (
    <div style={styles.container} className={`${themeClass} data-overlay simple-fade-in`}>
      <div style={{
        ...styles.messageBox,
        borderColor: isGlitch ? 'var(--color-renegade-magenta)' : 'var(--current-accent)',
        boxShadow: isGlitch ? '0 0 20px var(--color-renegade-magenta)' : '0 0 20px var(--current-glow)'
      }}>
        {/* Título da Tarefa / Alerta */}
        <div style={styles.header}>
          {step === 'SCENE_1_INTRO' && <span style={{ color: 'var(--color-citadel-cyan)' }}>Otimização de Dados 7-Alfa</span>}
          {step === 'SCENE_1_GLITCH' && <span className="glitch-text" data-text="ERRO FATAL" style={{ color: 'red' }}>⚠️ ERRO DE SISTEMA ⚠️</span>}
          {step.includes('SCENE_2') && <span style={{ color: 'var(--color-renegade-purple)' }}>Conexão Criptografada</span>}
        </div>

        {/* Mensagem Principal */}
        {message && (
          <p
            style={{
              ...styles.messageText,
              color: isGlitch ? 'var(--color-renegade-cyan)' : 'var(--color-text)',
              fontFamily: isGlitch ? 'monospace' : 'var(--font-main)'
            }}
          >
            {message}
          </p>
        )}

        {/* Botão de Interação */}
        {targetId && !dialogueOptions && (
          <div style={styles.actionContainer}>
            <button
              onClick={handleInteract}
              disabled={isInteracting}
              style={{
                ...styles.interactButton,
                backgroundColor: isInteracting ? 'gray' : undefined
              }}
              className={themeClass.includes('citadel') ? 'citadel' : 'renegade'}
            >
              {isInteracting ? (
                step === 'SCENE_1_INTRO' ? 'Calibrando...' : 'Processando...'
              ) : (
                `Interagir com ${targetId.replace(/_/g, ' ').toUpperCase()}`
              )}
            </button>
            {/* Barra de Progresso Simples se interagindo */}
            {isInteracting && step === 'SCENE_1_INTRO' && (
              <div style={{ width: '200px', height: '4px', background: '#333', margin: '10px auto', borderRadius: '2px' }}>
                <div style={{ height: '100%', background: 'var(--color-citadel-glow)', animation: 'progressFill 1.5s linear forwards' }} />
              </div>
            )}
          </div>
        )}

        {/* Opções de Diálogo */}
        {dialogueOptions && dialogueOptions.length > 0 && (
          <div style={styles.optionsContainer}>
            {dialogueOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleChoice(option.id)}
                style={{
                  ...styles.optionButton,
                  ...(step === 'SCENE_4_KEYWORD_SELECT' ? styles.keywordOption : {})
                }}
                className={themeClass.includes('citadel') ? 'citadel' : 'renegade'}
              >
                {step === 'SCENE_4_KEYWORD_SELECT' ? (
                  <>
                    <span style={{ fontWeight: 'bold', color: 'var(--color-renegade-cyan)', marginRight: '10px' }}>
                      [{option.id}]
                    </span>
                    {option.text.replace(/\[.*?\]\s*/, '')}
                  </>
                ) : (
                  option.text
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <style>{`
          @keyframes progressFill {
              from { width: 0%; }
              to { width: 100%; }
          }
      `}</style>
    </div>
  );
}

// Estilos
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 20000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(5px)',
  },
  messageBox: {
    width: 'clamp(300px, 80%, 700px)',
    backgroundColor: 'var(--color-background)', // Usa fundo global para permitir transparência do tema
    border: '2px solid var(--current-accent)',
    padding: '40px',
    borderRadius: '4px',
    fontFamily: 'var(--font-main)',
    color: 'var(--color-text)',
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    marginBottom: '20px',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    fontSize: '0.9em',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '10px',
    textAlign: 'center',
    fontFamily: 'var(--font-display)',
  },
  messageText: {
    fontSize: '1.3rem',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    textAlign: 'center',
    marginBottom: '40px',
    minHeight: '60px', // Evita pulo de layout enquanto digita
  },
  actionContainer: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  interactButton: {
    padding: '15px 30px',
    fontSize: '1.1rem',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    border: '1px solid',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    alignSelf: 'center',
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  optionButton: {
    padding: '15px 20px',
    fontSize: '1rem',
    fontFamily: 'var(--font-main)',
    cursor: 'pointer',
    border: '1px solid var(--color-border)',
    textAlign: 'left',
    transition: 'transform 0.2s',
  },
  keywordOption: {
    border: '1px solid var(--color-renegade-cyan)',
    background: 'rgba(0, 20, 40, 0.8)',
    padding: '20px',
    fontSize: '1.2rem',
  }
};