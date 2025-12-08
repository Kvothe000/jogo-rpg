import React from 'react';
import type { InventorySlotData } from '../../../server/src/game/types/socket-with-auth.type';
import { useSocket } from '../contexts/SocketContext';

interface InventoryDisplayProps {
  slots: InventorySlotData[];
  onClose: () => void; // ADICIONADO
}

export function InventoryDisplay({ slots, onClose }: InventoryDisplayProps) { // ADICIONADO
  const { socket } = useSocket();

  // Estilos atualizados para o painel embutido (RightPanel)
  const styles = {
    container: {
      width: '100%',
      height: '100%',
      // overflowY: 'auto' as const, // Gerenciado pelo pai
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '10px',
    },
    header: {
      fontSize: '0.9em',
      color: 'var(--color-renegade-cyan)',
      borderBottom: '1px solid var(--color-border)',
      paddingBottom: '5px',
      marginBottom: '10px',
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    emptyMessage: {
      color: 'var(--color-citadel-text)',
      fontStyle: 'italic',
      opacity: 0.7,
      textAlign: 'center' as const,
      padding: '20px 0',
      fontSize: '0.9em'
    },
    itemList: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px'
    },
    item: {
      border: '1px solid rgba(255,255,255,0.05)',
      padding: '8px',
      backgroundColor: 'rgba(0,0,0,0.2)',
      borderRadius: '4px',
    },
    itemName: {
      fontWeight: 'bold',
      color: '#ddd',
      fontSize: '0.9em',
      display: 'block',
      marginBottom: '2px'
    },
    quantity: {
      color: 'var(--color-warning)',
      marginLeft: '5px',
      fontSize: '0.85em'
    },
    equipped: {
      display: 'block',
      marginTop: '2px',
      color: 'var(--color-success)',
      fontSize: '0.75em',
      fontWeight: 'bold'
    },
    description: {
      fontSize: '0.75em',
      margin: '4px 0 0 0',
      color: '#aaa',
      lineHeight: '1.3'
    },
    actionButton: {
      marginTop: '6px',
      width: '100%',
      padding: '4px',
      fontSize: '0.8em',
      cursor: 'pointer',
      border: '1px solid var(--color-border)',
      background: 'rgba(255,255,255,0.05)',
      color: '#fff',
      fontFamily: 'var(--font-mono)',
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

  if (!slots || slots.length === 0) {
    return (
      <div style={styles.container} className="simple-fade-in">
        <div style={styles.header}>
          <span>Inventário</span>
          <button onClick={onClose} style={styles.backButton}> VOLTAR</button>
        </div>
        <p style={styles.emptyMessage}>
          Vazio.
        </p>
      </div>
    );
  }

  const handleEquipToggle = (slotId: string, isCurrentlyEquipped: boolean) => {
    if (!socket) {
      console.error("Socket não conectado, impossível equipar/desequipar.");
      alert("Erro de conexão. Tente novamente.");
      return;
    }

    if (isCurrentlyEquipped) {
      console.log(`[InventoryDisplay] Emitindo unequipItem para slot ${slotId}`);
      socket.emit('unequipItem', { slotId: slotId });
    } else {
      console.log(`[InventoryDisplay] Emitindo equipItem para slot ${slotId}`);
      socket.emit('equipItem', { slotId: slotId });
    }
  };

  const handleUseItem = (slotId: string) => {
    if (!socket) {
      console.error("Socket não conectado, impossível usar item.");
      alert("Erro de conexão. Tente novamente.");
      return;
    }
    console.log(`[InventoryDisplay] Emitindo useItem para slot ${slotId}`);
    socket.emit('useItem', { slotId: slotId });
  };

  return (
    <div style={styles.container} className="simple-fade-in">
      <div style={styles.header}>
        <span>Inventário</span>
        <button onClick={onClose} style={styles.backButton}> VOLTAR</button>
      </div>

      <ul style={styles.itemList}>
        {slots.map((slot) => (
          <li key={slot.slotId} style={styles.item}>
            <div>
              <span style={styles.itemName}>{slot.itemName}</span>
              <span style={styles.quantity}>x{slot.quantity}</span>
              {slot.isEquipped && (
                <span style={styles.equipped}>
                  [EQUIPADO]
                </span>
              )}

              {/* Botão Equipar/Desequipar */}
              {slot.itemType === 'EQUIPMENT' && slot.itemSlot && (
                <button
                  onClick={() => handleEquipToggle(slot.slotId, slot.isEquipped)}
                  style={styles.actionButton}
                >
                  {slot.isEquipped ? 'Desequipar' : 'Equipar'}
                </button>
              )}

              {/* Botão Usar */}
              {slot.itemType === 'CONSUMABLE' && (
                <button
                  onClick={() => handleUseItem(slot.slotId)}
                  style={styles.actionButton}
                >
                  Usar
                </button>
              )}
            </div>
            <p style={styles.description}>
              {slot.itemDescription}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}