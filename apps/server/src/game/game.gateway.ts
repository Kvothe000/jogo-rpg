/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import type { SocketWithAuth } from './types/socket-with-auth.type';
import type { TokenPayload } from 'src/auth/types/user-payload.type';
import type { GameMap } from '@prisma/client';
import { BattleService } from 'src/battle/battle.service';
import { OnEvent } from '@nestjs/event-emitter';
import { LootDropPayload } from 'src/game/types/socket-with-auth.type';
import { InventoryService } from 'src/inventory/inventory.service';
import {
  HttpException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  CharacterStatsService,
  CharacterAttribute,
} from 'src/character-stats/character-stats.service';
import { EcoService } from 'src/eco/eco.service';
import { SkillService } from 'src/skill/skill.service';
import { Skill } from '@prisma/client';
import { OnModuleDestroy } from '@nestjs/common';

// --- Constantes para Regeneração ---
const REGEN_INTERVAL_MS = 10000; // Verificar a cada 10 segundos
const HP_REGEN_PER_INTERVAL = 5; // Regenerar 5 HP por intervalo
const ECO_REGEN_PER_INTERVAL = 3; // Regenerar 3 Eco por intervalo

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    OnModuleDestroy
{
  @WebSocketServer()
  server: Server;
  private jwtSecret: string;
  private regenInterval: NodeJS.Timeout | null = null;

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private battleService: BattleService,
    private inventoryService: InventoryService,
    private characterStatsService: CharacterStatsService,
    private ecoService: EcoService,
    private skillService: SkillService,
  ) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET não está definido!');
    }
    this.jwtSecret = secret;
  }

  afterInit(_server: Server) {
    console.log('🎮 GameGateway Inicializado!');
    this.startRegenerationLoop();
  }

  onModuleDestroy() {
    if (this.regenInterval) {
      clearInterval(this.regenInterval);
      console.log('🛑 Loop de Regeneração Parado.');
    }
  }

  // --- LÓGICA DO LOOP DE REGENERAÇÃO ---
  private startRegenerationLoop(): void {
    console.log(
      `🔄 Iniciando loop de regeneração a cada ${REGEN_INTERVAL_MS / 1000} segundos.`,
    );

    this.regenInterval = setInterval(() => {
      (async () => {
        try {
          const socketsInfo = await this.server.fetchSockets();
          const sockets = socketsInfo
            .map(
              (socketInfo) =>
                this.server.sockets.sockets.get(
                  socketInfo.id,
                ) as SocketWithAuth,
            )
            .filter(Boolean);

          for (const client of sockets) {
            if (!client?.data?.user) continue;

            const character = client.data.user.character;
            if (!character) continue;

            const isInCombat = this.battleService.getCombat(character.id);
            if (isInCombat) continue;

            if (
              character.hp >= character.maxHp &&
              character.eco >= character.maxEco
            ) {
              continue;
            }

            const newHp = Math.min(
              character.maxHp,
              character.hp + HP_REGEN_PER_INTERVAL,
            );
            const newEco = Math.min(
              character.maxEco,
              character.eco + ECO_REGEN_PER_INTERVAL,
            );

            if (newHp !== character.hp || newEco !== character.eco) {
              try {
                const updatedCharacter = await this.prisma.character.update({
                  where: { id: character.id },
                  data: {
                    hp: newHp,
                    eco: newEco,
                  },
                  select: {
                    id: true,
                    hp: true,
                    maxHp: true,
                    eco: true,
                    maxEco: true,
                    name: true,
                  },
                });

                client.data.user.character!.hp = updatedCharacter.hp;
                client.data.user.character!.eco = updatedCharacter.eco;
                client.data.user.character!.maxHp = updatedCharacter.maxHp;
                client.data.user.character!.maxEco = updatedCharacter.maxEco;

                client.emit('playerVitalsUpdated', {
                  hp: updatedCharacter.hp,
                  maxHp: updatedCharacter.maxHp,
                  eco: updatedCharacter.eco,
                  maxEco: updatedCharacter.maxEco,
                });

                console.log(
                  `[Regen] ${updatedCharacter.name}: HP ${updatedCharacter.hp}/${updatedCharacter.maxHp}, Eco ${updatedCharacter.eco}/${updatedCharacter.maxEco}`,
                );
              } catch (updateError) {
                console.error(
                  `[Regen] Erro ao atualizar personagem ${character.id}:`,
                  updateError,
                );
              }
            }
          }
        } catch (fetchError) {
          console.error('[Regen] Erro ao buscar sockets:', fetchError);
        }
      })().catch((loopError) => {
        console.error('[Regen] Erro inesperado no loop:', loopError);
      });
    }, REGEN_INTERVAL_MS);
  }

  async handleConnection(client: SocketWithAuth) {
    try {
      const authHeader = client.handshake.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Token não fornecido ou mal formatado');
      }
      const token: string = authHeader.split(' ')[1];

      const payload = this.jwtService.verify<TokenPayload>(token, {
        secret: this.jwtSecret,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { character: true },
      });

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      const { passwordHash: _removedHash, ...userPayload } = user;
      client.data.user = userPayload;

      console.log(
        `✅ Cliente Conectado: ${userPayload.email} (Character ID: ${userPayload.character?.id})`,
      );
      await this.sendRoomDataToClient(client);

      // Reiniciar loop se estava parado e há clientes
      if (!this.regenInterval) {
        const socketsInfo = await this.server.fetchSockets();
        if (socketsInfo.length > 0) {
          this.startRegenerationLoop();
        }
      }
    } catch (error: unknown) {
      let errorMessage = 'Falha na conexão';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error(`❌ Falha na conexão: ${errorMessage}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: SocketWithAuth) {
    const user = client.data.user;
    if (user) {
      console.log(
        `🔌 Cliente Desconectado: ${user.email} (Character ID: ${user.character?.id})`,
      );
    } else {
      console.log('🔌 Cliente (não autenticado) Desconectado');
    }

    // A lógica async fica dentro do setTimeout
    setTimeout(async () => {
      try {
        const socketsInfo = await this.server.fetchSockets();
        if (socketsInfo.length === 0 && this.regenInterval) {
          clearInterval(this.regenInterval);
          this.regenInterval = null;
          console.log('🛑 Loop de Regeneração Parado (sem clientes).');
        }
      } catch (error) {
        console.error(
          '[Regen] Erro ao verificar sockets em disconnect:',
          error,
        );
      }
    }, 100);
  }

  @SubscribeMessage('playerLook')
  async handlePlayerLook(@ConnectedSocket() client: SocketWithAuth) {
    await this.sendRoomDataToClient(client);
  }

  @SubscribeMessage('playerMove')
  async handlePlayerMove(
    @ConnectedSocket() client: SocketWithAuth,
    @MessageBody() direction: string,
  ) {
    const { user } = client.data;
    if (!user.character) {
      client.emit('serverMessage', 'Erro: Personagem não encontrado.');
      return;
    }

    const mapId = user.character.mapId;
    const currentRoom = await this.prisma.gameMap.findUnique({
      where: { id: mapId },
    });

    if (!currentRoom) {
      client.emit('serverMessage', 'Erro: Sala atual não encontrada.');
      return;
    }

    const exits = currentRoom.exits as Record<string, string>;
    const nextRoomId = exits[direction.toLowerCase()];

    if (!nextRoomId) {
      client.emit('serverMessage', 'Você não pode ir por aí.');
      return;
    }

    await this.prisma.character.update({
      where: { id: user.character.id },
      data: {
        mapId: nextRoomId,
      },
    });

    user.character.mapId = nextRoomId;
    client.emit('serverMessage', `Você se move para... ${direction}.`);
    await this.sendRoomDataToClient(client);
  }

  @SubscribeMessage('playerInteractNpc')
  async handleNpcInteraction(
    @ConnectedSocket() client: SocketWithAuth,
    @MessageBody() npcInstanceId: string,
  ) {
    const { user } = client.data;
    if (!user.character) {
      client.emit('serverMessage', 'Erro: Personagem não encontrado.');
      return;
    }
    const playerRoomId = user.character.mapId;

    const npcInstance = await this.prisma.nPCInstance.findFirst({
      where: {
        id: npcInstanceId,
        mapId: playerRoomId,
      },
      include: {
        template: true,
      },
    });

    if (!npcInstance) {
      client.emit('serverMessage', 'Não há ninguém com esse nome aqui.');
      return;
    }

    const npcName = npcInstance.template.name;
    let dialogue = '';

    switch (npcName) {
      case 'Guarda da Cidadela':
        dialogue =
          '"Cuidado por onde anda, Renegado. A Ordem está observando."';
        break;
      default:
        dialogue = '"..." (Ele não parece querer conversar.)';
    }

    client.emit('npcDialogue', {
      npcName: npcName,
      dialogue: dialogue,
    });
  }

  @SubscribeMessage('equipItem')
  async handleEquipItem(
    @ConnectedSocket() client: SocketWithAuth,
    @MessageBody() payload: { slotId: string },
  ) {
    const characterId = client.data.user?.character?.id;
    const slotIdToEquip = payload?.slotId;

    if (!characterId || !slotIdToEquip) {
      client.emit('serverMessage', 'Erro: Dados inválidos para equipar item.');
      return;
    }

    console.log(
      `[GameGateway] Recebido equipItem: char=${characterId}, slot=${slotIdToEquip}`,
    );

    try {
      await this.inventoryService.equipItem(characterId, slotIdToEquip);

      const updatedInventory =
        await this.inventoryService.getInventory(characterId);
      client.emit('updateInventory', { slots: updatedInventory });
      client.emit('serverMessage', 'Item equipado!');
    } catch (error) {
      console.error(
        `[GameGateway] Erro ao equipar item (slot ${slotIdToEquip}):`,
        error,
      );
      const message =
        error instanceof HttpException
          ? error.message
          : 'Erro desconhecido ao tentar equipar o item.';
      client.emit('serverMessage', `Falha ao equipar: ${message}`);
    }
  }

  @SubscribeMessage('unequipItem')
  async handleUnequipItem(
    @ConnectedSocket() client: SocketWithAuth,
    @MessageBody() payload: { slotId: string },
  ) {
    const characterId = client.data.user?.character?.id;
    const slotIdToUnequip = payload?.slotId;

    if (!characterId || !slotIdToUnequip) {
      client.emit(
        'serverMessage',
        'Erro: Dados inválidos para desequipar item.',
      );
      return;
    }

    console.log(
      `[GameGateway] Recebido unequipItem: char=${characterId}, slot=${slotIdToUnequip}`,
    );

    try {
      await this.inventoryService.unequipItem(characterId, slotIdToUnequip);

      const updatedInventory =
        await this.inventoryService.getInventory(characterId);
      client.emit('updateInventory', { slots: updatedInventory });
      client.emit('serverMessage', 'Item desequipado!');
    } catch (error) {
      console.error(
        `[GameGateway] Erro ao desequipar item (slot ${slotIdToUnequip}):`,
        error,
      );
      const message =
        error instanceof HttpException
          ? error.message
          : 'Erro desconhecido ao tentar desequipar o item.';
      client.emit('serverMessage', `Falha ao desequipar: ${message}`);
    }
  }

  @SubscribeMessage('useItem')
  async handleUseItem(
    @ConnectedSocket() client: SocketWithAuth,
    @MessageBody() payload: { slotId: string },
  ) {
    const characterId = client.data.user?.character?.id;
    const slotIdToUse = payload?.slotId;

    if (!characterId || !slotIdToUse) {
      client.emit('serverMessage', 'Erro: Dados inválidos para usar item.');
      return;
    }

    console.log(
      `[GameGateway] Recebido useItem: char=${characterId}, slot=${slotIdToUse}`,
    );

    try {
      const result = await this.inventoryService.useItem(
        characterId,
        slotIdToUse,
      );

      // Enviar mensagem de sucesso
      client.emit('serverMessage', result.message);

      // Atualizar inventário (item foi consumido)
      const updatedInventory =
        await this.inventoryService.getInventory(characterId);
      client.emit('updateInventory', { slots: updatedInventory });

      // Os vitais serão atualizados pelo listener de evento 'character.vitals.updated'
    } catch (error) {
      console.error(
        `[GameGateway] Erro ao usar item (slot ${slotIdToUse}) para ${characterId}:`,
        error,
      );
      const message =
        error instanceof HttpException
          ? error.message
          : 'Erro desconhecido ao tentar usar o item.';
      client.emit('serverMessage', `Falha ao usar: ${message}`);
    }
  }

  // --- Handler para gastar pontos ---
  @SubscribeMessage('spendAttributePoint')
  async handleSpendAttributePoint(
    @ConnectedSocket() client: SocketWithAuth,
    @MessageBody() payload: { attribute: CharacterAttribute },
  ) {
    const characterId = client.data.user?.character?.id;
    const attribute = payload?.attribute;

    if (!characterId || !attribute) {
      client.emit('serverMessage', 'Erro: Dados inválidos para gastar ponto.');
      return;
    }

    console.log(
      `[GameGateway] Recebido spendAttributePoint: char=${characterId}, attr=${attribute}`,
    );

    try {
      // O serviço lida com a lógica, transação e emissão de eventos
      await this.characterStatsService.spendAttributePoint(
        characterId,
        attribute,
      );

      // Enviar mensagem de sucesso
      client.emit(
        'serverMessage',
        `Você aumentou ${this.translateAttribute(attribute)}!`,
      );

      // Os listeners 'character.vitals.updated' e 'character.baseStats.updated'
      // cuidarão de enviar os novos stats para o cliente.
    } catch (error) {
      console.error(
        `[GameGateway] Erro ao gastar ponto (${attribute}) para ${characterId}:`,
        error,
      );
      const message =
        error instanceof HttpException
          ? error.message
          : 'Erro desconhecido ao gastar ponto.';
      client.emit('serverMessage', `Falha: ${message}`);
    }
  }

  // Função auxiliar para traduzir o nome do atributo
  private translateAttribute(attribute: CharacterAttribute): string {
    switch (attribute) {
      case 'strength':
        return 'Força';
      case 'dexterity':
        return 'Destreza';
      case 'intelligence':
        return 'Inteligência';
      case 'constitution':
        return 'Constituição';
      default:
        return attribute;
    }
  }

  @SubscribeMessage('startCombat')
  async handleStartCombat(@ConnectedSocket() client: SocketWithAuth) {
    if (!client.data.user.character) {
      client.emit('serverMessage', 'Erro: Personagem não encontrado.');
      return;
    }

    const MONSTER_ID = 'mon_slime_mana';

    const combatData = await this.battleService.initializeCombat(
      client.data.user,
      MONSTER_ID,
    );

    if (combatData) {
      client.emit('combatStarted', {
        monsterName: combatData.monsterName,
        monsterHp: combatData.monsterHp,
        message: `Você iniciou uma batalha contra ${combatData.monsterName}!`,
      });
      client.emit('serverMessage', `Batalha iniciada!`);
    } else {
      client.emit(
        'serverMessage',
        'Erro ao iniciar combate. Monstro não encontrado.',
      );
    }
  }

  @SubscribeMessage('combatAttack')
  async handleCombatAttack(@ConnectedSocket() client: SocketWithAuth) {
    const playerId = client.data.user.character?.id;
    if (!playerId) {
      client.emit('serverMessage', 'Erro: Personagem não encontrado.');
      return;
    }

    console.log(`[GameGateway] combatAttack recebido de player ${playerId}`);
    try {
      const combatUpdate =
        await this.battleService.processPlayerAttack(playerId);

      if (combatUpdate) {
        console.log(
          `[GameGateway] Enviando combatUpdate (attack) para player ${playerId}`,
        );
        client.emit('combatUpdate', combatUpdate);
      } else {
        console.log(
          `[GameGateway] Nenhum combatUpdate (attack) para player ${playerId} (combate terminou?)`,
        );
      }
    } catch (error) {
      console.error(
        `[GameGateway] Erro ao processar combatAttack para ${playerId}:`,
        error,
      );
      const message =
        error instanceof HttpException
          ? error.message
          : 'Erro ao processar ataque.';
      client.emit('serverMessage', `Falha no ataque: ${message}`);
    }
  }

  @SubscribeMessage('combatUseSkill')
  async handleCombatUseSkill(
    @ConnectedSocket() client: SocketWithAuth,
    @MessageBody() payload: { skillId: string },
  ) {
    const playerId = client.data.user?.character?.id;
    const skillIdToUse = payload?.skillId;

    if (!playerId || !skillIdToUse) {
      client.emit('serverMessage', 'Erro: Dados inválidos para usar skill.');
      return;
    }

    console.log(
      `[GameGateway] combatUseSkill recebido: player=${playerId}, skill=${skillIdToUse}`,
    );
    try {
      const combatUpdate = await this.battleService.processPlayerSkill(
        playerId,
        skillIdToUse,
      );

      if (combatUpdate) {
        console.log(
          `[GameGateway] Enviando combatUpdate (skill) para player ${playerId}`,
        );
        client.emit('combatUpdate', combatUpdate);
      } else {
        console.log(
          `[GameGateway] Nenhum combatUpdate (skill) para player ${playerId} (combate terminou?)`,
        );
      }
    } catch (error) {
      console.error(
        `[GameGateway] Erro ao processar combatUseSkill para ${playerId} (skill ${skillIdToUse}):`,
        error,
      );
      const message =
        error instanceof HttpException
          ? error.message
          : 'Erro desconhecido ao usar skill.';
      client.emit('serverMessage', `Falha ao usar skill: ${message}`);
    }
  }

  @SubscribeMessage('requestInventory')
  async handleRequestInventory(@ConnectedSocket() client: SocketWithAuth) {
    const characterId = client.data.user?.character?.id;
    if (!characterId) {
      client.emit('serverMessage', 'Erro: Personagem não encontrado.');
      return;
    }

    console.log(`[GameGateway] Recebido requestInventory de ${characterId}`);

    const inventorySlots =
      await this.inventoryService.getInventory(characterId);

    client.emit('updateInventory', { slots: inventorySlots });
    console.log(
      `[GameGateway] Emitido updateInventory para ${characterId} com ${inventorySlots.length} slots.`,
    );
  }

  @SubscribeMessage('requestKeywords')
  async handleRequestKeywords(@ConnectedSocket() client: SocketWithAuth) {
    const characterId = client.data.user?.character?.id;
    if (!characterId) {
      client.emit('serverMessage', 'Erro: Personagem não encontrado.');
      console.warn(
        `[GameGateway] requestKeywords: Character não encontrado para socket ${client.id}`,
      );
      return;
    }

    console.log(`[GameGateway] Recebido requestKeywords de ${characterId}`);

    try {
      const keywords = await this.ecoService.getCharacterKeywords(characterId);
      client.emit('updateKeywords', { keywords: keywords });
      console.log(
        `[GameGateway] Emitido updateKeywords para ${characterId} com ${keywords.length} keywords.`,
      );
    } catch (error) {
      console.error(
        `[GameGateway] Erro ao buscar keywords para ${characterId}:`,
        error,
      );
      client.emit('serverMessage', 'Erro ao buscar suas Keywords.');
    }
  }

  @SubscribeMessage('requestAvailableSkills')
  async handleRequestAvailableSkills(
    @ConnectedSocket() client: SocketWithAuth,
  ) {
    const characterId = client.data.user?.character?.id;
    if (!characterId) {
      client.emit('serverMessage', 'Erro: Personagem não encontrado.');
      return;
    }

    console.log(
      `[GameGateway] Recebido requestAvailableSkills de ${characterId}`,
    );
    try {
      const availableSkills =
        await this.skillService.getAvailableSkillsForCharacter(characterId);
      client.emit('updateAvailableSkills', { skills: availableSkills });
      console.log(
        `[GameGateway] Emitido updateAvailableSkills para ${characterId} com ${availableSkills.length} skills.`,
      );
    } catch (error) {
      console.error(
        `[GameGateway] Erro ao buscar skills disponíveis para ${characterId}:`,
        error,
      );
      client.emit('serverMessage', 'Erro ao buscar skills disponíveis.');
    }
  }

  @SubscribeMessage('requestLearnedSkills')
  async handleRequestLearnedSkills(@ConnectedSocket() client: SocketWithAuth) {
    const characterId = client.data.user?.character?.id;
    if (!characterId) {
      client.emit('serverMessage', 'Erro: Personagem não encontrado.');
      return;
    }

    console.log(
      `[GameGateway] Recebido requestLearnedSkills de ${characterId}`,
    );
    try {
      const learnedSkills =
        await this.skillService.getLearnedSkills(characterId);
      client.emit('updateLearnedSkills', { skills: learnedSkills });
      console.log(
        `[GameGateway] Emitido updateLearnedSkills para ${characterId} com ${learnedSkills.length} skills.`,
      );
    } catch (error) {
      console.error(
        `[GameGateway] Erro ao buscar skills aprendidas para ${characterId}:`,
        error,
      );
      client.emit('serverMessage', 'Erro ao buscar skills aprendidas.');
    }
  }

  @SubscribeMessage('learnSkill')
  async handleLearnSkill(
    @ConnectedSocket() client: SocketWithAuth,
    @MessageBody() payload: { skillId: string },
  ) {
    const characterId = client.data.user?.character?.id;
    const skillIdToLearn = payload?.skillId;

    if (!characterId || !skillIdToLearn) {
      client.emit(
        'serverMessage',
        'Erro: Dados inválidos para aprender skill.',
      );
      return;
    }

    console.log(
      `[GameGateway] Recebido learnSkill: char=${characterId}, skill=${skillIdToLearn}`,
    );
    try {
      await this.skillService.learnSkill(characterId, skillIdToLearn);
      client.emit('serverMessage', 'Nova skill aprendida!');

      const [availableSkills, learnedSkills] = await Promise.all([
        this.skillService.getAvailableSkillsForCharacter(characterId),
        this.skillService.getLearnedSkills(characterId),
      ]);
      client.emit('updateAvailableSkills', { skills: availableSkills });
      client.emit('updateLearnedSkills', { skills: learnedSkills });
    } catch (error) {
      console.error(
        `[GameGateway] Erro ao aprender skill ${skillIdToLearn} para ${characterId}:`,
        error,
      );
      let message = 'Erro desconhecido ao tentar aprender a skill.';
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        message = error.message;
      } else if (error instanceof HttpException) {
        message = error.message;
      }
      client.emit('serverMessage', `Falha ao aprender skill: ${message}`);
    }
  }

  // --- OUVINTES DE EVENTOS ---

  @OnEvent('combat.win.stats')
  handleCombatWinStatsEvent(payload: {
    playerId: string;
    newTotalXp: string;
    goldGained: number;
    newLevel?: number;
  }) {
    console.log(
      `[GameGateway DEBUG] Evento combat.win.stats RECEBIDO. Payload:`,
      payload,
    );

    const clientSocket = this.getClientSocket(payload.playerId);
    if (clientSocket) {
      console.log(
        `[GameGateway DEBUG] Socket encontrado para ${payload.playerId} (${clientSocket.id}). Emitindo playerUpdated...`,
      );

      clientSocket.emit('playerUpdated', {
        newTotalXp: payload.newTotalXp,
        goldGained: payload.goldGained,
        newLevel: payload.newLevel,
      });

      console.log(
        `[GameGateway DEBUG] Evento playerUpdated ENVIADO para ${clientSocket.id}`,
      );
    } else {
      console.error(
        `[GameGateway DEBUG] ERRO CRÍTICO: Socket NÃO encontrado para ${payload.playerId} ao tentar enviar playerUpdated.`,
      );
      console.log(`[GameGateway] Sockets ativos:`, this.getActiveSocketsInfo());
    }
  }

  @OnEvent('combat.win.loot')
  handleCombatWinLootEvent(payload: {
    playerId: string;
    drops: LootDropPayload[];
  }) {
    console.log(
      `[GameGateway] Evento combat.win.loot RECEBIDO para ${payload.playerId}`,
      {
        dropsCount: payload.drops.length,
        drops: payload.drops,
      },
    );

    const clientSocket = this.getClientSocket(payload.playerId);
    if (clientSocket) {
      console.log(
        `[GameGateway] Socket encontrado para ${payload.playerId}. Emitindo lootReceived...`,
      );
      clientSocket.emit('lootReceived', { drops: payload.drops });
      console.log(
        `[GameGateway] Evento lootReceived enviado para ${payload.playerId}`,
      );
    } else {
      console.error(
        `[GameGateway] ERRO: Socket NÃO encontrado para ${payload.playerId} em combat.win.loot`,
      );
      console.log(`[GameGateway] Sockets ativos:`, this.getActiveSocketsInfo());
    }
  }

  @OnEvent('combat.end')
  handleCombatEndEvent(payload: {
    playerId: string;
    result: 'win' | 'loss' | 'flee';
  }) {
    console.log(
      `[GameGateway] Evento combat.end (${payload.result}) RECEBIDO para ${payload.playerId}`,
    );

    const clientSocket = this.getClientSocket(payload.playerId);
    if (clientSocket) {
      console.log(
        `[GameGateway] Socket encontrado para ${payload.playerId}. Emitindo combatEnd (${payload.result})...`,
      );
      clientSocket.emit('combatEnd', payload.result);
      console.log(
        `[GameGateway] Evento combatEnd enviado para ${payload.playerId}`,
      );
    } else {
      console.error(
        `[GameGateway] ERRO: Socket NÃO encontrado para ${payload.playerId} em combat.end`,
      );
      console.log(`[GameGateway] Sockets ativos:`, this.getActiveSocketsInfo());
    }
  }

  // Listener de VITAIS (HP/ECO) - (EXISTENTE)
  @OnEvent('character.vitals.updated')
  handleVitalsUpdated(payload: {
    characterId: string;
    vitals: { hp: number; maxHp: number; eco: number; maxEco: number };
  }) {
    const { characterId, vitals } = payload;
    console.log(
      `[GameGateway] Evento character.vitals.updated RECEBIDO para ${characterId}`,
    );

    const clientSocket = this.getClientSocket(characterId);
    if (clientSocket) {
      console.log(
        `[GameGateway] Emitindo playerVitalsUpdated para ${characterId}`,
      );
      clientSocket.emit('playerVitalsUpdated', vitals);
      // Atualizar também o estado interno do socket para a regeneração
      if (clientSocket.data.user?.character) {
        clientSocket.data.user.character = {
          ...clientSocket.data.user.character,
          ...vitals,
        };
      }
    }
  }

  // Listener para STATS BASE (STR/DEX/etc)
  @OnEvent('character.baseStats.updated')
  handleBaseStatsUpdated(payload: {
    characterId: string;
    baseStats: {
      strength: number;
      dexterity: number;
      intelligence: number;
      constitution: number;
      attributePoints: number;
    };
  }) {
    const { characterId, baseStats } = payload;
    console.log(
      `[GameGateway] Evento character.baseStats.updated RECEBIDO para ${characterId}`,
    );

    const clientSocket = this.getClientSocket(characterId);
    if (clientSocket) {
      console.log(
        `[GameGateway] Emitindo playerBaseStatsUpdated para ${characterId}`,
      );
      clientSocket.emit('playerBaseStatsUpdated', baseStats);

      // Atualizar também o estado interno do socket
      if (clientSocket.data.user?.character) {
        clientSocket.data.user.character = {
          ...clientSocket.data.user.character,
          ...baseStats,
        };
      }
    }
  }

  // Listener para quando uma Keyword é ganha
  @OnEvent('character.keyword.gained')
  async handleKeywordGained(payload: {
    characterId: string;
    keywordName: string;
    keywordDescription: string;
  }) {
    const { characterId, keywordName, keywordDescription } = payload;
    console.log(
      `[GameGateway] Evento character.keyword.gained RECEBIDO para ${characterId}: ${keywordName}`,
    );

    const clientSocket = this.getClientSocket(characterId);
    if (clientSocket) {
      // 1. Notificar o jogador sobre o novo Eco
      clientSocket.emit(
        'serverMessage',
        `✨ Eco Absorvido: ${keywordName} - ${keywordDescription}`,
      );

      // 2. Pedir ao cliente para atualizar as Keywords e Skills disponíveis
      // (Reutilizamos os handlers existentes que buscam e emitem os dados)
      try {
        await this.handleRequestKeywords(clientSocket);
        await this.handleRequestAvailableSkills(clientSocket);
        console.log(
          `[GameGateway] Atualizações de Keywords/Skills emitidas para ${characterId} após ganhar ${keywordName}.`,
        );
      } catch (error) {
        console.error(
          `[GameGateway] Erro ao emitir atualizações pós-keyword para ${characterId}:`,
          error,
        );
      }
    } else {
      console.warn(
        `[GameGateway] Socket não encontrado para ${characterId} em keyword.gained`,
      );
    }
  }

  getClientSocket(playerId: string): SocketWithAuth | undefined {
    const sockets = Array.from(
      this.server.sockets.sockets.values(),
    ) as SocketWithAuth[];
    const foundSocket = sockets.find(
      (s) => s.data.user?.character?.id === playerId,
    );

    console.log(
      `[GameGateway] Buscando socket para player ${playerId}. Encontrado: ${!!foundSocket}`,
    );
    if (foundSocket) {
      console.log(`[GameGateway] Socket encontrado:`, {
        characterId: foundSocket.data.user?.character?.id,
        email: foundSocket.data.user?.email,
      });
    }

    return foundSocket;
  }

  // Método para debug de sockets ativos
  private getActiveSocketsInfo(): any[] {
    const sockets = Array.from(
      this.server.sockets.sockets.values(),
    ) as SocketWithAuth[];
    return sockets.map((s) => ({
      characterId: s.data.user?.character?.id,
      email: s.data.user?.email,
      connected: s.connected,
    }));
  }

  private async sendRoomDataToClient(client: SocketWithAuth) {
    if (!client.data.user || !client.data.user.character) {
      client.disconnect();
      return;
    }

    const mapId = client.data.user.character.mapId;
    const currentPlayerId = client.data.user.character.id;

    const room = await this.prisma.gameMap.findUnique({
      where: { id: mapId },
      include: {
        characters: {
          select: { id: true, name: true },
        },
        npcInstances: {
          include: {
            template: { select: { name: true } },
          },
        },
      },
    });

    if (room) {
      const otherPlayers = room.characters.filter(
        (char) => char.id !== currentPlayerId,
      );
      const npcsInRoom = room.npcInstances.map((instance) => ({
        id: instance.id,
        name: instance.template.name,
      }));

      client.emit('updateRoom', {
        name: room.name,
        description: room.description,
        exits: room.exits as Record<string, string>,
        players: otherPlayers,
        npcs: npcsInRoom,
      });
    }
  }
}
