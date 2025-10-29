/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Character, InventorySlot, Item } from '@prisma/client';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { CharacterTotalStats } from 'src/game/types/socket-with-auth.type';

interface CharacterWithInventory extends Character {
  inventory: (InventorySlot & {
    item: Item;
  })[];
}

/**
 * Define os atributos base que podem ser aumentados.
 */
export type CharacterAttribute =
  | 'strength'
  | 'dexterity'
  | 'intelligence'
  | 'constitution';

@Injectable()
export class CharacterStatsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  // --- LÓGICA PARA GASTAR PONTOS ---

  /**
   * Gasta um ponto de atributo para o personagem.
   * @param characterId ID do personagem.
   * @param attribute Atributo para incrementar (strength, dexterity, etc.).
   * @returns O personagem atualizado.
   */
  async spendAttributePoint(
    characterId: string,
    attribute: CharacterAttribute,
  ): Promise<Character> {
    console.log(
      `[StatsService] Tentando gastar 1 ponto em ${attribute} para ${characterId}`,
    );

    // Validar o nome do atributo (segurança extra)
    if (
      !['strength', 'dexterity', 'intelligence', 'constitution'].includes(
        attribute,
      )
    ) {
      throw new HttpException('Atributo inválido.', HttpStatus.BAD_REQUEST);
    }

    try {
      const updatedCharacter = await this.prisma.$transaction(async (tx) => {
        // 1. A CONSULTA QUE PODE RETORNAR NULL
        const character = await tx.character.findUnique({
          where: { id: characterId },
        });

        // 2. A "CLÁUSULA DE GUARDA" ESSENCIAL
        if (!character) {
          throw new HttpException(
            'Personagem não encontrado.',
            HttpStatus.NOT_FOUND,
          );
        }

        // 3. A SEGUNDA GUARDA (Pontos)
        if (character.attributePoints <= 0) {
          throw new HttpException(
            'Sem pontos de atributo para gastar.',
            HttpStatus.BAD_REQUEST,
          );
        }

        // Se ambas as guardas passarem, o TS sabe que 'character' não é null
        // e que 'character.attributePoints' é > 0.
        const updatedChar = await tx.character.update({
          where: { id: characterId },
          data: {
            attributePoints: { decrement: 1 },
            [attribute]: { increment: 1 },
          },
        });

        return updatedChar;
      }); // Fim da transação

      // Emitir o evento para forçar a recalculação de stats
      // (especialmente MaxHp/MaxEco que dependem de const/int)
      // e notificar o gateway
      this.eventEmitter.emit('character.stats.updated', {
        characterId,
        updatedCharacter, // Passamos os stats base atualizados
      });
      console.log(
        `[StatsService] Ponto gasto. Emitindo 'character.stats.updated' para ${characterId}`,
      );

      return updatedCharacter;
    } catch (error) {
      console.error(`[StatsService] Erro ao gastar ponto:`, error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Falha ao gastar ponto de atributo.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // --- CÁLCULO DE STATS TOTAIS ---

  /**
   * Calcula os stats totais de um personagem (base + bónus de equipamento).
   * @param characterId ID do personagem.
   * @returns Objeto CharacterTotalStats com os valores calculados.
   * @throws HttpException se o personagem não for encontrado.
   */
  async calculateTotalStats(
    characterId: string,
    // Opcional: passa o personagem base se já o tivermos
    baseCharacter?: Character,
  ): Promise<{
    totalStats: CharacterTotalStats;
    character: Character;
  }> {
    // 1. Buscar Personagem e Itens Equipados numa única query
    const character =
      baseCharacter ??
      (await this.prisma.character.findUnique({
        where: { id: characterId },
        include: {
          inventory: {
            where: { isEquipped: true },
            include: {
              item: {
                select: { stats: true },
              },
            },
          },
        },
      }));

    if (!character) {
      throw new NotFoundException(
        `Personagem com ID ${characterId} não encontrado para cálculo de stats.`,
      );
    }

    // Se o personagem foi passado sem inventário, precisamos buscá-lo
    // Esta lógica é complexa, vamos simplificar e *sempre* buscar
    const charWithInventory = await this.getCharacterWithInventory(characterId);
    if (!charWithInventory) {
      throw new NotFoundException(
        `Personagem com ID ${characterId} não encontrado com inventário.`,
      );
    }

    // 2. Inicializar Stats Totais com os Stats Base do Personagem
    const totalStats: CharacterTotalStats = {
      totalStrength: charWithInventory.strength,
      totalDexterity: charWithInventory.dexterity,
      totalIntelligence: charWithInventory.intelligence,
      totalConstitution: charWithInventory.constitution,
      totalMaxHp: 0, // Será calculado abaixo
      totalMaxEco: 0,
      types: [],
    };

    // 3. Iterar sobre os Itens Equipados e Somar os Bónus
    for (const slot of charWithInventory.inventory) {
      const itemStats = slot.item.stats as any;
      if (itemStats) {
        totalStats.totalStrength += itemStats.strength ?? 0;
        totalStats.totalDexterity += itemStats.dexterity ?? 0;
        totalStats.totalIntelligence += itemStats.intelligence ?? 0;
        totalStats.totalConstitution += itemStats.constitution ?? 0;
        // Bônus diretos (ex: +20 MaxHP)
        totalStats.totalMaxHp += itemStats.maxHp ?? 0;
        totalStats.totalMaxEco += itemStats.maxEco ?? 0;
      }
    }

    // 4. Calcular Máximos (Base + Bônus de Atributo + Bônus Direto de Item)
    // Usamos os stats base do personagem (charWithInventory) para bônus de atributo
    totalStats.totalMaxHp += 100 + charWithInventory.constitution * 10;
    totalStats.totalMaxEco += 50 + charWithInventory.intelligence * 5;

    console.log(
      `[CharacterStatsService] Stats calculados para ${charWithInventory.name}:`,
      totalStats,
    );

    return { totalStats, character: charWithInventory };
  }

  // --- EVENT LISTENERS (REFAVORADOS) ---

  /**
   * Ouve por mudanças no equipamento.
   */
  @OnEvent('character.equipment.changed')
  async handleEquipmentChanged(payload: { characterId: string }) {
    console.log(
      `[StatsService] Evento handleEquipmentChanged recebido para ${payload.characterId}`,
    );
    // Apenas chama o recalculador
    await this._recalculateAndEmitStats(payload.characterId);
  }

  /**
   * Ouve por atualizações nos stats base (ex: gastar ponto).
   */
  @OnEvent('character.stats.updated')
  async handleStatsUpdated(payload: {
    characterId: string;
    updatedCharacter: Character; // Recebe os novos stats base
  }) {
    console.log(
      `[StatsService] Evento handleStatsUpdated recebido para ${payload.characterId}`,
    );
    // Apenas chama o recalculador, passando o personagem já atualizado
    await this._recalculateAndEmitStats(
      payload.characterId,
      payload.updatedCharacter,
    );
  }

  /**
   * Função centralizada que recalcula TUDO e emite os eventos para o cliente.
   * Isto corrige o erro de tipo e previne lógica duplicada.
   */
  private async _recalculateAndEmitStats(
    characterId: string,
    // Opcional: podemos receber o personagem já atualizado
    // (ex: de 'spendAttributePoint') para evitar uma busca extra
    updatedBaseCharacter?: Character,
  ) {
    try {
      // 1. Calcular Stats Totais (com equipamentos)
      //    e obter o personagem base atualizado (seja o que foi passado, ou buscando)
      const { totalStats, character } = await this.calculateTotalStats(
        characterId,
        updatedBaseCharacter,
      );

      // 2. Verificar se os Stats Base (MaxHp/MaxEco base) precisam ser atualizados no DB
      const newBaseMaxHp = 100 + character.constitution * 10;
      const newBaseMaxEco = 50 + character.intelligence * 5;

      let finalCharacter = character;

      if (
        newBaseMaxHp !== character.maxHp ||
        newBaseMaxEco !== character.maxEco
      ) {
        // Se 'spendAttributePoint' nos deu o personagem, ele já está atualizado.
        // Se 'handleEquipmentChanged' nos chamou, o 'character' que buscamos pode
        // ter MaxHp/MaxEco base desatualizados. Atualizamos agora.
        finalCharacter = await this.prisma.character.update({
          where: { id: characterId },
          data: {
            maxHp: newBaseMaxHp,
            maxEco: newBaseMaxEco,
          },
          // Incluir inventário de novo? Não é necessário,
          // 'finalCharacter' só é usado para os baseStats.
        });
      }

      // 3. Emitir VITAIS (HP/Eco) para o cliente
      // (Usa os stats TOTAIS calculados)
      this.eventEmitter.emit('character.vitals.updated', {
        characterId: characterId,
        vitals: {
          hp: finalCharacter.hp,
          maxHp: totalStats.totalMaxHp, // Total (com itens)
          eco: finalCharacter.eco,
          maxEco: totalStats.totalMaxEco, // Total (com itens)
        },
      });

      // 4. Emitir STATS BASE (Str, Dex, etc) para o cliente
      // (Usa os stats BASE do personagem)
      this.eventEmitter.emit('character.baseStats.updated', {
        characterId: characterId,
        baseStats: {
          strength: finalCharacter.strength,
          dexterity: finalCharacter.dexterity,
          intelligence: finalCharacter.intelligence,
          constitution: finalCharacter.constitution,
          attributePoints: finalCharacter.attributePoints,
        },
      });

      // 5. (Opcional) Emitir STATS TOTAIS (se a UI precisar deles)
      // this.eventEmitter.emit('character.totalStats.updated', {
      //   characterId: characterId,
      //   totalStats: totalStats,
      // });

      console.log(
        `[StatsService] Stats recalculados e emitidos para ${characterId}`,
      );
    } catch (error) {
      console.error(
        `[StatsService] Erro em _recalculateAndEmitStats para ${characterId}:`,
        error,
      );
    }
  }

  private async getCharacterWithInventory(
    characterId: string,
  ): Promise<CharacterWithInventory | null> {
    return this.prisma.character.findUnique({
      where: { id: characterId },
      include: {
        inventory: {
          where: { isEquipped: true },
          include: {
            item: true,
          },
        },
      },
    });
  }
}
