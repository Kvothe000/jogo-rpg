/* eslint-disable @typescript-eslint/no-unused-vars */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { InventorySlotData } from 'src/game/types/socket-with-auth.type';
import { EquipSlot } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Busca os slots de inventário de um personagem, incluindo os detalhes do item.
   * @param characterId ID do personagem.
   * @returns Array formatado de InventorySlotData.
   */
  async getInventory(characterId: string): Promise<InventorySlotData[]> {
    const slots = await this.prisma.inventorySlot.findMany({
      where: { characterId: characterId },
      include: {
        item: true,
      },
      orderBy: {
        item: { name: 'asc' },
      },
    });

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

  async equipItem(characterId: string, slotIdToEquip: string): Promise<void> {
    console.log(
      `[InventoryService] Tentando equipar slot ${slotIdToEquip} para char ${characterId}`,
    );

    try {
      await this.prisma.$transaction(async (tx) => {
        const targetSlot = await tx.inventorySlot.findUnique({
          where: { id: slotIdToEquip, characterId: characterId },
          include: { item: true },
        });

        if (!targetSlot) {
          console.error(
            `[InventoryService] equipItem ERRO: Slot ${slotIdToEquip} não encontrado para char ${characterId}`,
          );
          throw new HttpException(
            'Slot de inventário não encontrado.',
            HttpStatus.NOT_FOUND,
          );
        }
        if (targetSlot.item.type !== 'EQUIPMENT') {
          console.warn(
            `[InventoryService] equipItem AVISO: Item ${targetSlot.item.name} não é EQUIPAMENTO.`,
          );
          throw new HttpException(
            'Este item não pode ser equipado.',
            HttpStatus.BAD_REQUEST,
          );
        }
        if (!targetSlot.item.slot) {
          console.warn(
            `[InventoryService] equipItem AVISO: Item ${targetSlot.item.name} não tem slot definido.`,
          );
          throw new HttpException(
            'Este item não tem um slot de equipamento definido.',
            HttpStatus.BAD_REQUEST,
          );
        }

        if (targetSlot.isEquipped) {
          console.log(
            `[InventoryService] Item ${targetSlot.item.name} já está equipado.`,
          );
          return;
        }

        const equipSlot = targetSlot.item.slot;
        console.log(
          `[InventoryService] Item ${targetSlot.item.name} é do slot ${equipSlot}`,
        );

        const currentlyEquippedSlot = await tx.inventorySlot.findFirst({
          where: {
            characterId: characterId,
            isEquipped: true,
            item: {
              slot: equipSlot,
            },
          },
          include: { item: true },
        });

        if (currentlyEquippedSlot) {
          if (currentlyEquippedSlot.id === slotIdToEquip) {
            console.warn(
              `[InventoryService] Tentativa de re-equipar o mesmo slot ${slotIdToEquip}. Ignorando.`,
            );
            return;
          }

          console.log(
            `[InventoryService] Desequipando item anterior: ${currentlyEquippedSlot.item.name} (Slot ID: ${currentlyEquippedSlot.id}) no slot ${equipSlot}.`,
          );
          await tx.inventorySlot.update({
            where: { id: currentlyEquippedSlot.id },
            data: { isEquipped: false },
          });
        } else {
          console.log(
            `[InventoryService] Nenhum item encontrado no slot ${equipSlot} para desequipar.`,
          );
        }

        console.log(
          `[InventoryService] Equipando item: ${targetSlot.item.name} (Slot ID: ${slotIdToEquip}) no slot ${equipSlot}.`,
        );
        await tx.inventorySlot.update({
          where: { id: slotIdToEquip },
          data: { isEquipped: true },
        });
      });

      console.log(
        `[InventoryService] Transação equipItem para ${slotIdToEquip} concluída.`,
      );

      // Emitir evento após sucesso
      this.eventEmitter.emit('character.equipment.changed', { characterId });
      console.log(
        `[InventoryService] Evento character.equipment.changed emitido para ${characterId} (equip)`,
      );
    } catch (error) {
      console.error(
        `[InventoryService] Erro na transação equipItem para ${slotIdToEquip}:`,
        error,
      );
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Falha ao equipar item.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async unequipItem(
    characterId: string,
    slotIdToUnequip: string,
  ): Promise<void> {
    console.log(
      `[InventoryService] Tentando desequipar slot ${slotIdToUnequip} para char ${characterId}`,
    );

    try {
      const targetSlot = await this.prisma.inventorySlot.findUnique({
        where: { id: slotIdToUnequip, characterId: characterId },
        include: { item: true },
      });

      if (!targetSlot) {
        console.error(
          `[InventoryService] unequipItem ERRO: Slot ${slotIdToUnequip} não encontrado para char ${characterId}`,
        );
        throw new HttpException(
          'Slot de inventário não encontrado.',
          HttpStatus.NOT_FOUND,
        );
      }

      if (!targetSlot.isEquipped) {
        console.log(
          `[InventoryService] Item ${targetSlot.item.name} já está desequipado.`,
        );
        return;
      }

      console.log(
        `[InventoryService] Desequipando item: ${targetSlot.item.name} (Slot ID: ${slotIdToUnequip}).`,
      );
      await this.prisma.inventorySlot.update({
        where: { id: slotIdToUnequip },
        data: { isEquipped: false },
      });

      console.log(
        `[InventoryService] Item ${targetSlot.item.name} desequipado com sucesso.`,
      );

      // Emitir evento após sucesso
      this.eventEmitter.emit('character.equipment.changed', { characterId });
      console.log(
        `[InventoryService] Evento character.equipment.changed emitido para ${characterId} (unequip)`,
      );
    } catch (error) {
      console.error(
        `[InventoryService] Erro ao desequipar item ${slotIdToUnequip}:`,
        error,
      );
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Falha ao desequipar item.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
