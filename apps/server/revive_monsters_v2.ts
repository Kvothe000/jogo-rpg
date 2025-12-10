import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- REVIVING MONSTERS AGAIN ---');

    const tutorialRooms = ['td_room_02_combat', 'td_room_04_boss'];

    for (const roomId of tutorialRooms) {
        const monsters = await prisma.nPCInstance.findMany({
            where: { mapId: roomId },
            include: { template: true }
        });

        for (const mon of monsters) {
            const maxHp = (mon.template.stats as any)?.hp || 20;
            await prisma.nPCInstance.update({
                where: { id: mon.id },
                data: { currentHp: maxHp }
            });
            console.log(`✅ Revived ${mon.template.name} (HP: ${maxHp})`);
        }
    }
    console.log('--- DONE ---');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
