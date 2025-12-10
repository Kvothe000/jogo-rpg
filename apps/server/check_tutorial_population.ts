import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Verificando População da Tutorial Dungeon...');

    const room2Count = await prisma.nPCInstance.count({ where: { mapId: 'td_room_02_combat' } });
    console.log(`Room 2 (Ratos): ${room2Count} NPCs`);

    const room4Count = await prisma.nPCInstance.count({ where: { mapId: 'td_room_04_boss' } });
    console.log(`Room 4 (Boss): ${room4Count} NPCs`);

    const room5Count = await prisma.nPCInstance.count({ where: { mapId: 'td_room_05_reward' } });
    console.log(`Room 5 (Reward): ${room5Count} NPCs`);

    if (room2Count === 0 && room4Count === 0) {
        console.log('❌ ALERTA: Dungeon vazia!');
    } else {
        console.log('✅ Dungeon populada.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
