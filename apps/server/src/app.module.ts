import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { GameModule } from './game/game.module';
import { BattleModule } from './battle/battle.module';

@Module({
  imports: [AuthModule, GameModule, BattleModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
