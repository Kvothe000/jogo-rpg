import React from 'react';
import type { InventorySlotData } from '../../../server/src/game/types/socket-with-auth.type';
import { useSocket } from '../contexts/SocketContext';

interface InventoryDisplayProps {
  slots: InventorySlotData[];
  onClose: () => void; // ADICIONADO
}

export function InventoryDisplay({ slots, onClose }: InventoryDisplayProps) { // ADICIONADO
  const { socket } = useSocket();

  // Estilos atualizados para o modal
  const styles = {
    container: {
      position: 'fixed' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 1000,
      maxHeight: '80vh',
      width: '90%',
      maxWidth: '600px',
      overflowY: 'auto' as const,
      border: '1px solid var(--color-border)',
      padding: '20px',
      backgroundColor: 'var(--color-citadel-primary)',
      borderRadius: '8px',
      boxShadow: '0 0 30px var(--color-renegade-glow)',
    },
    header: {
      color: 'var(--color-renegade-cyan)',
      fontFamily: 'var(--font-display)',
      textShadow: '0 0 8px var(--color-renegade-cyan)',
      marginBottom: '20px',
      textAlign: 'center' as const,
      fontSize: '1.4em',
      borderBottom: '2px solid var(--color-renegade-cyan)',
      paddingBottom: '10px'
    },
    emptyMessage: {
      color: 'var(--color-citadel-text)',
      fontStyle: 'italic',
      opacity: 0.7,
      textAlign: 'center' as const,
      padding: '40px 20px',
      fontSize: '1.1em'
    },
    itemList: {
      listStyle: 'none',
      padding: 0,
      margin: 0
    },
    item: {
      marginBottom: '15px',
      borderBottom: '1px dashed var(--color-border)',
      padding: '15px',
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: '6px',
      transition: 'all 0.3s ease'
    },
    itemName: {
      fontWeight: 'bold',
      color: 'var(--color-citadel-text)',
      fontSize: '1em',
      display: 'block',
      marginBottom: '5px'
    },
    quantity: {
      color: 'var(--color-warning)',
      marginLeft: '8px',
      fontSize: '0.9em'
    },
    equipped: {
      marginLeft: '10px',
      color: 'var(--color-success)',
      fontSize: '0.8em',
      fontWeight: 'bold'
    },
    description: {
      fontSize: '0.85em',
      margin: '8px 0 0 0',
      color: 'var(--color-citadel-text)',
      opacity: 0.9,
      lineHeight: '1.4'
    },
    equipButton: {
      marginLeft: '15px',
      padding: '6px 12px',
      fontSize: '0.8em',
      cursor: 'pointer',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontFamily: 'var(--font-main)',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
    },
    useButton: {
      marginLeft: '15px',
      padding: '6px 12px',
      fontSize: '0.8em',
      cursor: 'pointer',
      color: 'black',
      border: 'none',
      borderRadius: '4px',
      fontFamily: 'var(--font-main)',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
    },
    closeButton: {
      position: 'absolute' as const,
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
    }
  };

  if (!slots || slots.length === 0) {
    return (
      <div style={styles.container} className="theme-renegade data-overlay modal-enter-animation">
        <button onClick={onClose} style={styles.closeButton}>
          ❌ Fechar
        </button>
        <h4 style={styles.header}>INVENTÁRIO</h4>
        <p style={styles.emptyMessage}>
          Inventário vazio.
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
    <div style={styles.container} className="theme-renegade data-overlay modal-enter-animation">
      <button onClick={onClose} style={styles.closeButton}>
        ❌ Fechar
      </button>
      <h4 style={styles.header}>
        INVENTÁRIO
      </h4>
      <ul style={styles.itemList}>
        {slots.map((slot) => (
          <li key={slot.slotId} style={styles.item}>
            <div>
              <span style={styles.itemName}>{slot.itemName}</span>
              <span style={styles.quantity}> (x{slot.quantity})</span>
              {slot.isEquipped && (
                <span style={styles.equipped}>
                  ⚡ EQUIPADO - {slot.itemSlot}
                </span>
              )}

              {/* Botão Equipar/Desequipar para Equipamentos */}
              {slot.itemType === 'EQUIPMENT' && slot.itemSlot && (
                <button
                  onClick={() => handleEquipToggle(slot.slotId, slot.isEquipped)}
                  style={{
                    ...styles.equipButton,
                    background: slot.isEquipped ? 
                      'linear-gradient(135deg, var(--color-citadel-secondary) 0%, var(--color-citadel-accent) 100%)' : 
                      'linear-gradient(135deg, var(--color-renegade-purple) 0%, var(--color-renegade-magenta) 100%)',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 15px var(--color-renegade-magenta)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {slot.isEquipped ? '❌ Desequipar' : '⚡ Equipar'}
                </button>
              )}

              {/* Botão Usar para Consumíveis */}
              {slot.itemType === 'CONSUMABLE' && (
                <button
                  onClick={() => handleUseItem(slot.slotId)}
                  style={{
                    ...styles.useButton,
                    background: 'linear-gradient(135deg, var(--color-success) 0%, #8fbc8f 100%)',
                  }}
                  onMouseOver={(e) => { 
                    e.currentTarget.style.boxShadow = '0 0 15px var(--color-success)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => { 
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  🧪 Usar
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