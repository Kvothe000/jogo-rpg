/* eslint-disable @typescript-eslint/no-unused-vars */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { InventorySlotData } from 'src/game/types/socket-with-auth.type';
import { EquipSlot, ItemType } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Interface para os dados de efeito do item
interface ItemEffectData {
  healHp?: number;
  restoreEco?: number;
  // Outros efeitos futuros (buffs temporários?)
}

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) { }

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
      itemType: slot.item.type as any, // Cast necessário pois mudamos o tipo do socket para string literal
      itemSlot: slot.item.slot as any,
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

  /**
   * Usa um item consumível do inventário.
   * @param characterId ID do personagem.
   * @param slotId ID do InventorySlot contendo o item a ser usado.
   * @returns Objeto com mensagem de sucesso e os vitais atualizados.
   * @throws HttpException se o slot/item não for encontrado, não for consumível ou quantidade for zero.
   */
  async useItem(
    characterId: string,
    slotId: string,
  ): Promise<{
    message: string;
    hp: number;
    maxHp: number;
    eco: number;
    maxEco: number;
  }> {
    console.log(
      `[InventoryService] Tentando usar item do slot ${slotId} para char ${characterId}`,
    );

    try {
      // A transação agora retorna os vitais atualizados e a mensagem
      const { updatedVitals, message } = await this.prisma.$transaction(
        async (tx) => {
          // 1. Encontrar o slot e o item
          const slot = await tx.inventorySlot.findUnique({
            where: { id: slotId, characterId: characterId },
            include: { item: true },
          });

          if (!slot) {
            throw new HttpException(
              'Slot não encontrado.',
              HttpStatus.NOT_FOUND,
            );
          }
          if (slot.item.type !== ItemType.CONSUMABLE) {
            throw new HttpException(
              'Este item não pode ser usado.',
              HttpStatus.BAD_REQUEST,
            );
          }
          if (slot.quantity <= 0) {
            throw new HttpException(
              'Você não tem mais deste item.',
              HttpStatus.BAD_REQUEST,
            );
          }

          const itemNameUsed = slot.item.name;
          const effectData = slot.item.effectData as ItemEffectData;

          // 2. Encontrar o personagem
          const character = await tx.character.findUnique({
            where: { id: characterId },
          });
          if (!character) {
            throw new HttpException(
              'Personagem não encontrado.',
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }

          // 3. Aplicar efeitos
          let hpHealed = 0;
          let ecoRestored = 0;
          let newHp = character.hp;
          let newEco = character.eco;

          if (effectData.healHp && character.hp < character.maxHp) {
            const potentialHp = character.hp + effectData.healHp;
            newHp = Math.min(character.maxHp, potentialHp);
            hpHealed = newHp - character.hp;
          }
          if (effectData.restoreEco && character.eco < character.maxEco) {
            const potentialEco = character.eco + effectData.restoreEco;
            newEco = Math.min(character.maxEco, potentialEco);
            ecoRestored = newEco - character.eco;
          }

          // 4. Construir mensagem
          let localMessage = `Você usou ${itemNameUsed}.`; // Usamos uma var local
          const effectsApplied: string[] = [];
          if (hpHealed > 0) effectsApplied.push(`${hpHealed} de HP recuperado`);
          if (ecoRestored > 0)
            effectsApplied.push(`${ecoRestored} de Eco recuperado`);

          if (effectsApplied.length > 0) {
            localMessage += ` ${effectsApplied.join(' e ')}.`;
          } else {
            localMessage += ' Nenhum efeito aplicado.';
          }

          // 5. Atualizar personagem (se houve mudança) e slot
          if (newHp !== character.hp || newEco !== character.eco) {
            await tx.character.update({
              where: { id: characterId },
              data: { hp: newHp, eco: newEco },
            });
          }

          await tx.inventorySlot.update({
            where: { id: slotId },
            data: { quantity: { decrement: 1 } },
          });

          // 6. Remover slot se a quantidade for 0
          const updatedSlot = await tx.inventorySlot.findUnique({
            where: { id: slotId },
          });
          if (updatedSlot && updatedSlot.quantity <= 0) {
            await tx.inventorySlot.delete({ where: { id: slotId } });
          }

          // 7. Preparar dados de retorno da transação
          const localUpdatedVitals = {
            hp: newHp,
            maxHp: character.maxHp,
            eco: newEco,
            maxEco: character.maxEco,
          };

          // Retorna os valores de dentro da transação
          return { updatedVitals: localUpdatedVitals, message: localMessage };
        },
      ); // Fim da transação

      // 8. Emitir evento (agora 'updatedVitals' está garantido)
      this.eventEmitter.emit('character.vitals.updated', {
        characterId,
        vitals: updatedVitals,
      });

      console.log(`[InventoryService] Item usado por ${characterId}.`);

      // 9. Retornar (agora 'message' e 'updatedVitals' estão garantidos)
      return { message, ...updatedVitals };
    } catch (error) {
      console.error(
        `[InventoryService] Erro ao usar item ${slotId} para ${characterId}:`,
        error,
      );
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Falha ao usar item.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
