import { forwardRef, Module } from '@nestjs/common';
import { BattleService } from './battle.service';
import { PrismaModule } from 'src/prisma/prisma.module'; // 1. IMPORTAR
import { GameModule } from 'src/game/game.module';

@Module({
  imports: [
    PrismaModule, // 2. ADICIONAR AQUI
    forwardRef(() => GameModule),
  ],
  providers: [BattleService],
  exports: [BattleService],
})
export class BattleModule {}
