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
      <div style={styles.container}>
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
    // Aplica a classe de tema para herdar estilos se necessário
    <div style={styles.container} className="theme-citadel data-overlay">
      <button onClick={onClose} style={styles.closeButton} className="citadel">
        ❌ Fechar
      </button>
      <h3 style={styles.title}>Atributos</h3>
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
    // Posição ajustada para sobrepor
    position: 'absolute', // Ou 'fixed' se preferir cobrir a tela toda
    top: '15%', // Ajuste conforme necessário
    left: '50%',
    transform: 'translateX(-50%)', // Centraliza horizontalmente
    width: 'clamp(300px, 80%, 450px)', // Largura responsiva
    backgroundColor: 'var(--color-citadel-primary)',
    border: '1px solid var(--color-border)',
    boxShadow: '0 0 20px var(--color-citadel-glow)',
    color: 'var(--color-citadel-text)',
    fontFamily: 'var(--font-main)',
    padding: '20px',
    borderRadius: '4px',
    zIndex: 100, // Garante que fica por cima
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  title: {
    textAlign: 'center',
    margin: '0 0 10px 0',
    fontFamily: 'var(--font-display)', // Fonte de display
    color: 'var(--color-renegade-cyan)', // Cor neon
    textShadow: '0 0 8px var(--color-renegade-cyan)', // Glow
    fontSize: '1.2em',
  },
  closeButton: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    // Usa estilos de botão do index.css (classe 'citadel')
    padding: '4px 8px',
    fontSize: '0.7em',
    cursor: 'pointer',
    border: '1px solid var(--color-danger)', // Borda vermelha para fechar
    color: 'var(--color-danger)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  pointsDisplay: {
    textAlign: 'center',
    fontSize: '1.1em',
    color: 'var(--color-citadel-text)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: '8px',
    borderRadius: '4px',
    border: '1px dashed var(--color-border)',
  },
  pointsValue: { // Estilo específico para o número de pontos
    fontWeight: 'bold',
    color: 'var(--color-success)', // Verde para pontos disponíveis
    marginLeft: '10px',
    fontSize: '1.3em',
    textShadow: '0 0 5px var(--color-success)',
  },
  statList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px', // Espaçamento menor
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: '4px',
  },
  statName: {
    fontWeight: 'bold',
    color: 'var(--color-citadel-text)',
    flexBasis: '30%', // Define uma base para o nome
    fontSize: '0.9em',
  },
  statValue: {
    fontSize: '1.1em',
    color: 'var(--color-warning)', // Amarelo para valores de stat
    flexBasis: '30%', // Define uma base para o valor
    textAlign: 'center',
    fontWeight: 'bold',
  },
  plusButton: {
    // Usa a classe 'renegade' para o estilo base (gradiente, etc.)
    width: '28px',
    height: '28px',
    lineHeight: '26px', // Ajustar para centralizar o '+'
    padding: 0,
    fontSize: '1.1em',
    cursor: 'pointer',
    borderRadius: '50%', // Botão redondo
    textAlign: 'center',
    // Adiciona sombra no hover via CSS global da classe .renegade
  },
  hint: {
    fontSize: '0.8em',
    textAlign: 'center',
    color: 'var(--color-citadel-text)',
    opacity: 0.7,
    margin: '5px 0 0 0',
    fontStyle: 'italic',
  },
};