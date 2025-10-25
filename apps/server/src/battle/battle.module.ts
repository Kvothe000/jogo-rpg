import { forwardRef, Module } from '@nestjs/common'; // 1. RE-IMPORTE forwardRef
import { BattleService } from './battle.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GameModule } from 'src/game/game.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => GameModule), // 2. USE forwardRef AQUI
  ],
  providers: [BattleService],
  exports: [BattleService],
})
export class BattleModule {}
