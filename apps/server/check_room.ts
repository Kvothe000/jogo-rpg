require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Checking for cl_starter_room...');
    const room = await prisma.gameMap.findUnique({
        where: { id: 'cl_starter_room' }
    });

    if (room) {
        console.log('✅ Room FOUND:', room.name);
    } else {
        console.log('❌ Room NOT FOUND. Seeds need to be run.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
