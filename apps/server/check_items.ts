import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const items = await prisma.item.findMany();
    console.table(items.map(i => ({ id: i.id, name: i.name, type: i.type, slot: i.slot })));

    const templates = await prisma.nPCTemplate.findMany();
    console.table(templates.map(t => ({ id: t.id, name: t.name, loot: JSON.stringify(t.lootTable) })));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
