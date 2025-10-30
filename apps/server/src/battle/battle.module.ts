// apps/server/src/battle/battle.module.ts

import { forwardRef, Module } from '@nestjs/common';
import { BattleService } from './battle.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GameModule } from 'src/game/game.module';
import { CharacterStatsModule } from 'src/character-stats/character-stats.module';
import { SkillModule } from 'src/skill/skill.module'; // 1. IMPORTE SkillModule
import { EcoModule } from 'src/eco/eco.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => GameModule), // GameModule usa BattleService
    CharacterStatsModule,
    SkillModule, // 2. ADICIONE SkillModule AQUI
    EcoModule,
  ],
  providers: [BattleService],
  exports: [BattleService],
})
export class BattleModule {}
