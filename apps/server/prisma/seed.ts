import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// IDs fixos para podermos nos referir a eles
const ROOM_ID_START = 'cl_starter_room';
const ROOM_ID_HALLWAY = 'cl_hallway_01';
const NPC_TEMPLATE_GUARD = 'npc_template_guard';
const MONSTER_TEMPLATE_SLIME = 'mon_slime_mana';
const ITEM_SLIME_GOO = 'item_slime_goo';
const ITEM_SHORT_SWORD = 'item_short_sword';
const ITEM_SMALL_STONE = 'item_pedra_pequena';
// --- NOVOS IDs PARA MONSTROS ---
const GOBLIN_RALE_ID = 'mon_goblin_peon';
const SKELETON_ID = 'mon_skeleton_fragile';
const ORC_SCOUT_ID = 'mon_orc_scout';
// --- FIM DOS IDs ---
// --- IDs PARA KEYWORDS ---
const KW_LAMINA = 'kw_lamina';
const KW_SOMBRA = 'kw_sombra';
const KW_FOGO = 'kw_fogo';
const KW_AGUA = 'kw_agua';
const KW_LUZ = 'kw_luz';
// --- FIM DOS IDs ---
// --- IDs PARA SKILLS ---
const SKILL_LAMINA_INCANDESCENTE = 'sk_lamina_incandescente';
const SKILL_CORTE_DISSIMULADO = 'sk_corte_dissimulado';
const SKILL_GOLPE_PURIFICADOR = 'sk_golpe_purificador';
const SKILL_LAMINA_FLUIDA = 'sk_lamina_fluida';
const SKILL_FOGO_FATUO = 'sk_fogo_fatuo';
const SKILL_EXPLOSAO_SOLAR = 'sk_explosao_solar';
const SKILL_NEVOA_ESCALDANTE = 'sk_nevoa_escaldante';
const SKILL_PRISMA_ILUSORIO = 'sk_prisma_ilusorio';
const SKILL_POCA_SOMBRIA = 'sk_poca_sombria';
const SKILL_BENCAO_RESTAURADORA = 'sk_bencao_restauradora';
// --- FIM DOS IDs ---

async function main() {
  console.log('Iniciando o script de seed v2...');

  // --- 1. Criar a Sala Inicial (com uma saída) ---
  await prisma.gameMap.upsert({
    where: { id: ROOM_ID_START },
    update: {
      exits: {
        norte: ROOM_ID_HALLWAY,
      },
    },
    create: {
      id: ROOM_ID_START,
      name: 'Ponto de Partida',
      description:
        'Um espaço silencioso e empoeirado. À sua frente, um portal quebrado emite uma luz fraca. Ao NORTE, você vê a arcada de um corredor escuro.',
      exits: {
        norte: ROOM_ID_HALLWAY,
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
        sul: ROOM_ID_START,
      },
    },
  });
  console.log('Segunda sala criada.');

  // --- 3. Criar Facções ---
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

  // --- 4. Criar PowerKeywords ---
  await prisma.powerKeyword.upsert({
    where: { id: KW_LAMINA },
    update: {},
    create: {
      id: KW_LAMINA,
      name: 'Lâmina',
      description: 'O conceito de cortar, perfurar e dividir.',
    },
  });

  await prisma.powerKeyword.upsert({
    where: { id: KW_SOMBRA },
    update: {},
    create: {
      id: KW_SOMBRA,
      name: 'Sombra',
      description: 'O conceito de ocultação, escuridão e ilusão.',
    },
  });

  await prisma.powerKeyword.upsert({
    where: { id: KW_FOGO },
    update: {},
    create: {
      id: KW_FOGO,
      name: 'Fogo',
      description: 'O conceito de calor, combustão e destruição.',
    },
  });

  await prisma.powerKeyword.upsert({
    where: { id: KW_AGUA },
    update: {},
    create: {
      id: KW_AGUA,
      name: 'Água',
      description: 'O conceito de fluidez, cura e pressão.',
    },
  });

  await prisma.powerKeyword.upsert({
    where: { id: KW_LUZ },
    update: {},
    create: {
      id: KW_LUZ,
      name: 'Luz',
      description: 'O conceito de iluminação, pureza e energia radiante.',
    },
  });
  console.log('Keywords iniciais criadas.');

  // --- 5. Criar Skills ---
  const skillsData = [
    {
      id: SKILL_LAMINA_INCANDESCENTE,
      name: 'Lâmina Incandescente',
      description: 'Um golpe que imbui a lâmina com fogo, queimando o alvo.',
      ecoCost: 15,
      effectData: [
        {
          type: 'damage',
          value: 10,
          scaleStat: 'strength',
          element: 'physical',
        },
        { type: 'damage', value: 8, element: 'fire' },
        { type: 'status', effect: 'burning', duration: 3, chance: 0.8 },
      ],
      keywords: [KW_LAMINA, KW_FOGO],
    },
    {
      id: SKILL_CORTE_DISSIMULADO,
      name: 'Corte Dissimulado',
      description: 'Um ataque rápido das sombras com alta chance de crítico.',
      ecoCost: 12,
      effectData: [
        {
          type: 'damage',
          value: 12,
          scaleStat: 'dexterity',
          element: 'physical',
          bonusCriticalChance: 0.3,
        },
      ],
      keywords: [KW_LAMINA, KW_SOMBRA],
    },
    {
      id: SKILL_GOLPE_PURIFICADOR,
      name: 'Golpe Purificador',
      description: 'Um ataque radiante que causa dano extra a seres sombrios.',
      ecoCost: 18,
      effectData: [
        {
          type: 'damage',
          value: 15,
          scaleStat: 'strength',
          element: 'physical',
        },
        {
          type: 'damage',
          value: 10,
          element: 'light',
          bonusVsType: ['corrupted'],
        },
      ],
      keywords: [KW_LAMINA, KW_LUZ],
    },
    {
      id: SKILL_LAMINA_FLUIDA,
      name: 'Lâmina Fluida',
      description:
        'Um golpe que flui como água, ignorando parte da defesa e podendo desacelerar.',
      ecoCost: 14,
      effectData: [
        {
          type: 'damage',
          value: 10,
          scaleStat: 'dexterity',
          element: 'physical',
          defensePenetration: 0.2,
        },
        { type: 'status', effect: 'slow', duration: 2, chance: 0.5 },
      ],
      keywords: [KW_LAMINA, KW_AGUA],
    },
    {
      id: SKILL_FOGO_FATUO,
      name: 'Fogo Fátuo',
      description:
        'Dispara um projétil de fogo sombrio que pode confundir o alvo.',
      ecoCost: 20,
      effectData: [
        {
          type: 'damage',
          value: 15,
          scaleStat: 'intelligence',
          element: 'shadowflame',
        },
        { type: 'status', effect: 'confused', duration: 2, chance: 0.4 },
      ],
      keywords: [KW_FOGO, KW_SOMBRA],
    },
    {
      id: SKILL_EXPLOSAO_SOLAR,
      name: 'Explosão Solar',
      description:
        'Uma explosão de luz e fogo que causa dano em área e pode cegar.',
      ecoCost: 30,
      effectData: {
        type: 'aoe',
        radius: 2,
        effects: [
          {
            type: 'damage',
            value: 20,
            scaleStat: 'intelligence',
            element: 'fire_light',
          },
          { type: 'status', effect: 'blind', duration: 1, chance: 0.6 },
        ],
      },
      keywords: [KW_FOGO, KW_LUZ],
    },
    {
      id: SKILL_NEVOA_ESCALDANTE,
      name: 'Névoa Escaldante',
      description: 'Cria uma área de vapor que queima e dificulta a visão.',
      ecoCost: 25,
      effectData: {
        type: 'aoe',
        radius: 3,
        duration: 4,
        effects: [
          { type: 'damage_over_time', value: 5, element: 'fire', interval: 1 },
          { type: 'debuff', stat: 'accuracy', value: -0.2, chance: 1.0 },
        ],
      },
      keywords: [KW_FOGO, KW_AGUA],
    },
    {
      id: SKILL_PRISMA_ILUSORIO,
      name: 'Prisma Ilusório',
      description:
        'Dobra a luz e a sombra para criar ilusões e aumentar a evasão.',
      ecoCost: 22,
      effectData: [
        { type: 'buff', stat: 'evasion', value: 0.3, duration: 5 },
        { type: 'summon', summonId: 'illusion_clone', count: 2, duration: 5 },
      ],
      keywords: [KW_SOMBRA, KW_LUZ],
    },
    {
      id: SKILL_POCA_SOMBRIA,
      name: 'Poça Sombria',
      description:
        'Cria uma área escura e pegajosa que causa dano e prende inimigos.',
      ecoCost: 28,
      effectData: {
        type: 'aoe',
        radius: 2.5,
        duration: 6,
        effects: [
          {
            type: 'damage_over_time',
            value: 4,
            element: 'shadow',
            interval: 1,
          },
          { type: 'status', effect: 'rooted', duration: 1, chance: 0.7 },
        ],
      },
      keywords: [KW_SOMBRA, KW_AGUA],
    },
    {
      id: SKILL_BENCAO_RESTAURADORA,
      name: 'Bênção Restauradora',
      description:
        'Canaliza a luz através da água para curar ferimentos e remover aflições.',
      ecoCost: 20,
      effectData: [
        { type: 'heal', value: 40 },
        { type: 'cleanse', effectType: 'negative', count: 1 },
      ],
      keywords: [KW_LUZ, KW_AGUA],
    },
  ];

  for (const skillData of skillsData) {
    await prisma.skill.upsert({
      where: { id: skillData.id },
      update: {
        name: skillData.name,
        description: skillData.description,
        ecoCost: skillData.ecoCost,
        effectData: skillData.effectData,
      },
      create: {
        id: skillData.id,
        name: skillData.name,
        description: skillData.description,
        ecoCost: skillData.ecoCost,
        effectData: skillData.effectData,
        requiredKeywords: {
          connect: skillData.keywords.map((id) => ({ id })),
        },
      },
    });
  }
  console.log('Skills iniciais baseadas em combinações de Keywords criadas.');

  // --- 6. Criar Itens ---
  await prisma.item.upsert({
    where: { id: ITEM_SLIME_GOO },
    update: {},
    create: {
      id: ITEM_SLIME_GOO,
      name: 'Gosma de Slime',
      description: 'Um resíduo pegajoso deixado por um Slime de Mana.',
      type: 'MATERIAL',
      price: 5,
    },
  });

  await prisma.item.upsert({
    where: { id: ITEM_SHORT_SWORD },
    update: {},
    create: {
      id: ITEM_SHORT_SWORD,
      name: 'Espada Curta Gasta',
      description: 'Uma espada curta básica, um pouco enferrujada.',
      type: 'EQUIPMENT',
      slot: 'WEAPON',
      stats: {
        strength: 5,
      },
      price: 25,
    },
  });

  await prisma.item.upsert({
    where: { id: ITEM_SMALL_STONE },
    update: {},
    create: {
      id: ITEM_SMALL_STONE,
      name: 'Pedra Pequena',
      description: 'Uma pedra comum, pode ser usada para arremesso ou craft.',
      type: 'MATERIAL',
      price: 2,
    },
  });
  console.log('Itens criados.');

  // --- 7. MONSTROS ATUALIZADOS/NOVOS ---

  // Slime de Mana (Rank E)
  await prisma.nPCTemplate.upsert({
    where: { id: MONSTER_TEMPLATE_SLIME },
    update: {
      rank: 'E',
      stats: {
        hp: 80,
        attack: 8,
        defense: 2,
        xp: 40,
        goldMin: 5,
        goldMax: 15,
        critChance: 0.02,
        level: 1,
        resistances: { physical: 0.3, shadowflame: -0.2 },
      },
      types: ['elemental', 'mana_construct'],
    },
    create: {
      id: MONSTER_TEMPLATE_SLIME,
      name: 'Slime de Mana Instável',
      description: 'Uma criatura feita de energia residual dos Scripts.',
      isHostile: true,
      rank: 'E',
      stats: {
        hp: 80,
        attack: 8,
        defense: 2,
        xp: 40,
        goldMin: 5,
        goldMax: 15,
        critChance: 0.02,
        level: 1,
        resistances: { physical: 0.3, shadowflame: -0.2 },
      },
      types: ['elemental', 'mana_construct'],
      lootTable: {
        drops: [{ itemId: ITEM_SLIME_GOO, minQty: 1, maxQty: 3, chance: 0.8 }],
      },
    },
  });

  // Guarda Corrompido (Rank D)
  await prisma.nPCTemplate.upsert({
    where: { id: NPC_TEMPLATE_GUARD },
    update: {
      rank: 'D',
      stats: {
        hp: 120,
        attack: 12,
        defense: 5,
        xp: 60,
        goldMin: 10,
        goldMax: 25,
        level: 3,
        resistances: { light: -0.25 },
        skills: [
          {
            name: 'Golpe Pesado',
            chance: 0.3,
            effectData: {
              type: 'damage',
              value: 10,
              scaleStat: 'strength',
              element: 'physical',
              bonusVsType: [],
            },
          },
        ],
      },
      types: ['humanoid', 'corrupted'],
    },
    create: {
      id: NPC_TEMPLATE_GUARD,
      name: 'Guarda da Cidadela Corrompido',
      description: 'Um guarda cuja Interface foi sobrecarregada.',
      isHostile: true,
      rank: 'D',
      stats: {
        hp: 120,
        attack: 12,
        defense: 5,
        xp: 60,
        goldMin: 10,
        goldMax: 25,
        level: 3,
        resistances: { light: -0.25 },
        skills: [
          {
            name: 'Golpe Pesado',
            chance: 0.3,
            effectData: {
              type: 'damage',
              value: 10,
              scaleStat: 'strength',
              element: 'physical',
              bonusVsType: [],
            },
          },
        ],
      },
      types: ['humanoid', 'corrupted'],
    },
  });

  // NOVO: Goblin Ralé (Rank E)
  await prisma.nPCTemplate.upsert({
    where: { id: GOBLIN_RALE_ID },
    update: {},
    create: {
      id: GOBLIN_RALE_ID,
      name: 'Goblin Ralé',
      description: 'Fraco e covarde, mas perigoso em números.',
      isHostile: true,
      rank: 'E',
      stats: {
        hp: 60,
        attack: 7,
        defense: 1,
        xp: 25,
        goldMin: 3,
        goldMax: 10,
        level: 1,
        accuracy: 0.9,
        resistances: { poison: -0.1 },
        skills: [
          {
            name: 'Arremessar Pedra',
            chance: 0.2,
            effectData: { type: 'damage', value: 5, element: 'physical' },
          },
        ],
      },
      types: ['humanoid', 'goblinoid'],
      lootTable: {
        drops: [
          { itemId: ITEM_SMALL_STONE, minQty: 1, maxQty: 2, chance: 0.5 },
        ],
      },
    },
  });

  // NOVO: Esqueleto Frágil (Rank D)
  await prisma.nPCTemplate.upsert({
    where: { id: SKELETON_ID },
    update: {},
    create: {
      id: SKELETON_ID,
      name: 'Esqueleto Frágil',
      description: 'Restos animados por magia sombria.',
      isHostile: true,
      rank: 'D',
      stats: {
        hp: 90,
        attack: 10,
        defense: 3,
        xp: 50,
        goldMin: 8,
        goldMax: 20,
        level: 2,
        resistances: { physical: 0.1, light: -0.3, shadow: 0.5 },
        skills: [
          {
            name: 'Arremessar Osso',
            chance: 0.25,
            effectData: { type: 'damage', value: 8, element: 'physical' },
          },
        ],
      },
      types: ['undead', 'skeleton'],
    },
  });

  // NOVO: Orc Batedor (Rank C)
  await prisma.nPCTemplate.upsert({
    where: { id: ORC_SCOUT_ID },
    update: {},
    create: {
      id: ORC_SCOUT_ID,
      name: 'Orc Batedor',
      description: 'Um guerreiro orc rápido e brutal.',
      isHostile: true,
      rank: 'C',
      stats: {
        hp: 150,
        attack: 15,
        defense: 6,
        xp: 100,
        goldMin: 20,
        goldMax: 40,
        level: 4,
        critChance: 0.1,
        resistances: { fire: 0.1 },
        skills: [
          {
            name: 'Golpe Poderoso',
            chance: 0.35,
            effectData: [
              {
                type: 'damage',
                value: 12,
                scaleStat: 'strength',
                element: 'physical',
              },
              {
                type: 'debuff',
                target: 'self',
                stat: 'defense',
                value: -0.2,
                duration: 1,
              },
            ],
          },
        ],
      },
      types: ['humanoid', 'orc'],
    },
  });

  console.log('Monstros criados/atualizados.');

  // --- 8. Colocar Instância do NPC no Corredor ---
  await prisma.nPCInstance.deleteMany({
    where: {
      templateId: NPC_TEMPLATE_GUARD,
      mapId: ROOM_ID_HALLWAY,
    },
  });

  const guardInstance = await prisma.nPCInstance.create({
    data: {
      template: { connect: { id: NPC_TEMPLATE_GUARD } },
      map: { connect: { id: ROOM_ID_HALLWAY } },
    },
  });
  console.log('Instância de NPC criada no corredor:', guardInstance.id);

  console.log('Seed v9 concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
