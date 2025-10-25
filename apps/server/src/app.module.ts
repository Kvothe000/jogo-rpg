import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { GameModule } from './game/game.module';
import { BattleModule } from './battle/battle.module';
import { EventEmitterModule } from '@nestjs/event-emitter'; // 1. IMPORTE
import { InventoryModule } from './inventory/inventory.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    GameModule,
    BattleModule,
    EventEmitterModule.forRoot(),
    InventoryModule, // 2. ADICIONE AQUI
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
