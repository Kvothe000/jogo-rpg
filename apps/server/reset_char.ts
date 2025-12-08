import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const charId = 'cmhjfpvf50002t58gsvb7whyk';

    console.log(`Resetting character ${charId}...`);

    await prisma.character.update({
        where: { id: charId },
        data: {
            prologueState: 'NOT_STARTED',
            prologueData: {},
            mapId: 'pr_optimization_sector' // Garantir que ele volte para a sala do prólogo se tiver saído
        }
    });

    console.log('✅ Character reset successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
