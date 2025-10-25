import { forwardRef, Module } from '@nestjs/common'; // 1. RE-IMPORTE forwardRef
import { GameGateway } from './game.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BattleModule } from 'src/battle/battle.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    forwardRef(() => BattleModule), // 2. USE forwardRef AQUI
  ],
  providers: [GameGateway],
  // exports: [GameGateway], // Mantenha comentado/removido
})
export class GameModule {}
