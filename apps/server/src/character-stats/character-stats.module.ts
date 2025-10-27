import { Module } from '@nestjs/common';
import { CharacterStatsService } from './character-stats.service';
import { PrismaModule } from 'src/prisma/prisma.module'; // 1. IMPORTE

@Module({
  imports: [PrismaModule], // 2. ADICIONE
  providers: [CharacterStatsService],
  exports: [CharacterStatsService], // Exporta para outros módulos usarem
})
export class CharacterStatsModule {}
