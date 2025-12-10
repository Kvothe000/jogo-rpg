import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Iniciando limpeza da Tutorial Dungeon...');

    const tutorialRooms = [
        'td_room_01_entrance',
        'td_room_02_combat',
        'td_room_03_puzzle',
        'td_room_04_boss',
        'td_room_05_reward'
    ];

    console.log('1. Removendo TODOS os NPCs das salas:', tutorialRooms);

    const result = await prisma.nPCInstance.deleteMany({
        where: {
            mapId: { in: tutorialRooms }
        }
    });

    console.log(`✅ Removidos ${result.count} NPCs antigos.`);

    console.log('2. Atualizando Stats do Boss (Sentinela Defeituosa)...');
    await prisma.nPCTemplate.update({
        where: { id: 'mon_broken_sentry' },
        data: {
            stats: {
                hp: 40,
                attack: 4,
                defense: 0,
                xp: 80,
                goldMin: 20,
                goldMax: 50,
                level: 2,
                resistances: { physical: 0.1, lightning: -0.2 },
                skills: [
                    { name: 'Choque Estático', chance: 0.3, effectData: { type: 'damage', value: 5, element: 'lightning' } }
                ]
            }
        }
    });
    console.log('✅ Boss nerfed (HP -> 40).');

    console.log('3. Atualizando Stats dos Ratos...');
    await prisma.nPCTemplate.update({
        where: { id: 'mon_cable_rat' },
        data: {
            stats: {
                hp: 20,
                attack: 3,
                defense: 0,
                xp: 15,
                goldMin: 1,
                goldMax: 3,
                level: 1,
                skills: [{ name: 'Mordida', chance: 0.4, effectData: { type: 'damage', value: 3 } }]
            }
        }
    });
    console.log('✅ Rats nerfed.');

    console.log('⚠️ AGORA EXECUTE: npx prisma db seed');
    console.log('Isso irá repopular a dungeon com a quantidade correta.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
