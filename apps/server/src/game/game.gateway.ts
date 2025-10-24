import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import type { SocketWithAuth } from './types/socket-with-auth.type';
import {
  // ... (outros imports)
  ConnectedSocket, // <-- ADICIONE ESTE
} from '@nestjs/websockets';

// 1. CORREÇÃO DO IMPORT (TS2307)
// O tipo 'TokenPayload' está DENTRO do 'user-payload.type.ts'
import type { TokenPayload } from 'src/auth/types/user-payload.type';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { GameMap } from '@prisma/client';
import { BattleService } from 'src/battle/battle.service';

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  afterInit(_server: Server) {
    console.log('🎮 GameGateway Inicializado!');
  }

  // 2. CORREÇÃO DO HANDLECONNECTION (TS2304)
  // Restauramos a lógica de autenticação (o try...catch)
  async handleConnection(client: SocketWithAuth) {
    try {
      // 1. Pegar o token
      const authHeader = client.handshake.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Token não fornecido ou mal formatado');
      }
      const token: string = authHeader.split(' ')[1];

      // 2. Verificar o token
      const payload = this.jwtService.verify<TokenPayload>(token, {
        secret: this.jwtSecret,
      });

      // 3. Buscar o usuário no banco (aqui definimos a var 'user')
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { character: true },
      });

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _removedHash, ...userPayload } = user;
      client.data.user = userPayload;

      console.log(`✅ Cliente Conectado: ${userPayload.email}`);

      // ESTA LINHA CORRIGE O PROBLEMA DE TIMING
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

  @SubscribeMessage('playerLook')
  async handlePlayerLook(
    // MUDE AQUI: Use @ConnectedSocket()
    @ConnectedSocket() client: SocketWithAuth,
  ) {
    // O resto da função continua igual
    await this.sendRoomDataToClient(client);
  }

  @SubscribeMessage('playerMove')
  async handlePlayerMove(
    // MUDE AQUI: Use @ConnectedSocket() em vez do primeiro parâmetro
    @ConnectedSocket() client: SocketWithAuth,
    @MessageBody() direction: string,
  ) {
    // O resto da função continua igual
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

  private async sendRoomDataToClient(client: SocketWithAuth) {
    if (!client.data.user.character) {
      client.emit('serverMessage', 'Erro: Personagem não encontrado.');
      return;
    }

    const mapId = client.data.user.character.mapId;
    const currentPlayerId = client.data.user.character.id;

    // ----- VERIFIQUE ESTA PARTE COM MUITA ATENÇÃO -----
    const room = await this.prisma.gameMap.findUnique({
      where: { id: mapId },
      include: {
        // <<<---- GARANTA QUE ESTE 'include' EXISTE E ESTÁ CORRETO
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
    // ----- FIM DA VERIFICAÇÃO -----

    if (room) {
      const otherPlayers = room.characters.filter(
        (char) => char.id !== currentPlayerId,
      );
      const npcsInRoom = room.npcInstances.map((instance) => ({
        id: instance.id,
        name: instance.template.name,
      }));

      // ----- VERIFIQUE SE O EMIT INCLUI 'players' E 'npcs' -----
      client.emit('updateRoom', {
        name: room.name,
        description: room.description,
        exits: room.exits as Record<string, string>,
        players: otherPlayers, // <<<---- GARANTA QUE ESTÁ AQUI
        npcs: npcsInRoom, // <<<---- GARANTA QUE ESTÁ AQUI
      });
      // ----- FIM DA VERIFICAÇÃO -----
    }
  }
  // NOVO: Ouvinte para interação com NPC
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

    // 1. Verificar se a instância do NPC existe E está na mesma sala
    const npcInstance = await this.prisma.nPCInstance.findFirst({
      where: {
        id: npcInstanceId,
        mapId: playerRoomId, // Crucial: NPC TEM que estar na mesma sala
      },
      include: {
        template: true, // Precisamos do nome do template
      },
    });

    // 2. Se o NPC não for encontrado (ou estiver em outra sala)
    if (!npcInstance) {
      client.emit('serverMessage', 'Não há ninguém com esse nome aqui.');
      return;
    }

    // 3. Lógica de Diálogo Simples (Hardcoded por enquanto)
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

    // 4. Enviar o diálogo APENAS para o cliente que interagiu
    client.emit('npcDialogue', {
      npcName: npcName,
      dialogue: dialogue,
    });
  }

  // 3. NOVO: Ouvinte para Iniciar Combate
  @SubscribeMessage('startCombat')
  async handleStartCombat(@ConnectedSocket() client: SocketWithAuth) {
    if (!client.data.user.character) {
      client.emit('serverMessage', 'Erro: Personagem não encontrado.');
      return;
    }

    // Usamos nosso monstro de teste
    const MONSTER_ID = 'mon_slime_mana';

    const combatData = await this.battleService.initializeCombat(
      client.data.user,
      MONSTER_ID,
    );

    if (combatData) {
      // 4. Responde ao cliente com o início do combate
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
  // NOVO: Ouvinte para o ataque do jogador
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

  // Crie a função utilitária 'getClientSocket' (que faltava)
  getClientSocket(playerId: string): SocketWithAuth | undefined {
    // Encontra o socket que tem o CharacterId no data
    return Array.from(this.server.sockets.sockets.values()).find(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (s) => s.data.user.character?.id === playerId,
    ) as SocketWithAuth | undefined;
  }
  // 3. CORREÇÃO DO DISCONNECT (TS2420)
  // Restauramos o método que estava faltando
  handleDisconnect(client: SocketWithAuth) {
    const user = client.data.user;
    if (user) {
      console.log(`🔌 Cliente Desconectado: ${user.email}`);
    } else {
      console.log('🔌 Cliente (não autenticado) Desconectado');
    }
    // TODO: Remover o cliente da sala/mundo
  }

  // ... (Aqui virá o handleChatMessage que você talvez já tenha do Passo 15)
} // Fim da classe
