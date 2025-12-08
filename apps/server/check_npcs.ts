import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStarterRoom() {
    const room = await prisma.gameMap.findUnique({
        where: { id: 'cl_starter_room' },
        include: { npcInstances: { include: { template: true } } }
    });

    if (!room) {
        console.log("Starter Room NOT FOUND");
        return;
    }

    console.log(`Starter Room: ${room.name}`);
    console.log(`NPCs: ${room.npcInstances.length}`);
    room.npcInstances.forEach(npc => {
        console.log(`- ${npc.template.name} (${npc.id})`);
    });
}

checkStarterRoom()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
