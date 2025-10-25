import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaModule } from 'src/prisma/prisma.module'; // 1. IMPORTE

@Module({
  imports: [PrismaModule], // 2. ADICIONE AQUI
  providers: [InventoryService],
  exports: [InventoryService], // Exporta o serviço para o GameGateway usar
})
export class InventoryModule {}
