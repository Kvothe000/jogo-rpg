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

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;
  private jwtSecret: string;

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private battleService: BattleService,
  ) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET não está definido!');
    }
    this.jwtSecret = secret;
  }

  afterInit(_server: Server) {
    console.log('🎮 GameGateway Inicializado!');
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

      console.log(`✅ Cliente Conectado: ${userPayload.email}`);
      await this.sendRoomDataToClient(client);
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
      console.log(`🔌 Cliente Desconectado: ${user.email}`);
    } else {
      console.log('🔌 Cliente (não autenticado) Desconectado');
    }
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

    const combatUpdate = await this.battleService.processPlayerAttack(playerId);

    if (combatUpdate) {
      client.emit('combatUpdate', combatUpdate);
    } else {
      client.emit('serverMessage', 'Você não está em combate.');
    }
  }

  // OUVINTE para Recompensa de Stats (RENOMEADO)
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

  // NOVO OUVINTE para Recompensa de Loot
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

  // OUVINTE para Fim de Combate (EXISTENTE)
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

  getClientSocket(playerId: string): SocketWithAuth | undefined {
    return Array.from(this.server.sockets.sockets.values()).find(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (s) => s.data.user.character?.id === playerId,
    ) as SocketWithAuth | undefined;
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
