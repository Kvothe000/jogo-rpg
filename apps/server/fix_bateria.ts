import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const ITEM_SMALL_ECO_BATTERY = 'item_bateria_eco_pequena';

    console.log(`Fixing Item ID: ${ITEM_SMALL_ECO_BATTERY}...`);

    const item = await prisma.item.upsert({
        where: { id: ITEM_SMALL_ECO_BATTERY },
        update: {},
        create: {
            id: ITEM_SMALL_ECO_BATTERY,
            name: 'Bateria de Eco Menor',
            description: 'Recupera uma pequena quantidade de Eco.',
            type: 'CONSUMABLE',
            effectData: { restoreEco: 25 },
            price: 20,
        },
    });

    console.log('✅ ITEM CREATED/UPDATED:', item);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
