import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// IDs fixos para podermos nos referir a eles
const ROOM_ID_START = 'cl_starter_room';
const ROOM_ID_HALLWAY = 'cl_hallway_01';
const NPC_TEMPLATE_GUARD = 'npc_template_guard';
const MONSTER_TEMPLATE_SLIME = 'mon_slime_mana';
const ITEM_SLIME_GOO = 'item_slime_goo';
const ITEM_SHORT_SWORD = 'item_short_sword';
// --- NOVOS IDs PARA KEYWORDS ---
const KW_LAMINA = 'kw_lamina';
const KW_SOMBRA = 'kw_sombra';
const KW_FOGO = 'kw_fogo';
const KW_AGUA = 'kw_agua';
const KW_LUZ = 'kw_luz';
// --- FIM DOS IDs ---
// --- NOVOS IDs PARA SKILLS ---
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
        drops: [
          { itemId: ITEM_SLIME_GOO, chance: 0.75, minQty: 1, maxQty: 3 },
          { itemId: ITEM_SHORT_SWORD, chance: 0.25, minQty: 1, maxQty: 1 },
        ], // 75% chance de dropar 1-3 Gosmas
      },
    },
    create: {
      id: MONSTER_TEMPLATE_SLIME,
      name: 'Slime de Mana Fraco',
      description: 'Uma bolha de mana gelatinosa, Rank E.',
      isHostile: true,
      stats: {
        hp: 80,
        attack: 10,
        defense: 5,
        xp: 50,
        goldMin: 5,
        goldMax: 15,
      },
      lootTable: {
        // DEFINE NA CRIAÇÃO TAMBÉM
        drops: [
          { itemId: ITEM_SLIME_GOO, chance: 0.75, minQty: 1, maxQty: 3 },
          { itemId: ITEM_SHORT_SWORD, chance: 0.25, minQty: 1, maxQty: 1 },
        ],
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
  // --- 5. NOVO: Criar o Item Equipável (Espada) ---
  await prisma.item.upsert({
    where: { id: ITEM_SHORT_SWORD },
    update: {},
    create: {
      id: ITEM_SHORT_SWORD,
      name: 'Espada Curta Gasta',
      description: 'Uma espada curta básica, um pouco enferrujada.',
      type: 'EQUIPMENT', // É um equipamento
      slot: 'WEAPON', // Vai no slot de Arma (definido no Enum EquipSlot em schema.prisma)
      stats: {
        // Stats que dará (usaremos depois)
        strength: 5, // Bónus de +5 de Força
      },
      price: 25, // Preço de venda
    },
  });
  console.log('Item Equipável criado: Espada Curta Gasta');
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
  // --- 6. NOVO: Criar PowerKeywords Iniciais ---
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
  // --- 7. NOVO: Criar Skills Iniciais e suas Combinações ---

  // 7.1 Lâmina + Fogo -> Lâmina Incandescente
  await prisma.skill.upsert({
    where: { id: SKILL_LAMINA_INCANDESCENTE },
    update: {},
    create: {
      id: SKILL_LAMINA_INCANDESCENTE,
      name: 'Lâmina Incandescente',
      description: 'Um golpe que imbui a lâmina com fogo, queimando o alvo.',
      ecoCost: 15,
      effectData: [
        { type: 'damage', value: 10, element: 'physical' },
        { type: 'damage', value: 8, element: 'fire' },
        { type: 'status', effect: 'burning', duration: 3, chance: 0.8 },
      ],
      requiredKeywords: {
        connect: [{ id: KW_LAMINA }, { id: KW_FOGO }],
      },
    },
  });

  // 7.2 Lâmina + Sombra -> Corte Dissimulado
  await prisma.skill.upsert({
    where: { id: SKILL_CORTE_DISSIMULADO },
    update: {},
    create: {
      id: SKILL_CORTE_DISSIMULADO,
      name: 'Corte Dissimulado',
      description: 'Um ataque rápido das sombras com alta chance de crítico.',
      ecoCost: 12,
      effectData: [
        {
          type: 'damage',
          value: 12,
          element: 'physical',
          bonusCriticalChance: 0.3,
        },
      ],
      requiredKeywords: {
        connect: [{ id: KW_LAMINA }, { id: KW_SOMBRA }],
      },
    },
  });

  // 7.3 Lâmina + Luz -> Golpe Purificador
  await prisma.skill.upsert({
    where: { id: SKILL_GOLPE_PURIFICADOR },
    update: {},
    create: {
      id: SKILL_GOLPE_PURIFICADOR,
      name: 'Golpe Purificador',
      description: 'Um ataque radiante que causa dano extra a seres sombrios.',
      ecoCost: 18,
      effectData: [
        { type: 'damage', value: 15, element: 'physical' },
        {
          type: 'damage',
          value: 10,
          element: 'light',
          bonusVsType: ['undead', 'shadow'],
        },
      ],
      requiredKeywords: {
        connect: [{ id: KW_LAMINA }, { id: KW_LUZ }],
      },
    },
  });

  // 7.4 Lâmina + Água -> Lâmina Fluida
  await prisma.skill.upsert({
    where: { id: SKILL_LAMINA_FLUIDA },
    update: {},
    create: {
      id: SKILL_LAMINA_FLUIDA,
      name: 'Lâmina Fluida',
      description:
        'Um golpe que flui como água, ignorando parte da defesa e podendo desacelerar.',
      ecoCost: 14,
      effectData: [
        {
          type: 'damage',
          value: 10,
          element: 'physical',
          defensePenetration: 0.2,
        },
        { type: 'status', effect: 'slow', duration: 2, chance: 0.5 },
      ],
      requiredKeywords: {
        connect: [{ id: KW_LAMINA }, { id: KW_AGUA }],
      },
    },
  });

  // 7.5 Fogo + Sombra -> Fogo Fátuo
  await prisma.skill.upsert({
    where: { id: SKILL_FOGO_FATUO },
    update: {},
    create: {
      id: SKILL_FOGO_FATUO,
      name: 'Fogo Fátuo',
      description:
        'Dispara um projétil de fogo sombrio que pode confundir o alvo.',
      ecoCost: 20,
      effectData: [
        { type: 'damage', value: 25, element: 'shadowflame' },
        { type: 'status', effect: 'confused', duration: 2, chance: 0.4 },
      ],
      requiredKeywords: {
        connect: [{ id: KW_FOGO }, { id: KW_SOMBRA }],
      },
    },
  });

  // 7.6 Fogo + Luz -> Explosão Solar
  await prisma.skill.upsert({
    where: { id: SKILL_EXPLOSAO_SOLAR },
    update: {},
    create: {
      id: SKILL_EXPLOSAO_SOLAR,
      name: 'Explosão Solar',
      description:
        'Uma explosão de luz e fogo que causa dano em área e pode cegar.',
      ecoCost: 30,
      effectData: {
        type: 'aoe',
        radius: 2,
        effects: [
          { type: 'damage', value: 20, element: 'fire_light' },
          { type: 'status', effect: 'blind', duration: 1, chance: 0.6 },
        ],
      },
      requiredKeywords: {
        connect: [{ id: KW_FOGO }, { id: KW_LUZ }],
      },
    },
  });

  // 7.7 Fogo + Água -> Névoa Escaldante
  await prisma.skill.upsert({
    where: { id: SKILL_NEVOA_ESCALDANTE },
    update: {},
    create: {
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
      requiredKeywords: {
        connect: [{ id: KW_FOGO }, { id: KW_AGUA }],
      },
    },
  });

  // 7.8 Sombra + Luz -> Prisma Ilusório
  await prisma.skill.upsert({
    where: { id: SKILL_PRISMA_ILUSORIO },
    update: {},
    create: {
      id: SKILL_PRISMA_ILUSORIO,
      name: 'Prisma Ilusório',
      description:
        'Dobra a luz e a sombra para criar ilusões e aumentar a evasão.',
      ecoCost: 22,
      effectData: [
        { type: 'buff', stat: 'evasion', value: 0.3, duration: 5 }, // Aumenta Evasão
        { type: 'summon', summonId: 'illusion_clone', count: 2, duration: 5 }, // Cria 2 clones ilusórios (precisaremos definir 'illusion_clone')
      ],
      requiredKeywords: {
        connect: [{ id: KW_SOMBRA }, { id: KW_LUZ }],
      },
    },
  });

  // 7.9 Sombra + Água -> Poça Sombria
  await prisma.skill.upsert({
    where: { id: SKILL_POCA_SOMBRIA },
    update: {},
    create: {
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
          { type: 'status', effect: 'rooted', duration: 1, chance: 0.7 }, // Chance de enraizar a cada segundo
        ],
      },
      requiredKeywords: {
        connect: [{ id: KW_SOMBRA }, { id: KW_AGUA }],
      },
    },
  });

  // 7.10 Luz + Água -> Bênção Restauradora
  await prisma.skill.upsert({
    where: { id: SKILL_BENCAO_RESTAURADORA },
    update: {},
    create: {
      id: SKILL_BENCAO_RESTAURADORA,
      name: 'Bênção Restauradora',
      description:
        'Canaliza a luz através da água para curar ferimentos e remover aflições.',
      ecoCost: 20,
      effectData: [
        { type: 'heal', value: 40 }, // Cura 40 HP
        { type: 'cleanse', effectType: 'negative', count: 1 }, // Remove 1 status negativo
      ],
      requiredKeywords: {
        connect: [{ id: KW_LUZ }, { id: KW_AGUA }],
      },
    },
  });

  console.log('Skills iniciais baseadas em combinações de Keywords criadas.'); // Log de confirmação

  console.log('Seed v8 concluído.'); // ATUALIZAR VERSÃO FINAL
}
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
