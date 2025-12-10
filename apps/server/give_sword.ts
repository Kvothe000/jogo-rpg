import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Ensure Equipment Item Exists
    const sword = await prisma.item.upsert({
        where: { name: 'Lâmina Curta de Plasma' },
        update: {},
        create: {
            name: 'Lâmina Curta de Plasma',
            description: 'Uma lâmina retrátil padrão para operativos da Cidadela.',
            type: 'EQUIPMENT',
            slot: 'WEAPON',
            stats: {
                strength: 5,
                attack: 10
            },
            price: 150
        }
    });

    console.log(`🗡️ Item guaranteed: ${sword.name} (${sword.id})`);

    // 2. Give to ALL Players (for simplicity in dev)
    const characters = await prisma.character.findMany();

    for (const char of characters) {
        console.log(`Giving sword to ${char.name}...`);

        // Check if already has
        const existingSlot = await prisma.inventorySlot.findFirst({
            where: { characterId: char.id, itemId: sword.id }
        });

        if (!existingSlot) {
            await prisma.inventorySlot.create({
                data: {
                    characterId: char.id,
                    itemId: sword.id,
                    quantity: 1,
                    isEquipped: false
                }
            });
            console.log(`✅ Sword added to inventory.`);
        } else {
            console.log(`⚠️ Already has sword.`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
