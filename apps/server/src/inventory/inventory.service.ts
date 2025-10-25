import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
// Importar o tipo que definimos para o frontend
import { InventorySlotData } from 'src/game/types/socket-with-auth.type';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Busca os slots de inventário de um personagem, incluindo os detalhes do item.
   * @param characterId ID do personagem.
   * @returns Array formatado de InventorySlotData.
   */
  async getInventory(characterId: string): Promise<InventorySlotData[]> {
    const slots = await this.prisma.inventorySlot.findMany({
      where: { characterId: characterId },
      include: {
        item: true, // Inclui os dados completos do item associado
      },
      orderBy: {
        item: { name: 'asc' }, // Ordena por nome do item
      },
    });

    // Formata os dados para o tipo esperado pelo frontend
    const formattedSlots: InventorySlotData[] = slots.map((slot) => ({
      slotId: slot.id,
      itemId: slot.item.id,
      itemName: slot.item.name,
      itemDescription: slot.item.description,
      itemType: slot.item.type,
      itemSlot: slot.item.slot,
      quantity: slot.quantity,
      isEquipped: slot.isEquipped,
    }));

    return formattedSlots;
  }

  // Futuro: Funções para equiparItem, usarItem, largarItem, etc.
}
