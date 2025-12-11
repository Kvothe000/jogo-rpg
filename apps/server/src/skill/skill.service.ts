// apps/server/src/skill/skill.service.ts

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Skill, PowerKeyword } from '@prisma/client'; // Importar tipos
import { LearnedSkillData } from 'src/game/types/socket-with-auth.type';

// Tipo para representar uma skill disponível para aprendizado
export interface AvailableSkill extends Skill {
  requiredKeywordsData: Pick<PowerKeyword, 'id' | 'name'>[]; // Adiciona nomes das keywords
}

@Injectable()
export class SkillService {
  constructor(private prisma: PrismaService) { }

  /**
   * Busca todas as skills que um personagem PODE aprender com base nas suas keywords atuais,
   * mas que ainda NÃO aprendeu.
   * @param characterId ID do personagem.
   * @returns Array de AvailableSkill.
   */
  async getAvailableSkillsForCharacter(
    characterId: string,
  ): Promise<AvailableSkill[]> {
    // 1. Buscar as Keywords que o personagem JÁ POSSUI e as Skills que JÁ APRENDEU
    const characterData = await this.prisma.character.findUnique({
      where: { id: characterId },
      select: {
        powerKeywords: {
          // Keywords possuídas
          select: { powerKeywordId: true },
        },
        level: true,
        skills: {
          // Skills aprendidas
          select: { skillId: true },
        },
      },
    });

    if (!characterData) {
      throw new NotFoundException(
        `Personagem com ID ${characterId} não encontrado.`,
      );
    }

    const possessedKeywordIds = new Set(
      characterData.powerKeywords.map((ck) => ck.powerKeywordId),
    );
    const learnedSkillIds = new Set(
      characterData.skills.map((cs) => cs.skillId),
    );

    if (possessedKeywordIds.size === 0) {
      return []; // Se não tem keywords, não pode aprender skills baseadas nelas.
    }

    // 2. Buscar TODAS as Skills do jogo que requerem keywords
    const allSkills = await this.prisma.skill.findMany({
      where: {
        requiredKeywords: { some: {} }, // Garante que busca apenas skills que têm requisitos
      },
      include: {
        requiredKeywords: {
          // Inclui as keywords necessárias para cada skill
          select: { id: true, name: true }, // Seleciona ID e Nome das keywords
        },
      },
    });

    // 3. Filtrar as Skills
    const availableSkills: AvailableSkill[] = [];
    for (const skill of allSkills) {
      // Pula a skill se o personagem já a aprendeu
      if (learnedSkillIds.has(skill.id)) {
        continue;
      }

      // Verifica se o personagem possui TODAS as keywords requeridas para esta skill
      const requiredIds = skill.requiredKeywords.map((kw) => kw.id);
      const hasAllKeywords = requiredIds.every((reqId) =>
        possessedKeywordIds.has(reqId),
      );

      if (hasAllKeywords) {
        // Adiciona a informação extra das keywords requeridas antes de adicionar à lista
        const skillWithKeywords: AvailableSkill = {
          ...skill,
          requiredKeywordsData: skill.requiredKeywords.map((kw) => ({
            id: kw.id,
            name: kw.name,
          })),
        };
        // Remove a propriedade include redundante
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        delete (skillWithKeywords as any).requiredKeywords;
        availableSkills.push(skillWithKeywords);
      }
    }

    return availableSkills;
  }

  /**
   * Faz o personagem aprender uma nova skill, verificando os pré-requisitos.
   * @param characterId ID do personagem.
   * @param skillId ID da skill a ser aprendida.
   * @throws NotFoundException se personagem ou skill não existem.
   * @throws ConflictException se já aprendeu ou não tem os requisitos.
   */
  async learnSkill(characterId: string, skillId: string): Promise<void> {
    // 1. Buscar dados necessários em paralelo
    const [characterKeywordsData, skillToLearn] = await Promise.all([
      this.prisma.character.findUnique({
        where: { id: characterId },
        select: {
          powerKeywords: { select: { powerKeywordId: true } },
          level: true,
          skills: { where: { skillId: skillId }, select: { skillId: true } }, // Verifica se já aprendeu
        },
      }),
      this.prisma.skill.findUnique({
        where: { id: skillId },
        include: { requiredKeywords: { select: { id: true } } },
      }),
    ]);

    // 2. Validar existência
    if (!characterKeywordsData) {
      throw new NotFoundException(
        `Personagem com ID ${characterId} não encontrado.`,
      );
    }
    if (!skillToLearn) {
      throw new NotFoundException(`Skill com ID ${skillId} não encontrada.`);
    }

    // 3. Verificar se já aprendeu
    if (characterKeywordsData.skills.length > 0) {
      throw new ConflictException('Personagem já conhece esta skill.');
    }

    // 4. Verificar requisitos de Keywords
    const possessedKeywordIds = new Set(
      characterKeywordsData.powerKeywords.map((ck) => ck.powerKeywordId),
    );
    const requiredKeywordIds = skillToLearn.requiredKeywords.map((kw) => kw.id);
    const hasAllKeywords = requiredKeywordIds.every((reqId) =>
      possessedKeywordIds.has(reqId),
    );

    if (!hasAllKeywords) {
      throw new ConflictException(
        'Personagem não possui as Keywords necessárias para aprender esta skill.',
      );
    }

    if (characterKeywordsData.level < skillToLearn.minLevel) {
      throw new ConflictException(
        `Nível insuficiente. Requer nível ${skillToLearn.minLevel}.`
      );
    }

    // 5. Adicionar a Skill ao Personagem (criar entrada na tabela CharacterSkill)
    await this.prisma.characterSkill.create({
      data: {
        characterId: characterId,
        skillId: skillId,
        level: 1, // Nível inicial da skill
      },
    });

    console.log(
      `[SkillService] Personagem ${characterId} aprendeu a skill ${skillId}`,
    );
  }

  /**
   * Busca as skills que um personagem já aprendeu.
   * @param characterId ID do personagem.
   * @returns Array de LearnedSkillData (FORMATO CORRETO PARA O SOCKET).
   */
  async getLearnedSkills(characterId: string): Promise<LearnedSkillData[]> {
    const learnedCharacterSkills = await this.prisma.characterSkill.findMany({
      where: { characterId: characterId },
      include: {
        skill: {
          include: {
            // Inclui apenas as keywords requeridas, não a relação 'characters'
            requiredKeywords: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: {
        skill: { name: 'asc' },
      },
    });

    // CORREÇÃO REVISADA: Mapear para o formato LearnedSkillData
    return learnedCharacterSkills.map((cs) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { requiredKeywords, ...skillData } = cs.skill; // Separa APENAS requiredKeywords
      // A propriedade 'characters' não está sendo incluída na query, então não precisa ser removida.
      return {
        ...skillData, // Inclui id, name, description, ecoCost, effectData
        // Cria a propriedade requiredKeywordsData usando os dados incluídos
        requiredKeywordsData: cs.skill.requiredKeywords.map((kw) => ({
          id: kw.id,
          name: kw.name,
        })),
      };
    });
  }
}
