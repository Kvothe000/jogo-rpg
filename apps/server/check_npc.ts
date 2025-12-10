require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Checking NPC Templates...');
    const templates = await prisma.nPCTemplate.findMany({
        where: { name: { contains: 'Velho' } } // Busca genérica
    });

    console.log('Templates found:', templates);

    console.log('Checking NPC Instances in cl_starter_room...');
    const room = await prisma.gameMap.findUnique({
        where: { id: 'cl_starter_room' },
        include: { npcInstances: { include: { template: true } } }
    });

    if (room && room.npcInstances) {
        room.npcInstances.forEach(npc => {
            console.log(`- Instance ID: ${npc.id}`);
            console.log(`- Template Name: "${npc.template.name}"`); // Aspas para ver espaços
        });
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
