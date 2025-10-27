import { forwardRef, Module } from '@nestjs/common'; // 1. RE-IMPORTE forwardRef
import { BattleService } from './battle.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GameModule } from 'src/game/game.module';
import { CharacterStatsModule } from 'src/character-stats/character-stats.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => GameModule),
    CharacterStatsModule, // 2. USE forwardRef AQUI
  ],
  providers: [BattleService],
  exports: [BattleService],
})
export class BattleModule {}
