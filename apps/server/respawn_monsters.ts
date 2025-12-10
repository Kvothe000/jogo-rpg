import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

const ROOM_ID_START = 'cl_starter_room';
const MONSTER_TEMPLATE_SLIME = 'mon_slime_mana';
const MONSTER_TEMPLATE_GOBLIN = 'mon_goblin_peon';

async function main() {
    console.log('🔄 Checking for monsters in Starter Room...');

    // 1. Check Slime
    const slimeCount = await prisma.nPCInstance.count({
        where: {
            mapId: ROOM_ID_START,
            templateId: MONSTER_TEMPLATE_SLIME,
        },
    });

    if (slimeCount === 0) {
        console.log('⚠️ Slime missing. Respawning...');
        // Fetch template to get HP
        const template = await prisma.nPCTemplate.findUnique({ where: { id: MONSTER_TEMPLATE_SLIME } });
        if (template) {
            const stats = template.stats as any;
            await prisma.nPCInstance.create({
                data: {
                    templateId: MONSTER_TEMPLATE_SLIME,
                    mapId: ROOM_ID_START,
                    currentHp: stats?.hp || 50,
                    // maxHp removed
                }
            });
            console.log('✅ Slime Respawned!');
        } else {
            console.error('❌ Slime Template not found!');
        }
    } else {
        console.log('✅ Slime exists.');
    }

    // 2. Check Goblin
    const goblinCount = await prisma.nPCInstance.count({
        where: {
            mapId: ROOM_ID_START,
            templateId: MONSTER_TEMPLATE_GOBLIN,
        },
    });

    if (goblinCount === 0) {
        console.log('⚠️ Goblin missing. Respawning...');
        // Fetch template to get HP
        const template = await prisma.nPCTemplate.findUnique({ where: { id: MONSTER_TEMPLATE_GOBLIN } });
        if (template) {
            const stats = template.stats as any;
            await prisma.nPCInstance.create({
                data: {
                    templateId: MONSTER_TEMPLATE_GOBLIN,
                    mapId: ROOM_ID_START,
                    currentHp: stats?.hp || 80,
                    // maxHp removed
                }
            });
            console.log('✅ Goblin Respawned!');
        } else {
            console.error('❌ Goblin Template not found!');
        }
    } else {
        console.log('✅ Goblin exists.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
