require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Checking recent characters...');
    const characters = await prisma.character.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { user: true }
    });

    characters.forEach(char => {
        console.log(`--- Character: ${char.name} (User: ${char.user.email}) ---`);
        console.log('ID:', char.id);
        console.log('PrologueState:', char.prologueState);
        console.log('MapID:', char.mapId);
        console.log('PrologueData:', char.prologueData);
        console.log('-----------------------------------');
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
