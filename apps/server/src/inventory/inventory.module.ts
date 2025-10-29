import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaModule } from 'src/prisma/prisma.module'; // 1. IMPORTE
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [PrismaModule, EventEmitterModule], // 2. ADICIONE AQUI
  providers: [InventoryService],
  exports: [InventoryService], // Exporta o serviço para o GameGateway usar
})
export class InventoryModule {}
