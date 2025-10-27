// Importar o tipo InventorySlotData do backend (verifique o path)
import type { InventorySlotData } from '../../../server/src/game/types/socket-with-auth.type';
// 1. IMPORTE o hook useSocket
import { useSocket } from '../contexts/SocketContext';

interface InventoryDisplayProps {
  slots: InventorySlotData[];
}

export function InventoryDisplay({ slots }: InventoryDisplayProps) {
  // 2. PEGUE o socket do contexto
  const { socket } = useSocket();

  if (!slots || slots.length === 0) { // Adiciona verificação para slots undefined
    return <p>Inventário vazio.</p>;
  }

  // 3. CRIE a função handler para o clique no botão
  const handleEquipToggle = (slotId: string, isCurrentlyEquipped: boolean) => {
    if (!socket) {
      console.error("Socket não conectado, impossível equipar/desequipar.");
      alert("Erro de conexão. Tente novamente.");
      return;
    }

    if (isCurrentlyEquipped) {
      // Se está equipado, emite evento para desequipar
      console.log(`[InventoryDisplay] Emitindo unequipItem para slot ${slotId}`);
      socket.emit('unequipItem', { slotId: slotId });
    } else {
      // Se está desequipado, emite evento para equipar
      console.log(`[InventoryDisplay] Emitindo equipItem para slot ${slotId}`);
      socket.emit('equipItem', { slotId: slotId });
    }
  };

  return (
    <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px' }}>
      <h4>Inventário</h4>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {slots.map((slot) => (
          <li key={slot.slotId} style={{ marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
            <div> {/* Envolve em div para melhor layout */}
              <span style={{ fontWeight: 'bold' }}>{slot.itemName}</span>
              <span> (x{slot.quantity})</span>
              {slot.isEquipped && <span style={{ marginLeft: '10px', color: 'green', fontSize: '0.8em' }}>(Equipado - {slot.itemSlot})</span>}

              {/* 4. ADICIONE O BOTÃO CONDICIONAL */}
              {slot.itemType === 'EQUIPMENT' && slot.itemSlot && ( // Mostra botão apenas para itens equipáveis com slot definido
                <button
                  onClick={() => handleEquipToggle(slot.slotId, slot.isEquipped)}
                  style={{
                    marginLeft: '15px',
                    padding: '3px 8px',
                    fontSize: '0.8em',
                    cursor: 'pointer',
                    background: slot.isEquipped ? 'grey' : 'lightgreen', // Cor diferente se equipado
                    border: '1px solid #ccc',
                    borderRadius: '3px'
                  }}
                >
                  {slot.isEquipped ? 'Desequipar' : 'Equipar'}
                </button>
              )}
            </div>
            <p style={{ fontSize: '0.8em', margin: '2px 0 0 0', color: '#555' }}>{slot.itemDescription}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}