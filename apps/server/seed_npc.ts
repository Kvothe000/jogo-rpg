import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
    const roomId = 'cl_starter_room';

    // 1. Check/Create Template
    let template = await prisma.nPCTemplate.findFirst({
        where: { name: 'Supervisor de Sistema' }
    });

    if (!template) {
        console.log("Creating Template...");
        template = await prisma.nPCTemplate.create({
            data: {
                name: 'Supervisor de Sistema',
                description: 'Um autômato flutuante com LEDs cansados.',
                isHostile: false,
                stats: {
                    dialogue: "Sua sincronização neural estabilizou. Não se acostume com o conforto. O Eco está agitado hoje."
                }
            }
        });
    }

    // 2. Check/Create Instance
    const existingInstance = await prisma.nPCInstance.findFirst({
        where: {
            mapId: roomId,
            templateId: template.id
        }
    });

    if (!existingInstance) {
        console.log("Spawning NPC in Starter Room...");
        await prisma.nPCInstance.create({
            data: {
                templateId: template.id,
                mapId: roomId,
                currentHp: 100
            }
        });
        console.log("NPC Spawned!");
    } else {
        console.log("NPC already exists here.");
    }
}

seed()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
