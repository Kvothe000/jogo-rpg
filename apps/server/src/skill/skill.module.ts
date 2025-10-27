// apps/server/src/skill/skill.module.ts

import { Module } from '@nestjs/common';
import { SkillService } from './skill.service';
import { PrismaModule } from 'src/prisma/prisma.module'; // 1. IMPORTE

@Module({
  imports: [PrismaModule], // 2. ADICIONE AOS IMPORTS
  providers: [SkillService],
  exports: [SkillService], // 3. EXPORTE O SERVIÇO para outros módulos usarem
})
export class SkillModule {}
