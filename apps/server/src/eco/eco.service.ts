import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
// Importar o tipo que definimos para o frontend
import { KeywordData } from 'src/game/types/socket-with-auth.type';

@Injectable()
export class EcoService {
  constructor(private prisma: PrismaService) {}

  /**
   * Busca as PowerKeywords associadas a um personagem.
   * @param characterId ID do personagem.
   * @returns Array formatado de KeywordData.
   */
  async getCharacterKeywords(characterId: string): Promise<KeywordData[]> {
    // Busca as entradas na tabela de junção CharacterPowerKeyword
    // que correspondem ao characterId, e inclui os dados da PowerKeyword relacionada.
    const characterKeywords = await this.prisma.characterPowerKeyword.findMany({
      where: { characterId: characterId },
      include: {
        powerKeyword: true, // Inclui os dados da Keyword (nome, descrição, id)
      },
      orderBy: {
        powerKeyword: { name: 'asc' }, // Ordena por nome da Keyword
      },
    });

    // Mapeia o resultado para o formato KeywordData esperado pelo frontend
    const formattedKeywords: KeywordData[] = characterKeywords.map((ck) => ({
      id: ck.powerKeyword.id,
      name: ck.powerKeyword.name,
      description: ck.powerKeyword.description,
    }));

    console.log(
      `[EcoService] Keywords encontradas para ${characterId}:`,

      formattedKeywords.map((k) => k.name),
    ); // Log

    return formattedKeywords;
  }

  // Futuro: Funções para aprender novas Keywords, combinar Keywords, etc.
}
