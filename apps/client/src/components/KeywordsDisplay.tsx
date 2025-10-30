import React from 'react';
import type { KeywordData } from '../../../server/src/game/types/socket-with-auth.type';

interface KeywordsDisplayProps {
  keywords: KeywordData[];
  onClose: () => void; // Nova prop para fechar o modal
}

export function KeywordsDisplay({ keywords, onClose }: KeywordsDisplayProps) {
  if (!keywords || keywords.length === 0) {
    return (
      <div style={styles.container} className="theme-renegade data-overlay modal-enter-animation">
        <button onClick={onClose} style={styles.closeButton}>
          ❌ Fechar
        </button>
        <h4 style={styles.header}>KEYWORDS DO ECO</h4>
        <p style={styles.emptyMessage}>
          Nenhuma Keyword do Eco desperta ainda.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container} className="theme-renegade data-overlay modal-enter-animation">
      <button onClick={onClose} style={styles.closeButton}>
        ❌ Fechar
      </button>
      <h4 style={styles.header}>
        KEYWORDS DO ECO
      </h4>
      <ul style={styles.keywordList}>
        {keywords.map((kw) => (
          <li key={kw.id} style={styles.keywordItem}>
            <strong style={styles.keywordName}>[{kw.name}]</strong>
            <p style={styles.keywordDescription}>
              {kw.description}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Estilos atualizados para modal
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 1000,
    maxHeight: '80vh',
    width: '90%',
    maxWidth: '500px',
    overflowY: 'auto',
    border: '1px solid var(--color-border)',
    padding: '25px',
    backgroundColor: 'var(--color-citadel-primary)',
    borderRadius: '8px',
    boxShadow: '0 0 30px var(--color-renegade-glow)'
  },
  header: {
    color: 'var(--color-renegade-cyan)',
    fontFamily: 'var(--font-display)',
    textShadow: '0 0 10px var(--color-renegade-cyan)',
    marginBottom: '20px',
    textAlign: 'center',
    fontSize: '1.4em',
    borderBottom: '2px solid var(--color-renegade-cyan)',
    paddingBottom: '12px'
  },
  closeButton: {
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
    transition: 'all 0.3s ease',
  },
  emptyMessage: {
    color: 'var(--color-citadel-text)',
    fontStyle: 'italic',
    opacity: 0.7,
    textAlign: 'center',
    padding: '40px 20px',
    fontSize: '1.1em'
  },
  keywordList: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },
  keywordItem: {
    marginBottom: '15px',
    padding: '15px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: '6px',
    border: '1px solid var(--color-renegade-purple)',
    transition: 'all 0.3s ease'
  },
  keywordName: {
    color: 'var(--color-renegade-magenta)',
    fontSize: '1.1em',
    textShadow: '0 0 8px var(--color-renegade-magenta)',
    display: 'block',
    marginBottom: '8px'
  },
  keywordDescription: {
    fontSize: '0.9em',
    margin: '5px 0 0 0',
    color: 'var(--color-citadel-text)',
    lineHeight: '1.4',
    opacity: 0.9
  }
};