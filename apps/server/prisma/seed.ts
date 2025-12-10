import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// IDs fixos para podermos nos referir a eles
const ROOM_ID_START = 'cl_starter_room';
const ROOM_ID_HALLWAY = 'cl_hallway_01';
const ROOM_ID_PROLOGUE = 'pr_optimization_sector'; // <-- NOVO ID
const NPC_TEMPLATE_GUARD = 'npc_template_guard';
const NPC_TEMPLATE_SUPERVISOR = 'npc_template_supervisor'; // <-- NOVO ID
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
const KW_CURA = 'kwcura';
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
// --- NOVOS IDs PARA CONSUMÍVEIS ---
const ITEM_SMALL_HEALTH_POTION = 'item_pocao_hp_pequena';
const ITEM_SMALL_ECO_BATTERY = 'item_bateria_eco_pequena';

async function main() {
  console.log('Iniciando o script de seed v2...');

  // --- 1. Criar Salas (GameMap) ---
  // Sala do Prólogo
  await prisma.gameMap.upsert({
    where: { id: ROOM_ID_PROLOGUE },
    update: {},
    create: {
      id: ROOM_ID_PROLOGUE,
      name: 'Setor de Otimização Gama',
      description:
        'Um ambiente asséptico da Cidadela, banhado em luz azul-fria. Terminais holográficos exibem fluxos de dados complexos. O ar é estéril, com um zumbido baixo de processamento. Ao centro, um <span class="highlight-interact">Terminal Primário</span> aguarda calibração.',
      // Sem saídas visíveis inicialmente, a fuga será criada pelo prólogo
      exits: {},
    },
  });

  // Sala Inicial (Pós-Prólogo)
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
      rank: 'E',
    },
  });

  await prisma.powerKeyword.upsert({
    where: { id: KW_SOMBRA },
    update: {},
    create: {
      id: KW_SOMBRA,
      name: 'Sombra',
      description: 'O conceito de ocultação, escuridão e ilusão.',
      rank: 'D',
    },
  });

  await prisma.powerKeyword.upsert({
    where: { id: KW_FOGO },
    update: {},
    create: {
      id: KW_FOGO,
      name: 'Fogo',
      description: 'O conceito de calor, combustão e destruição.',
      rank: 'E',
    },
  });

  await prisma.powerKeyword.upsert({
    where: { id: KW_AGUA },
    update: {},
    create: {
      id: KW_AGUA,
      name: 'Água',
      description: 'O conceito de fluidez, cura e pressão.',
      rank: 'E',
    },
  });

  await prisma.powerKeyword.upsert({
    where: { id: KW_LUZ },
    update: {},
    create: {
      id: KW_LUZ,
      name: 'Luz',
      description: 'O conceito de iluminação, pureza e energia radiante.',
      rank: 'D',
    },
  });
  await prisma.powerKeyword.upsert({
    where: { id: KW_CURA },
    update: {},
    create: {
      id: KW_CURA,
      name: 'CURA',
      description: 'Eco da restauração. Associado à recuperação de vitalidade.',
      rank: 'D', // Vamos fazer a Cura ser um pouco mais rara
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
  // --- NOVOS CONSUMÍVEIS ---
  const ITEM_SMALL_HEALTH_POTION = 'item_small_health_potion';

  // REMOVED DUPLICATE BLOCK FOR ITEM_BATERIA_ECO_PEQUENA
  // Using ITEM_SMALL_ECO_BATTERY defined below instead.

  await prisma.item.upsert({
    where: { id: ITEM_SMALL_HEALTH_POTION },
    update: {},
    create: {
      id: ITEM_SMALL_HEALTH_POTION,
      name: 'Poção de Vida Menor',
      description: 'Recupera uma pequena quantidade de HP.',
      type: 'CONSUMABLE',
      effectData: { healHp: 50 }, // Recupera 50 de HP
      price: 15,
    },
  });

  await prisma.item.upsert({
    where: { id: ITEM_SMALL_ECO_BATTERY },
    update: {},
    create: {
      id: ITEM_SMALL_ECO_BATTERY,
      name: 'Bateria de Eco Menor',
      description: 'Recupera uma pequena quantidade de Eco.',
      type: 'CONSUMABLE',
      effectData: { restoreEco: 25 }, // Recupera 25 de Eco
      price: 20,
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
      lootTable: {
        drops: [
          { itemId: ITEM_SLIME_GOO, minQty: 1, maxQty: 3, chance: 0.8 },
          {
            itemId: ITEM_SMALL_HEALTH_POTION,
            minQty: 1,
            maxQty: 3,
            chance: 1.0,
          },
        ],
      },
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
        drops: [
          { itemId: ITEM_SLIME_GOO, minQty: 1, maxQty: 3, chance: 0.8 },
          {
            itemId: ITEM_SMALL_HEALTH_POTION,
            minQty: 1,
            maxQty: 3,
            chance: 0.25,
          },
        ],
      },
    },
  });

  // NPC Supervisor (Prólogo)
  await prisma.nPCTemplate.upsert({
    where: { id: NPC_TEMPLATE_SUPERVISOR },
    update: {},
    create: {
      id: NPC_TEMPLATE_SUPERVISOR,
      name: 'Supervisor',
      description:
        'Uma figura imponente da Cidadela, com implantes cibernéticos visíveis e um olhar severo. Ele zela pela Ordem.',
      isHostile: false,
      rank: 'B', // É um oficial de alto escalão
      stats: {
        // Não é para combate, mas define sua importância
      },
      types: ['cidadela', 'humano', 'autoridade'],
    },
  });

  // Guarda da Cidadela
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

  // --- 8. Instâncias de NPC ---
  // Coloca o Supervisor na sala do Prólogo
  await prisma.nPCInstance.upsert({
    where: { id: 'npc_inst_supervisor_01' },
    update: {},
    create: {
      id: 'npc_inst_supervisor_01',
      templateId: NPC_TEMPLATE_SUPERVISOR,
      mapId: ROOM_ID_PROLOGUE,
    },
  });

  // Coloca o Guarda na sala inicial (pós-prólogo)
  await prisma.nPCInstance.upsert({
    where: { id: 'npc_inst_guard_01' },
    update: {},
    create: {
      id: 'npc_inst_guard_01',
      templateId: NPC_TEMPLATE_GUARD,
      mapId: ROOM_ID_HALLWAY,
    },
  });

  // --- POPULAÇÃO DA SALA INICIAL (Pós-Prólogo) ---
  await prisma.nPCInstance.deleteMany({ where: { mapId: ROOM_ID_START } });

  await prisma.nPCInstance.create({
    data: { templateId: MONSTER_TEMPLATE_SLIME, mapId: ROOM_ID_START, currentHp: 80 }
  });

  await prisma.nPCInstance.create({
    data: { templateId: GOBLIN_RALE_ID, mapId: ROOM_ID_START, currentHp: 60 }
  });

  // --- 9. QUESTS ---
  const QUEST_ID_FIRST = 'qst_eco_awakening';

  await prisma.quest.upsert({
    where: { id: QUEST_ID_FIRST },
    update: {},
    create: {
      id: QUEST_ID_FIRST,
      title: 'Despertar do Eco',
      description: 'Você sentiu o poder fluir. Agora precisa entender o que aconteceu. Procure por alguém que possa explicar sua situação.',
      requiredLevel: 1,
      startNpcId: NPC_TEMPLATE_SUPERVISOR, // Fallback, mas vamos focar no NPC Mentor
      endNpcId: NPC_TEMPLATE_GUARD, // Fallback
      objectives: {
        interact: { targetId: 'npc_template_old_mentor', count: 1 }
      },
      rewards: {
        xp: 100,
        gold: 50,
        itemId: ITEM_SMALL_ECO_BATTERY
      }
    }
  });

  // Criar NPC Mentor
  const NPC_TEMPLATE_MENTOR = 'npc_template_old_mentor';
  await prisma.nPCTemplate.upsert({
    where: { id: NPC_TEMPLATE_MENTOR },
    update: {},
    create: {
      id: NPC_TEMPLATE_MENTOR,
      name: 'Velho Escriba',
      description: 'Um homem idoso com roupas gastas, mas olhos vivos. Ele parece saber mais do que aparenta.',
      isHostile: false,
      stats: { dialogue: '"Ah, mais um "erro" no sistema? Venha, não tenha medo. Eles não podem nos ver aqui."' },
      types: ['humano', 'renegado']
    }
  });

  // Colocar Mentor na Sala Inicial
  await prisma.nPCInstance.create({
    data: {
      templateId: NPC_TEMPLATE_MENTOR,
      mapId: ROOM_ID_START
    }
  });

  console.log('Primeira Quest e Mentor adicionados.');


  // --- 10. TUTORIAL DUNGEON (The Forgotten Conduits) ---
  console.log('Criando Tutorial Dungeon...');

  // Rooms
  const TD_ROOM_1 = 'td_room_01_entrance';
  const TD_ROOM_2 = 'td_room_02_combat';
  const TD_ROOM_3 = 'td_room_03_puzzle';
  const TD_ROOM_4 = 'td_room_04_boss';
  const TD_ROOM_5 = 'td_room_05_reward';

  const roomsData = [
    {
      id: TD_ROOM_1,
      name: 'Entrada dos Condutos',
      description: 'O portal te cospe em um túnel úmido e antigo. Tubos enferrujados correm pelas paredes como veias metálicas. O ar cheira a ozônio e mofo. Há apenas um caminho a seguir: LESTE, para a escuridão.',
      exits: { leste: TD_ROOM_2 }, // Entrada só vai pra frente
    },
    {
      id: TD_ROOM_2,
      name: 'Câmara de Bloqueio',
      description: 'Uma sala pequena bloqueada por destroços, mas com espaço suficiente para se mover. Marcas de garras nas paredes indicam que algo vive aqui. A saída continua a LESTE. O caminho de volta está a OESTE.',
      exits: { leste: TD_ROOM_3, oeste: TD_ROOM_1 },
    },
    {
      id: TD_ROOM_3,
      name: 'Intersecção do Filtro',
      description: 'O túnel se divide brevemente ao redor de uma grande turbina parada. Há um brilho fraco vindo do NORTE. O caminho de onde veio fica a OESTE.',
      exits: { norte: TD_ROOM_4, oeste: TD_ROOM_2 },
    },
    {
      id: TD_ROOM_4,
      name: 'Ninho do Guardião',
      description: 'Uma câmara ampla com o teto alto. No centro, uma massa de cabos e carne pulsa ritmicamente. É o covil de algo. Uma porta reforçada está ao NORTE. SUL leva de volta à turbina.',
      exits: { norte: TD_ROOM_5, sul: TD_ROOM_3 },
    },
    {
      id: TD_ROOM_5,
      name: 'Câmara da Recompensa',
      description: 'Uma sala secreta e silenciosa, intocada pelo tempo. No centro, sobre um pedestal, repousa um <span class="highlight-interact">Baú Antigo</span>. Não há outra saída além de voltar para o SUL.',
      exits: { sul: TD_ROOM_4 },
    },
  ];

  for (const room of roomsData) {
    await prisma.gameMap.upsert({
      where: { id: room.id },
      update: { exits: room.exits }, // Atualiza exits se já existir
      create: room,
    });
  }

  // --- 11. RANK F ECOSYSTEM (Proto-Ecos) ---
  const KW_BRASA = 'kw_brasa'; // Fogo F
  const KW_ORVALHO = 'kw_orvalho'; // Água F
  const KW_BRISA = 'kw_brisa'; // Ar F (Novo elemento, mas usaremos lógica básica)
  const KW_POEIRA = 'kw_poeira'; // Terra F (Novo)

  await prisma.powerKeyword.upsert({
    where: { id: KW_BRASA },
    update: {},
    create: { id: KW_BRASA, name: 'Brasa', description: 'Uma pequena fagulha de calor.', rank: 'F' },
  });
  await prisma.powerKeyword.upsert({
    where: { id: KW_ORVALHO },
    update: {},
    create: { id: KW_ORVALHO, name: 'Orvalho', description: 'Um vestígio de humidade.', rank: 'F' },
  });
  await prisma.powerKeyword.upsert({
    where: { id: KW_BRISA },
    update: {},
    create: { id: KW_BRISA, name: 'Brisa', description: 'Um sopro de ar leve.', rank: 'F' },
  });
  await prisma.powerKeyword.upsert({
    where: { id: KW_POEIRA },
    update: {},
    create: { id: KW_POEIRA, name: 'Poeira', description: 'Partículas soltas de terra.', rank: 'F' },
  });

  // Skills Rank F (Custo 5 Eco)
  const SKILL_FAISCA = 'sk_faisca';
  const SKILL_GOTA = 'sk_gota';
  const SKILL_SOPRO = 'sk_sopro';
  const SKILL_PEDRINHA = 'sk_pedrinha';

  const rankFSkills = [
    {
      id: SKILL_FAISCA,
      name: 'Faísca',
      description: 'Uma pequena chama que causa dano leve.',
      ecoCost: 5,
      effectData: { type: 'damage', value: 8, element: 'fire' },
      keywords: [KW_BRASA]
    },
    {
      id: SKILL_GOTA,
      name: 'Gota Ácida',
      description: 'Um pingo corrosivo.',
      ecoCost: 5,
      effectData: { type: 'damage', value: 8, element: 'water' }, // Simplificação
      keywords: [KW_ORVALHO]
    },
    {
      id: SKILL_SOPRO,
      name: 'Lufada',
      description: 'Empurra o ar contra o inimigo.',
      ecoCost: 5,
      effectData: { type: 'damage', value: 8, element: 'physical' },
      keywords: [KW_BRISA]
    },
    {
      id: SKILL_PEDRINHA,
      name: 'Jogar Terra',
      description: 'Cega momentaneamente o inimigo com poeira.',
      ecoCost: 6,
      effectData: [
        { type: 'damage', value: 3, element: 'earth' },
        { type: 'debuff', stat: 'accuracy', value: -0.1, duration: 2, chance: 0.8 }
      ],
      keywords: [KW_POEIRA]
    }
  ];

  for (const skill of rankFSkills) {
    await prisma.skill.upsert({
      where: { id: skill.id },
      update: {},
      create: {
        id: skill.id,
        name: skill.name,
        description: skill.description,
        ecoCost: skill.ecoCost,
        effectData: skill.effectData as any,
        requiredKeywords: { connect: skill.keywords.map(id => ({ id })) }
      }
    });
  }

  // --- 12. POPULATE DUNGEON ---
  // Reward Chest (NPC Imóvel)
  const NPC_TEMPLATE_CHEST = 'npc_chest_tutorial';
  await prisma.nPCTemplate.upsert({
    where: { id: NPC_TEMPLATE_CHEST },
    update: {},
    create: {
      id: NPC_TEMPLATE_CHEST,
      name: 'Baú Antigo',
      description: 'Um baú de metal reforçado, pulsando com energia residual.',
      isHostile: false,
      rank: 'F',
      stats: {
        isInteractable: true,
        dialogue: '[SYSTEM]: Acesso concedido. Recompensa liberada.'
        // A lógica de dar o item será feita no código do Gateway/Service ao interagir
      },
      types: ['object', 'chest']
    }
  });

  // Instância do Baú na Sala 5
  await prisma.nPCInstance.create({
    data: {
      templateId: NPC_TEMPLATE_CHEST,
      mapId: TD_ROOM_5,
    }
  });

  // Inimigos
  // Sala 2: Ratos de Cabo (Novo Inimigo fraco)
  const MON_CABLE_RAT = 'mon_cable_rat';
  await prisma.nPCTemplate.upsert({
    where: { id: MON_CABLE_RAT },
    update: {},
    create: {
      id: MON_CABLE_RAT,
      name: 'Rato de Cabo',
      description: 'Um roedor mutante que morde fios elétricos.',
      isHostile: true,
      rank: 'F',
      stats: {
        hp: 20, // Nerfed from 30
        attack: 3, // Nerfed from 4
        defense: 0,
        xp: 15,
        goldMin: 1,
        goldMax: 3,
        level: 1,
        skills: [{ name: 'Mordida', chance: 0.4, effectData: { type: 'damage', value: 3 } }]
      },
      types: ['beast']
    }
  });

  await prisma.nPCInstance.create({ data: { templateId: MON_CABLE_RAT, mapId: TD_ROOM_2, currentHp: 20 } });
  await prisma.nPCInstance.create({ data: { templateId: MON_CABLE_RAT, mapId: TD_ROOM_2, currentHp: 20 } }); // Dois ratos
  await prisma.nPCInstance.create({ data: { templateId: MON_CABLE_RAT, mapId: TD_ROOM_2, currentHp: 20 } }); // Três ratos (User Request)

  // Sala 4: Chefe Tutorial (Sentinela Defeituosa)
  const MON_BROKEN_SENTRY = 'mon_broken_sentry';
  await prisma.nPCTemplate.upsert({
    where: { id: MON_BROKEN_SENTRY },
    update: {},
    create: {
      id: MON_BROKEN_SENTRY,
      name: 'Sentinela Defeituosa',
      description: 'Um robô de segurança da Cidadela, soltando faíscas e óleo.',
      isHostile: true,
      rank: 'E',
      stats: {
        hp: 60, // Nerfed from 100
        attack: 5, // Nerfed from 8
        defense: 1, // Nerfed from 3
        xp: 80,
        goldMin: 20,
        goldMax: 50,
        level: 2,
        resistances: { physical: 0.2, lightning: -0.2 },
        skills: [
          { name: 'Choque Estático', chance: 0.3, effectData: { type: 'damage', value: 6, element: 'lightning' } } // Nerfed from 10
        ]
      },
      types: ['construct', 'machine']
    }
  });

  await prisma.nPCInstance.create({ data: { templateId: MON_BROKEN_SENTRY, mapId: TD_ROOM_4, currentHp: 100 } });

  console.log('Tutorial Dungeon populada.');

  console.log('Seed v10 concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
