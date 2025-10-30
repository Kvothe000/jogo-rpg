import React from 'react';
import type { DialogueOption } from '../../../server/src/game/types/socket-with-auth.type';
import { useSocket } from '../contexts/SocketContext';

interface PrologueDisplayProps {
  scene: string;
  message?: string;
  dialogueOptions?: DialogueOption[];
  targetId?: string;
}

export function PrologueDisplay({
  message,
  dialogueOptions,
  targetId,
}: PrologueDisplayProps) {
  const { socket } = useSocket();

  const handleInteract = () => {
    if (socket && targetId) {
      console.log(`[PrologueDisplay] Emitindo prologueInteract: ${targetId}`);
      socket.emit('prologueInteract', { targetId });
    }
  };

  const handleChoice = (choiceId: string) => {
    if (socket) {
      console.log(`[PrologueDisplay] Emitindo prologueChoice: ${choiceId}`);
      socket.emit('prologueChoice', { choiceId });
    }
  };

  return (
    <div style={styles.container} className="theme-citadel data-overlay simple-fade-in">
      <div style={styles.messageBox}>
        {/* Mensagem Principal (Instrução ou Diálogo) */}
        {message && (
          <p
            style={styles.messageText}
            dangerouslySetInnerHTML={{ __html: message }}
          />
        )}

        {/* Botão de Interação (para Cena 1) */}
        {targetId && !dialogueOptions && (
          <div style={styles.actionContainer}>
            <button
              onClick={handleInteract}
              style={styles.interactButton}
              className="citadel"
            >
              Interagir com {targetId.replace(/_/g, ' ')}
            </button>
          </div>
        )}

        {/* Opções de Diálogo (para Cenas futuras) */}
        {dialogueOptions && dialogueOptions.length > 0 && (
          <div style={styles.optionsContainer}>
            {dialogueOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleChoice(option.id)}
                style={styles.optionButton}
                className="citadel"
              >
                {option.text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Estilos para o display do prólogo
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 200, // Por cima de tudo, exceto talvez modais
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Escurece o fundo
  },
  messageBox: {
    width: 'clamp(300px, 80%, 700px)',
    backgroundColor: 'var(--color-citadel-primary)',
    border: '1px solid var(--color-citadel-glow)',
    boxShadow: '0 0 20px var(--color-citadel-glow)',
    padding: '30px',
    borderRadius: '8px',
    fontFamily: 'var(--font-main)',
    color: 'var(--color-citadel-text)',
  },
  messageText: {
    fontSize: '1.2rem',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    textAlign: 'center',
    marginBottom: '30px',
  },
  actionContainer: {
    textAlign: 'center',
  },
  interactButton: {
    padding: '12px 20px',
    fontSize: '1rem',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    border: 'none',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  optionButton: {
    padding: '12px 20px',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-main)',
    cursor: 'pointer',
    border: '1px solid var(--color-border)',
    textAlign: 'left',
  },
};