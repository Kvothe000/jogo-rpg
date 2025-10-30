import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

// Este tipo deve corresponder ao 'CharacterAttribute' no backend
// (apps/server/src/character-stats/character-stats.service.ts)
type CharacterAttribute =
  | 'strength'
  | 'dexterity'
  | 'intelligence'
  | 'constitution';

interface CharacterStatsDisplayProps {
  onClose: () => void; // Função para fechar o modal/display
}

export function CharacterStatsDisplay({
  onClose,
}: CharacterStatsDisplayProps) {
  const { user } = useAuth();
  const { socket } = useSocket();

  const character = user?.character;

  if (!character) {
    // Mantém um estilo básico se o personagem não carregou
    return (
      <div style={styles.container} className="theme-renegade data-overlay modal-enter-animation">
        <p>Carregando dados do personagem...</p>
        <button onClick={onClose} style={styles.closeButton}>
          Fechar
        </button>
      </div>
    );
  }

  const handleSpendPoint = (attribute: CharacterAttribute) => {
    if (!socket || character.attributePoints <= 0) return;

    console.log(`[StatsDisplay] Emitindo spendAttributePoint para ${attribute}`);
    socket.emit('spendAttributePoint', { attribute: attribute });
  };

  const hasPoints = character.attributePoints > 0;

  return (
    // Aplica as classes atualizadas para tema renegade e animação
    <div
      style={styles.container}
      className="theme-renegade data-overlay modal-enter-animation" // Adiciona animação e tema
    >
      <button onClick={onClose} style={styles.closeButton} className="citadel">
        ❌ Fechar
      </button>
      <h3 style={styles.title}>ATRIBUTOS</h3>
      <div style={styles.pointsDisplay}>
        Pontos Disponíveis:{' '}
        <span style={styles.pointsValue}>{character.attributePoints}</span>
      </div>

      <ul style={styles.statList}>
        {/* Força */}
        <li style={styles.statItem}>
          <span style={styles.statName}>💪 FOR</span>
          <span style={styles.statValue}>{character.strength}</span>
          {hasPoints && (
            <button
              style={styles.plusButton}
              className="renegade" // Usa a classe para estilo
              onClick={() => handleSpendPoint('strength')}
              title="Aumentar Força"
            >
              +
            </button>
          )}
        </li>
        {/* Destreza */}
        <li style={styles.statItem}>
          <span style={styles.statName}>🎯 DES</span>
          <span style={styles.statValue}>{character.dexterity}</span>
          {hasPoints && (
            <button
              style={styles.plusButton}
              className="renegade"
              onClick={() => handleSpendPoint('dexterity')}
              title="Aumentar Destreza"
            >
              +
            </button>
          )}
        </li>
        {/* Inteligência */}
        <li style={styles.statItem}>
          <span style={styles.statName}>🧠 INT</span>
          <span style={styles.statValue}>{character.intelligence}</span>
          {hasPoints && (
            <button
              style={styles.plusButton}
              className="renegade"
              onClick={() => handleSpendPoint('intelligence')}
              title="Aumentar Inteligência"
            >
              +
            </button>
          )}
        </li>
        {/* Constituição */}
        <li style={styles.statItem}>
          <span style={styles.statName}>🛡️ CON</span>
          <span style={styles.statValue}>{character.constitution}</span>
          {hasPoints && (
            <button
              style={styles.plusButton}
              className="renegade"
              onClick={() => handleSpendPoint('constitution')}
              title="Aumentar Constituição"
            >
              +
            </button>
          )}
        </li>
      </ul>
      <p style={styles.hint}>
        CON aumenta HP Máx. INT aumenta Eco Máx.
      </p>
    </div>
  );
}

// Estilos atualizados usando CSS Variables do index.css
const styles: Record<string, React.CSSProperties> = {
  container: {
    // Posição fixa para modal sobreposto
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 1000,
    width: '90%',
    maxWidth: '450px',
    maxHeight: '80vh',
    backgroundColor: 'var(--color-citadel-primary)',
    border: '1px solid var(--color-border)',
    boxShadow: '0 0 30px var(--color-renegade-glow)',
    color: 'var(--color-citadel-text)',
    fontFamily: 'var(--font-main)',
    padding: '25px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflowY: 'auto',
  },
  title: {
    textAlign: 'center',
    margin: '0 0 10px 0',
    fontFamily: 'var(--font-display)',
    color: 'var(--color-renegade-cyan)',
    textShadow: '0 0 10px var(--color-renegade-cyan)',
    fontSize: '1.4em',
    borderBottom: '2px solid var(--color-renegade-cyan)',
    paddingBottom: '10px',
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
  pointsDisplay: {
    textAlign: 'center',
    fontSize: '1.2em',
    color: 'var(--color-citadel-text)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: '12px',
    borderRadius: '6px',
    border: '1px dashed var(--color-border)',
    fontWeight: 'bold',
  },
  pointsValue: {
    fontWeight: 'bold',
    color: 'var(--color-success)',
    marginLeft: '10px',
    fontSize: '1.4em',
    textShadow: '0 0 8px var(--color-success)',
  },
  statList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 15px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: '6px',
    transition: 'all 0.3s ease',
  },
  statName: {
    fontWeight: 'bold',
    color: 'var(--color-citadel-text)',
    flexBasis: '30%',
    fontSize: '1em',
  },
  statValue: {
    fontSize: '1.3em',
    color: 'var(--color-warning)',
    flexBasis: '30%',
    textAlign: 'center',
    fontWeight: 'bold',
    textShadow: '0 0 5px var(--color-warning)',
  },
  plusButton: {
    width: '32px',
    height: '32px',
    lineHeight: '30px',
    padding: 0,
    fontSize: '1.2em',
    cursor: 'pointer',
    borderRadius: '50%',
    textAlign: 'center',
    border: 'none',
    transition: 'all 0.3s ease',
  },
  hint: {
    fontSize: '0.9em',
    textAlign: 'center',
    color: 'var(--color-citadel-text)',
    opacity: 0.8,
    margin: '10px 0 0 0',
    fontStyle: 'italic',
    padding: '10px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: '4px',
  },
};