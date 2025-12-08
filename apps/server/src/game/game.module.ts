import { forwardRef, Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BattleModule } from 'src/battle/battle.module';
import { InventoryModule } from 'src/inventory/inventory.module';
import { CharacterStatsModule } from 'src/character-stats/character-stats.module';
import { EcoModule } from 'src/eco/eco.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SkillModule } from 'src/skill/skill.module';
import { QuestModule } from 'src/quest/quest.module';

import { PrologueService } from './prologue/prologue.service';
import { RoomService } from './room/room.service';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    forwardRef(() => BattleModule),
    InventoryModule,
    CharacterStatsModule,
    EcoModule,
    SkillModule,
    EventEmitterModule,
    QuestModule,
  ],
  providers: [GameGateway, PrologueService, RoomService],
  // exports: [GameGateway], // Mantenha comentado/removido
})
export class GameModule { }
