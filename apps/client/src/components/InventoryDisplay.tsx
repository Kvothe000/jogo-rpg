import React from 'react';
import type { InventorySlotData } from '../../../server/src/game/types/socket-with-auth.type';
import { useSocket } from '../contexts/SocketContext';

interface InventoryDisplayProps {
  slots: InventorySlotData[];
}

export function InventoryDisplay({ slots }: InventoryDisplayProps) {
  const { socket } = useSocket();

  if (!slots || slots.length === 0) {
    return (
      <p style={{ 
        color: 'var(--color-citadel-text)',
        fontStyle: 'italic',
        opacity: 0.7,
        textAlign: 'center',
        padding: '20px'
      }}>
        Inventário vazio.
      </p>
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
    <div style={{ 
      maxHeight: '400px', 
      overflowY: 'auto', 
      border: '1px solid var(--color-border)', 
      padding: '15px',
      backgroundColor: 'var(--color-citadel-primary)',
      borderRadius: '4px',
      boxShadow: '0 0 15px var(--color-citadel-glow)'
    }}>
      <h4 style={{
        color: 'var(--color-renegade-cyan)',
        fontFamily: 'var(--font-display)',
        textShadow: '0 0 5px var(--color-renegade-cyan)',
        marginBottom: '15px',
        textAlign: 'center'
      }}>
        INVENTÁRIO
      </h4>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {slots.map((slot) => (
          <li key={slot.slotId} style={{ 
            marginBottom: '12px', 
            borderBottom: '1px dashed var(--color-border)', 
            paddingBottom: '10px',
            padding: '10px',
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '4px'
          }}>
            <div>
              <span style={{ 
                fontWeight: 'bold',
                color: 'var(--color-citadel-text)',
                fontSize: '0.95em'
              }}>{slot.itemName}</span>
              <span style={{ 
                color: 'var(--color-warning)',
                marginLeft: '8px'
              }}> (x{slot.quantity})</span>
              {slot.isEquipped && (
                <span style={{ 
                  marginLeft: '10px', 
                  color: 'var(--color-success)', 
                  fontSize: '0.8em',
                  fontWeight: 'bold'
                }}>
                  ⚡ EQUIPADO - {slot.itemSlot}
                </span>
              )}

              {/* Botão Equipar/Desequipar para Equipamentos */}
              {slot.itemType === 'EQUIPMENT' && slot.itemSlot && (
                <button
                  onClick={() => handleEquipToggle(slot.slotId, slot.isEquipped)}
                  style={{
                    marginLeft: '15px',
                    padding: '5px 10px',
                    fontSize: '0.75em',
                    cursor: 'pointer',
                    background: slot.isEquipped ? 
                      'linear-gradient(135deg, var(--color-citadel-secondary) 0%, var(--color-citadel-accent) 100%)' : 
                      'linear-gradient(135deg, var(--color-renegade-purple) 0%, var(--color-renegade-magenta) 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    fontFamily: 'var(--font-main)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 10px var(--color-renegade-magenta)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
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
                    marginLeft: '15px',
                    padding: '5px 10px',
                    fontSize: '0.75em',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, var(--color-success) 0%, #8fbc8f 100%)',
                    color: 'black',
                    border: 'none',
                    borderRadius: '3px',
                    fontFamily: 'var(--font-main)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => { 
                    e.currentTarget.style.boxShadow = '0 0 10px var(--color-success)'; 
                  }}
                  onMouseOut={(e) => { 
                    e.currentTarget.style.boxShadow = 'none'; 
                  }}
                >
                  🧪 Usar
                </button>
              )}
            </div>
            <p style={{ 
              fontSize: '0.8em', 
              margin: '5px 0 0 0', 
              color: 'var(--color-citadel-text)',
              opacity: 0.8,
              lineHeight: '1.3'
            }}>
              {slot.itemDescription}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}