import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const id = 'item_bateria_eco_pequena';
    console.log(`Checking for Item ID: ${id}...`);

    const item = await prisma.item.findUnique({
        where: { id: id }
    });

    if (item) {
        console.log('✅ ITEM EXISTS:', item);
    } else {
        console.log('❌ ITEM DOES NOT EXIST.');

        // Check for similar items
        const allItems = await prisma.item.findMany();
        console.log('Available Items:', allItems.map(i => i.id));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
