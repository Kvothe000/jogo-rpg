import { Module } from '@nestjs/common';
import { EcoService } from './eco.service';
import { PrismaModule } from 'src/prisma/prisma.module'; // 1. IMPORTE

@Module({
  imports: [PrismaModule], // 2. ADICIONE AOS IMPORTS
  providers: [EcoService],
  exports: [EcoService], // 3. EXPORTE O SERVIÇO
})
export class EcoModule {}
