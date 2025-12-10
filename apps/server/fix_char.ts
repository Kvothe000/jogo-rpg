require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Fixing character "asdhuifo" (User: ola1@ola1.com)...');

    // Find the character
    const char = await prisma.character.findFirst({
        where: { user: { email: 'ola1@ola1.com' } }
    });

    if (!char) {
        console.error('Character not found!');
        return;
    }

    // Update to correct initial state
    await prisma.character.update({
        where: { id: char.id },
        data: {
            prologueState: 'SCENE_1_INTRO',
            mapId: 'pr_optimization_sector'
        }
    });

    console.log('✅ Fixed! Reset to SCENE_1_INTRO.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
