import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Create/Update a Test Skill
    const skill = await prisma.skill.upsert({
        where: { name: 'Golpe Sônico' },
        update: {},
        create: {
            name: 'Golpe Sônico',
            description: 'Um ataque rápido infundido com eco vibracional.',
            ecoCost: 10,
            effectData: {
                type: 'damage',
                value: 15 // Base damage
            }
        }
    });
    console.log(`⚡ Skill ensured: ${skill.name}`);

    // 2. Teach to Characters
    const characters = await prisma.character.findMany();

    for (const char of characters) {
        // Check if already learned
        const known = await prisma.characterSkill.findUnique({
            where: {
                characterId_skillId: {
                    characterId: char.id,
                    skillId: skill.id
                }
            }
        });

        if (!known) {
            await prisma.characterSkill.create({
                data: {
                    characterId: char.id,
                    skillId: skill.id,
                    level: 1
                }
            });
            console.log(`✅ Learned by ${char.name}`);
        } else {
            console.log(`⚠️ ${char.name} already knows this.`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
