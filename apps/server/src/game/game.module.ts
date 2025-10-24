import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { AuthModule } from 'src/auth/auth.module'; // 1. IMPORTE
import { PrismaModule } from 'src/prisma/prisma.module'; // 2. IMPORTE
import { BattleModule } from 'src/battle/battle.module';

@Module({
  imports: [AuthModule, PrismaModule, BattleModule], // 3. ADICIONE AQUI
  providers: [GameGateway],
})
export class GameModule {}
