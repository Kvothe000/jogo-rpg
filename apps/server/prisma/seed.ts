import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// IDs fixos para podermos nos referir a eles
const ROOM_ID_START = 'cl_starter_room';
const ROOM_ID_HALLWAY = 'cl_hallway_01';
const NPC_TEMPLATE_GUARD = 'npc_template_guard';
const MONSTER_TEMPLATE_SLIME = 'mon_slime_mana';
const ITEM_SLIME_GOO = 'item_slime_goo';

async function main() {
  console.log('Iniciando o script de seed v2...');

  // --- 1. Criar a Sala Inicial (com uma saída) ---
  await prisma.gameMap.upsert({
    where: { id: ROOM_ID_START },
    update: {
      exits: {
        norte: ROOM_ID_HALLWAY, // Saída para o corredor
      },
    },
    create: {
      id: ROOM_ID_START,
      name: 'Ponto de Partida',
      description:
        'Um espaço silencioso e empoeirado. À sua frente, um portal quebrado emite uma luz fraca. Ao NORTE, você vê a arcada de um corredor escuro.',
      exits: {
        norte: ROOM_ID_HALLWAY, // Saída para o corredor
      },
    },
  });
  console.log('Sala inicial criada/atualizada.');

  // --- 2. Criar a Segunda Sala ---
  await prisma.gameMap.upsert({
    where: { id: ROOM_ID_HALLWAY },
    update: {},
    create: {
      id: ROOM_ID_HALLWAY,
      name: 'Corredor da Cidadela',
      description:
        'Um corredor frio de pedra. A luz da Cidadela mal penetra aqui. O ar está pesado. A única saída visível é de volta ao Ponto de Partida, ao SUL.',
      exits: {
        sul: ROOM_ID_START, // Saída de volta
      },
    },
  });
  console.log('Segunda sala criada.');
  // --- 2. NOVO: Criar o Template do NPC ---
  const guardTemplate = await prisma.nPCTemplate.upsert({
    where: { id: NPC_TEMPLATE_GUARD },
    update: {},
    create: {
      id: NPC_TEMPLATE_GUARD,
      name: 'Guarda da Cidadela',
      description: 'Um guarda com armadura reluzente, rosto impassível.',
      isHostile: false, // Não é um monstro
      stats: {}, // Stats vazios por enquanto
      lootTable: {}, // Loot vazio
    },
  });
  console.log('Template de NPC criado:', guardTemplate.name);

  // --- 3. NOVO: Colocar uma Instância do NPC no Corredor ---
  // Primeiro, garanta que não haja guardas duplicados nessa sala
  await prisma.nPCInstance.deleteMany({
    where: {
      templateId: NPC_TEMPLATE_GUARD,
      mapId: ROOM_ID_HALLWAY,
    },
  });
  // Agora, crie a instância
  const guardInstance = await prisma.nPCInstance.create({
    data: {
      template: { connect: { id: NPC_TEMPLATE_GUARD } }, // Liga ao template
      map: { connect: { id: ROOM_ID_HALLWAY } }, // Liga à sala
    },
  });
  console.log('Instância de NPC criada no corredor:', guardInstance.id);
  // --- 3. Template do Monstro (ATUALIZADO) ---
  const slimeTemplate = await prisma.nPCTemplate.upsert({
    where: { id: MONSTER_TEMPLATE_SLIME },
    update: {
      // ATUALIZA A LOOT TABLE
      lootTable: {
        drops: [{ itemId: ITEM_SLIME_GOO, chance: 0.75, minQty: 1, maxQty: 3 }], // 75% chance de dropar 1-3 Gosmas
      },
    },
    create: {
      id: MONSTER_TEMPLATE_SLIME,
      name: 'Slime de Mana Fraco',
      description: 'Uma bolha de mana gelatinosa, Rank E.',
      isHostile: true,
      stats: {
        hp: 50,
        attack: 10,
        defense: 5,
        xp: 50,
        goldMin: 5,
        goldMax: 15,
      },
      lootTable: {
        // DEFINE NA CRIAÇÃO TAMBÉM
        drops: [{ itemId: ITEM_SLIME_GOO, chance: 0.75, minQty: 1, maxQty: 3 }],
      },
    },
  });
  console.log('Template de Monstro criado/atualizado:', slimeTemplate.name);

  // --- 4. NOVO: Criar o Item de Loot ---
  await prisma.item.upsert({
    where: { id: ITEM_SLIME_GOO },
    update: {},
    create: {
      id: ITEM_SLIME_GOO,
      name: 'Gosma de Slime',
      description: 'Um resíduo pegajoso deixado por um Slime de Mana.',
      type: 'MATERIAL', // Definido no Enum ItemType
      // slot: null, // Não é equipamento
      // stats: {}, // Não dá stats
      price: 5, // Pode ser vendido por 5 gold
    },
  });
  console.log('Item de Loot criado: Gosma de Slime');
  // --- 3. Criar as Facções (CÓDIGO COMPLETO) ---
  await prisma.faction.upsert({
    where: { name: 'Cidadela da Ordem' },
    update: {},
    create: {
      name: 'Cidadela da Ordem',
      description:
        'Busca controlar a Interface e caça Renegados por vê-los como anomalias perigosas.',
    },
  });

  await prisma.faction.upsert({
    where: { name: 'Os Livres' },
    update: {},
    create: {
      name: 'Os Livres',
      description:
        'Um grupo de foras da lei que abraça o potencial dos Renegados.',
    },
  });
  console.log('Facções criadas.');

  console.log('Seed v2 concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
