import { Module } from '@nestjs/common';
import { QuestService } from './quest.service';
import { PrismaModule } from 'src/prisma/prisma.module';

import { InventoryModule } from 'src/inventory/inventory.module';

@Module({
    imports: [PrismaModule, InventoryModule],
    providers: [QuestService],
    exports: [QuestService],
})
export class QuestModule { }
