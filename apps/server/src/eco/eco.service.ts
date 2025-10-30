import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from 'src/prisma/prisma.service';
// Importar o tipo que definimos para o frontend
import { KeywordData } from 'src/game/types/socket-with-auth.type';
import { Prisma } from '@prisma/client';

@Injectable()
export class EcoService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

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

  /**
   * Concede um novo Eco (Keyword) a um personagem, se ele ainda não o possuir.
   * @param characterId ID do personagem.
   * @param keywordName Nome exato da Keyword (ex: "MANA", "FOGO").
   * @returns boolean - True se a keyword foi concedida, False se já a possuía ou não foi encontrada.
   * @throws InternalServerErrorException em caso de erro no banco.
   */
  async grantKeywordToCharacter(
    characterId: string,
    keywordName: string,
  ): Promise<boolean> {
    console.log(
      `[EcoService] Tentando conceder Keyword '${keywordName}' para ${characterId}`,
    );

    try {
      // 1. Encontrar o ID da Keyword pelo nome
      const keyword = await this.prisma.powerKeyword.findUnique({
        where: { name: keywordName },
      });

      if (!keyword) {
        console.warn(
          `[EcoService] Keyword '${keywordName}' não encontrada no DB.`,
        );
        // Considerar lançar NotFoundException se for um erro crítico esperado
        return false;
      }

      // 2. Tentar criar a ligação (conceder a Keyword)
      // Usamos create com tratamento de erro para unique constraint,
      // é mais eficiente que verificar primeiro.
      await this.prisma.characterPowerKeyword.create({
        data: {
          characterId: characterId,
          powerKeywordId: keyword.id,
        },
      });

      console.log(
        `[EcoService] Keyword '${keywordName}' (ID: ${keyword.id}) concedida a ${characterId}!`,
      );

      // 3. Emitir evento para notificar o GameGateway
      this.eventEmitter.emit('character.keyword.gained', {
        characterId: characterId,
        keywordName: keywordName,
        keywordDescription: keyword.description, // Passa a descrição também
      });

      return true; // Keyword foi concedida
    } catch (error) {
      // Verifica se o erro é por já existir (unique constraint violation)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        console.log(
          `[EcoService] Personagem ${characterId} já possui '${keywordName}'.`,
        );
        return false; // Já possuía, operação "bem-sucedida" no sentido de não precisar fazer nada
      }

      // Outro erro qualquer
      console.error(
        `[EcoService] Erro ao conceder Keyword '${keywordName}' para ${characterId}:`,
        error,
      );
      throw new InternalServerErrorException('Falha ao conceder Eco.');
    }
  }

  /**
   * Busca aleatoriamente uma Keyword de um rank específico.
   * @param rank O rank desejado (ex: "E", "D").
   * @returns O nome da Keyword encontrada ou null se nenhuma for encontrada.
   */
  async getRandomKeywordByRank(rank: string): Promise<string | null> {
    const keywordsInRank = await this.prisma.powerKeyword.findMany({
      where: { rank: rank },
      select: { name: true },
    });

    if (keywordsInRank.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * keywordsInRank.length);
    return keywordsInRank[randomIndex].name;
  }

  // Futuro: Funções para aprender novas Keywords, combinar Keywords, etc.
}
