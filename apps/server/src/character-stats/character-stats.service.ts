/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Character } from '@prisma/client'; // Importar tipo Character
// Importar o tipo que definimos para o payload
import { CharacterTotalStats } from 'src/game/types/socket-with-auth.type';

@Injectable()
export class CharacterStatsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calcula os stats totais de um personagem (base + bónus de equipamento).
   * @param characterId ID do personagem.
   * @returns Objeto CharacterTotalStats com os valores calculados.
   * @throws HttpException se o personagem não for encontrado.
   */
  async calculateTotalStats(characterId: string): Promise<CharacterTotalStats> {
    // 1. Buscar Personagem e Itens Equipados numa única query
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: {
        // Pega apenas os slots equipados E que têm um item associado
        inventory: {
          where: { isEquipped: true },
          include: {
            item: {
              // Inclui os dados do item, especificamente os stats
              select: { stats: true },
            },
          },
        },
      },
    });

    if (!character) {
      // Lançar um erro aqui é melhor do que retornar null,
      // pois indica um estado inconsistente grave.
      throw new Error(
        `Personagem com ID ${characterId} não encontrado para cálculo de stats.`,
      );
    }

    // 2. Inicializar Stats Totais com os Stats Base do Personagem
    const totalStats: CharacterTotalStats = {
      totalStrength: character.strength,
      totalDexterity: character.dexterity,
      totalIntelligence: character.intelligence,
      totalConstitution: character.constitution,
      totalMaxHp: character.maxHp, // Começa com o MaxHP base
      totalMaxEco: character.maxEco,
      types: [],
    };

    // 3. Iterar sobre os Itens Equipados e Somar os Bónus
    for (const slot of character.inventory) {
      // O 'where' na query já garante que isEquipped é true e item existe
      const itemStats = slot.item.stats as any; // Assume que 'stats' é um JSON

      if (itemStats) {
        totalStats.totalStrength += itemStats.strength ?? 0;
        totalStats.totalDexterity += itemStats.dexterity ?? 0;
        totalStats.totalIntelligence += itemStats.intelligence ?? 0;
        totalStats.totalConstitution += itemStats.constitution ?? 0;
        totalStats.totalMaxHp += itemStats.maxHp ?? 0; // Soma bónus directos de MaxHP
        totalStats.totalMaxEco += itemStats.maxEco ?? 0; // Soma bónus directos de MaxEco
        // Adicionar outros stats aqui (ex: defense, attack)
      }
    }

    // (Opcional, mas recomendado) Aplicar bónus derivados de stats base
    // Ex: Cada ponto de Constitution dá +10 MaxHP (além do base e itens)
    totalStats.totalMaxHp += totalStats.totalConstitution * 10; // Exemplo
    // Ex: Cada ponto de Intelligence dá +5 MaxEco
    totalStats.totalMaxEco += totalStats.totalIntelligence * 5; // Exemplo

    console.log(
      `[CharacterStatsService] Stats calculados para ${character.name}:`,
      totalStats,
    ); // Log

    return totalStats;
  }
}
