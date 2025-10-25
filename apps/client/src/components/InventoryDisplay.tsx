// Importar o tipo que definimos
import type { InventorySlotData } from '../../../server/src/game/types/socket-with-auth.type'; // <-- Ajuste o path se necessário

interface InventoryDisplayProps {
  slots: InventorySlotData[];
}

export function InventoryDisplay({ slots }: InventoryDisplayProps) {
  if (slots.length === 0) {
    return <p>Inventário vazio.</p>;
  }

  return (
    <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px' }}>
      <h4>Inventário</h4>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {slots.map((slot) => (
          <li key={slot.slotId} style={{ marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
            <span style={{ fontWeight: 'bold' }}>{slot.itemName}</span>
            <span> (x{slot.quantity})</span>
            {slot.isEquipped && <span style={{ marginLeft: '10px', color: 'green', fontSize: '0.8em' }}>(Equipado)</span>}
            <p style={{ fontSize: '0.8em', margin: '2px 0 0 0', color: '#555' }}>{slot.itemDescription}</p>
            {/* Futuro: Botões de Equipar/Usar/Largar */}
          </li>
        ))}
      </ul>
    </div>
  );
}