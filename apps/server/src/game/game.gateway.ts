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
import { Prisma, Skill } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import type { SocketWithAuth } from './types/socket-with-auth.type';
import type { TokenPayload } from 'src/auth/types/user-payload.type';
import { BattleService } from 'src/battle/battle.service';
import { OnEvent } from '@nestjs/event-emitter';
import {
  LootDropPayload,
  InventorySlotData,
  CharacterTotalStats,
  BaseStatsPayload,
  PrologueUpdatePayload,
  DialogueOption,
} from 'src/game/types/socket-with-auth.type';
import { InventoryService } from 'src/inventory/inventory.service';
import {
  HttpException,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  CharacterStatsService,
  CharacterAttribute,
} from 'src/character-stats/character-stats.service';
import { EcoService } from 'src/eco/eco.service';
import { SkillService } from 'src/skill/skill.service';
import { OnModuleDestroy } from '@nestjs/common';

// --- Constantes para Regeneração ---
const REGEN_INTERVAL_MS = 10000;
const HP_REGEN_PER_INTERVAL = 5;
const ECO_REGEN_PER_INTERVAL = 3;

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

      // --- LÓGICA DO PRÓLOGO ---
      this.triggerPrologueEvent(client);
      // --- FIM DA LÓGICA DO PRÓLOGO ---

      await this.sendRoomDataToClient(client);

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
    this.triggerPrologueEvent(client);
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

    // --- BLOQUEAR MOVIMENTO DURANTE O PRÓLOGO ---
    if (user.character.prologueState !== 'COMPLETED') {
      client.emit('serverMessage', 'Você não pode se mover agora.');
      return;
    }
    // --- FIM DO BLOQUEIO ---

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

    try {
      await this.inventoryService.equipItem(characterId, slotIdToEquip);

      const updatedInventory =
        await this.inventoryService.getInventory(characterId);
      client.emit('updateInventory', { slots: updatedInventory });
      client.emit('serverMessage', 'Item equipado!');
    } catch (error) {
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

    try {
      await this.inventoryService.unequipItem(characterId, slotIdToUnequip);

      const updatedInventory =
        await this.inventoryService.getInventory(characterId);
      client.emit('updateInventory', { slots: updatedInventory });
      client.emit('serverMessage', 'Item desequipado!');
    } catch (error) {
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

    try {
      const result = await this.inventoryService.useItem(
        characterId,
        slotIdToUse,
      );

      client.emit('serverMessage', result.message);

      const updatedInventory =
        await this.inventoryService.getInventory(characterId);
      client.emit('updateInventory', { slots: updatedInventory });
    } catch (error) {
      const message =
        error instanceof HttpException
          ? error.message
          : 'Erro desconhecido ao tentar usar o item.';
      client.emit('serverMessage', `Falha ao usar: ${message}`);
    }
  }

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

    try {
      await this.characterStatsService.spendAttributePoint(
        characterId,
        attribute,
      );

      client.emit(
        'serverMessage',
        `Você aumentou ${this.translateAttribute(attribute)}!`,
      );
    } catch (error) {
      const message =
        error instanceof HttpException
          ? error.message
          : 'Erro desconhecido ao gastar ponto.';
      client.emit('serverMessage', `Falha: ${message}`);
    }
  }

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

    try {
      const combatUpdate =
        await this.battleService.processPlayerAttack(playerId);

      if (combatUpdate) {
        client.emit('combatUpdate', combatUpdate);
      }
    } catch (error) {
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

    try {
      const combatUpdate = await this.battleService.processPlayerSkill(
        playerId,
        skillIdToUse,
      );

      if (combatUpdate) {
        client.emit('combatUpdate', combatUpdate);
      }
    } catch (error) {
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

    const inventorySlots =
      await this.inventoryService.getInventory(characterId);

    client.emit('updateInventory', { slots: inventorySlots });
  }

  @SubscribeMessage('requestKeywords')
  async handleRequestKeywords(@ConnectedSocket() client: SocketWithAuth) {
    const characterId = client.data.user?.character?.id;
    if (!characterId) {
      client.emit('serverMessage', 'Erro: Personagem não encontrado.');
      return;
    }

    try {
      const keywords = await this.ecoService.getCharacterKeywords(characterId);
      client.emit('updateKeywords', { keywords: keywords });
    } catch (error) {
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

    try {
      const availableSkills =
        await this.skillService.getAvailableSkillsForCharacter(characterId);
      client.emit('updateAvailableSkills', { skills: availableSkills });
    } catch (error) {
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

    try {
      const learnedSkills =
        await this.skillService.getLearnedSkills(characterId);
      client.emit('updateLearnedSkills', { skills: learnedSkills });
    } catch (error) {
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

  // --- LÓGICA DO PRÓLOGO (CORRIGIDA) ---

  private triggerPrologueEvent(client: SocketWithAuth): void {
    const character = client.data.user?.character;
    if (!character || character.prologueState === 'COMPLETED') {
      return;
    }

    const state = character.prologueState;
    console.log(`[Prologue] Disparando evento para estado: ${state}`);

    switch (state) {
      case 'SCENE_1_START':
        client.emit('prologueUpdate', {
          step: 'SCENE_1_START',
          message:
            '>> Tarefa: Otimizar Fluxo de Dados 7-Alfa. Aproxime-se do <span class="highlight-interact">Terminal Primário</span> e inicie a calibração. <<',
          targetId: 'terminal_primario_01',
          scene: '',
        });
        break;

      default:
        console.warn(`[Prologue] Estado do prólogo desconhecido: ${state}`);
    }
  }

  @SubscribeMessage('prologueInteract')
  async handlePrologueInteract(
    @ConnectedSocket() client: SocketWithAuth,
    @MessageBody() payload: { targetId?: string },
  ) {
    const character = client.data.user?.character;
    if (!character || character.prologueState === 'COMPLETED') return;

    const state = character.prologueState;
    const characterId = character.id;

    console.log(
      `[Prologue] Interação recebida: ${payload.targetId} no estado ${state}`,
    );

    if (
      state === 'SCENE_1_START' &&
      payload.targetId === 'terminal_primario_01'
    ) {
      const newState = 'SCENE_1_GLITCH';
      await this.prisma.character.update({
        where: { id: characterId },
        data: { prologueState: newState },
      });

      character.prologueState = newState;

      client.emit('prologueUpdate', {
        step: newState,
        message:
          '//- PROJETO RESSONÂNCIA :: ECO DETECTADO :: AMEAÇA NÍVEL S_GMA -//',
        scene: '',
        targetId: '',
      });
    }
  }

  @SubscribeMessage('prologueChoice')
  handlePrologueChoice(
    @ConnectedSocket() client: SocketWithAuth,
    @MessageBody() payload: { choiceId: string },
  ) {
    const character = client.data.user?.character;
    if (!character || character.prologueState === 'COMPLETED') return;

    const state = character.prologueState;
    const characterId = character.id;

    console.log(
      `[Prologue] Escolha recebida: ${payload.choiceId} no estado ${state}`,
    );
  }

  // --- FIM DA LÓGICA DO PRÓLOGO ---

  // --- OUVINTES DE EVENTOS ---

  @OnEvent('combat.win.stats')
  handleCombatWinStatsEvent(payload: {
    playerId: string;
    newTotalXp: string;
    goldGained: number;
    newLevel?: number;
  }) {
    const clientSocket = this.getClientSocket(payload.playerId);
    if (clientSocket) {
      clientSocket.emit('playerUpdated', {
        newTotalXp: payload.newTotalXp,
        goldGained: payload.goldGained,
        newLevel: payload.newLevel,
      });
    }
  }

  @OnEvent('combat.win.loot')
  handleCombatWinLootEvent(payload: {
    playerId: string;
    drops: LootDropPayload[];
  }) {
    const clientSocket = this.getClientSocket(payload.playerId);
    if (clientSocket) {
      clientSocket.emit('lootReceived', { drops: payload.drops });
    }
  }

  @OnEvent('combat.end')
  handleCombatEndEvent(payload: {
    playerId: string;
    result: 'win' | 'loss' | 'flee';
  }) {
    const clientSocket = this.getClientSocket(payload.playerId);
    if (clientSocket) {
      clientSocket.emit('combatEnd', payload.result);
    }
  }

  @OnEvent('character.vitals.updated')
  handleVitalsUpdated(payload: {
    characterId: string;
    vitals: { hp: number; maxHp: number; eco: number; maxEco: number };
  }) {
    const { characterId, vitals } = payload;
    const clientSocket = this.getClientSocket(characterId);
    if (clientSocket) {
      clientSocket.emit('playerVitalsUpdated', vitals);
      if (clientSocket.data.user?.character) {
        clientSocket.data.user.character = {
          ...clientSocket.data.user.character,
          ...vitals,
        };
      }
    }
  }

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
    const clientSocket = this.getClientSocket(characterId);
    if (clientSocket) {
      clientSocket.emit('playerBaseStatsUpdated', baseStats);
      if (clientSocket.data.user?.character) {
        clientSocket.data.user.character = {
          ...clientSocket.data.user.character,
          ...baseStats,
        };
      }
    }
  }

  @OnEvent('character.keyword.gained')
  async handleKeywordGained(payload: {
    characterId: string;
    keywordName: string;
    keywordDescription: string;
  }) {
    const { characterId, keywordName, keywordDescription } = payload;
    const clientSocket = this.getClientSocket(characterId);
    if (clientSocket) {
      clientSocket.emit(
        'serverMessage',
        `✨ Eco Absorvido: ${keywordName} - ${keywordDescription}`,
      );

      try {
        await this.handleRequestKeywords(clientSocket);
        await this.handleRequestAvailableSkills(clientSocket);
      } catch (error) {
        console.error(
          `[GameGateway] Erro ao emitir atualizações pós-keyword para ${characterId}:`,
          error,
        );
      }
    }
  }

  getClientSocket(playerId: string): SocketWithAuth | undefined {
    const sockets = Array.from(
      this.server.sockets.sockets.values(),
    ) as SocketWithAuth[];
    return sockets.find((s) => s.data.user?.character?.id === playerId);
  }

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

    // --- BLOQUEAR ENVIO DE SALA DURANTE O PRÓLOGO ---
    if (client.data.user.character.prologueState !== 'COMPLETED') {
      return;
    }
    // --- FIM DO BLOQUEIO ---

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
