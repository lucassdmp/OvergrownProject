// ─────────────────────────────────────────────────────────────────────────────
// OverGrown – Gerador da Árvore de Talento oficial (template)
//
// Gera src/data/defaultTalentTree.json — o arquivo oficial carregado
// automaticamente pelas páginas /talent-tree-builder e /arvore.
//
// Como usar:      npm run generate:tree
// Como balancear: edite as specs abaixo e rode o script de novo.
//                 A validação embutida garante consistência.
//
// LEIA docs/GUIA_ARVORE_DE_TALENTO.md antes de modificar a estrutura.
//
// Regras de design (resumo):
//   • A árvore é UMA SÓ para todas as finalidades. As "seções" de classe
//     existem apenas para organização/controle dos nós.
//   • NÃO existem nós de ligação entre ramificações.
//   • Nós de jogador: podem ser pegos a qualquer momento; o 1º é gratuito e
//     cada seguinte custa +1 (mecânica implementada na página /arvore).
//   • O nó central é um nó de JOGADOR. Dele parte uma progressão: vantagens
//     mínimas (+2 esquiva, +2 block…) → habilidades/magias fracas → atributos
//     → seções de classe.
//   • Quanto mais externo o nó, mais forte. Capstones custam 2+; os nós
//     supremos mais externos custam 3.
//   • Clusters agrupam uma temática. Cluster ABERTO tem 2+ entradas (o custo
//     de chegar varia conforme o caminho); FECHADO tem 1 entrada.
//   • Toda seção tem pelo menos 1 cluster de Sense (atributos + perícias de
//     sense — limitação futura de perícias ainda não existe).
//   • Nós de atributo são FIXOS e dão +1. Toda habilidade/magia dá atributos,
//     escalando com o investimento (~3 pts → +1, ~5-7 pts → +2, capstone → +3).
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { COMBAT_SKILLS_MAP } from '../src/data/combatSkills'
import { SPELLS_MAP } from '../src/data/spells'
import type {
  TalentTree,
  TalentTreeNode,
  TalentTreeEdge,
  TalentNodeData,
  ConditionalEffect,
  NodeConditions,
} from '../src/types/talentTree'
import type { AttributeName, DerivedStats, Spell } from '../src/types/game'

// ── Tree meta ─────────────────────────────────────────────────────────────────

const TREE_ID = 'arvore-principal-og'
const TREE_VERSION = 2

// ── Geometry ──────────────────────────────────────────────────────────────────
// 6 seções de classe num hexágono grande + região central de progressão.
// Ângulos em graus, sistema SVG (y cresce para baixo):
//   topo:  Guerreiro (-120°) e Rogue (-60°)
//   meio:  Tank (180°) e Arqueiro (0°)
//   baixo: Curandeiro (120°) e Mago (60°)

const PLAYER_RADIUS = 1500

function pos(angleDeg: number, radius: number, tangent: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180
  return {
    x: Math.round(Math.cos(a) * radius + -Math.sin(a) * tangent),
    y: Math.round(Math.sin(a) * radius + Math.cos(a) * tangent),
  }
}

// ── Node data helpers ─────────────────────────────────────────────────────────

type AttrBonus = { attribute: AttributeName; value: number }

function attr(attribute: AttributeName, value = 1): TalentNodeData {
  return { type: 'attribute', attribute, value }
}

function stat(statKey: keyof DerivedStats, value: number): TalentNodeData {
  return { type: 'stat', stat: statKey, value }
}

function skillBonus(skillId: string, skillName: string, value = 5): TalentNodeData {
  return { type: 'skillBonus', skillId, skillName, value }
}

/** Habilidade de combate do livro + bônus de atributo escalado pelo investimento */
function ability(skillId: string, attributeBonuses: AttrBonus[]): TalentNodeData {
  const skill = COMBAT_SKILLS_MAP[skillId]
  if (!skill) throw new Error(`Habilidade de combate desconhecida: ${skillId}`)
  if (attributeBonuses.length === 0)
    throw new Error(`Habilidade ${skillId} sem bônus de atributo (regra: toda habilidade dá atributos)`)
  return {
    type: 'combatAbility',
    skillId: skill.id,
    skillName: skill.name,
    skillDescription: skill.description,
    skillCost: skill.cost,
    attributeBonuses,
  }
}

/** Magia do livro + bônus de atributo escalado pelo investimento */
function magic(spellId: string, attributeBonuses: AttrBonus[]): TalentNodeData {
  const spell: Spell | undefined = SPELLS_MAP[spellId]
  if (!spell) throw new Error(`Magia desconhecida: ${spellId}`)
  if (attributeBonuses.length === 0)
    throw new Error(`Magia ${spellId} sem bônus de atributo (regra: toda magia dá atributos)`)
  return {
    type: 'magic',
    name: spell.name,
    elements: spell.elements,
    magicTypes: spell.types,
    description: spell.description,
    category: spell.category,
    notes: spell.notes,
    levels: spell.levels,
    attributeBonuses,
    statBonuses: [],
  }
}

function conditional(
  name: string,
  description: string,
  conditions: NodeConditions,
  effects: ConditionalEffect[],
): TalentNodeData {
  return { type: 'conditional', name, description, conditions, effects }
}

/** Conditional sem condições = sempre ativo (Nó Supremo / pacote de efeitos) */
function supreme(name: string, description: string, effects: ConditionalEffect[]): TalentNodeData {
  return conditional(name, description, { weaponTagsAnyOf: [], armorTagsAnyOf: [] }, effects)
}

// ── Section builder ───────────────────────────────────────────────────────────
// Uma seção define nós em coordenadas locais { r, t } relativas ao seu ângulo.
// r = distância do centro; t = deslocamento tangencial (± = lados).

interface SectionNodeSpec {
  r: number
  t: number
  data: TalentNodeData
  cost?: number
}

interface SectionSpec {
  id: string
  name: string
  angle: number
  nodes: Record<string, SectionNodeSpec>
  edges: Array<[string, string]>
}

function buildSection(spec: SectionSpec): { nodes: TalentTreeNode[]; edges: TalentTreeEdge[] } {
  const nodes: TalentTreeNode[] = Object.entries(spec.nodes).map(([key, n]) => {
    const { x, y } = pos(spec.angle, n.r, n.t)
    const node: TalentTreeNode = { id: `${spec.id}-${key}`, x, y, data: n.data }
    if (n.cost != null) node.cost = n.cost
    return node
  })
  const edges: TalentTreeEdge[] = spec.edges.map(([a, b]) => {
    const from = `${spec.id}-${a}`
    const to = `${spec.id}-${b}`
    return { id: [from, to].sort().join('--'), from, to }
  })
  return { nodes, edges }
}

function edgeBetween(a: string, b: string): TalentTreeEdge {
  return { id: [a, b].sort().join('--'), from: a, to: b }
}

// ─────────────────────────────────────────────────────────────────────────────
// REGIÃO CENTRAL
// Nó de jogador central → anel de vantagens mínimas → anel de habilidades
// fracas → atributo de entrada → path3 de cada seção. Sem atalhos diretos.
// ─────────────────────────────────────────────────────────────────────────────

interface CenterSpoke {
  angle: number
  toSection: string
  /** Anel A (r=250): vantagem mínima */
  minor: TalentNodeData
  /** Anel B (r=470): habilidade/magia fraca */
  weak: TalentNodeData
  /** Anel C (r=640): atributo de entrada da seção */
  entryAttr: AttributeName
}

const CENTER_SPOKES: CenterSpoke[] = [
  {
    angle: 0, toSection: 'arqueiro',
    minor: stat('esquiva', 2),
    weak: ability('tiro-de-aviso', [{ attribute: 'sense', value: 1 }]),
    entryAttr: 'sense',
  },
  {
    angle: 60, toSection: 'mago',
    minor: stat('iep', 5),
    weak: { type: 'extraDamage', flat: 1, attackTargets: ['magias'] },
    entryAttr: 'wisdom',
  },
  {
    angle: 120, toSection: 'curandeiro',
    minor: stat('vida', 5),
    weak: { type: 'healing', flat: 1, element: null },
    entryAttr: 'wisdom',
  },
  {
    angle: 180, toSection: 'tank',
    minor: supreme('Postura Firme', 'Fundamentos de defesa: +2 de Valor de Bloqueio.', [
      { kind: 'blockBonus', value: 2 },
    ]),
    weak: { type: 'defenseBonus', damageType: 'physical', value: 1 },
    entryAttr: 'fortitude',
  },
  {
    angle: 240, toSection: 'guerreiro',
    minor: stat('resistencia', 2),
    weak: ability('impulsao', [{ attribute: 'might', value: 1 }]),
    entryAttr: 'might',
  },
  {
    angle: 300, toSection: 'rogue',
    minor: stat('pc', 1),
    weak: { type: 'extraDamage', flat: 1, attackTargets: ['corpo-a-corpo'] },
    entryAttr: 'grace',
  },
]

function buildCenter(): { nodes: TalentTreeNode[]; edges: TalentTreeEdge[] } {
  const nodes: TalentTreeNode[] = []
  const edges: TalentTreeEdge[] = []

  // Nó de jogador central
  nodes.push({
    id: 'centro-start',
    x: 0,
    y: 0,
    data: {
      type: 'player',
      name: 'Coração',
      description:
        'O Coração do Pináculo — início central da árvore. A progressão parte daqui: vantagens mínimas, depois habilidades fracas, até alcançar as seções de classe.',
    },
  })

  for (const spoke of CENTER_SPOKES) {
    const aId = `centro-a-${spoke.toSection}`
    const bId = `centro-b-${spoke.toSection}`
    const cId = `centro-c-${spoke.toSection}`
    const pa = pos(spoke.angle, 250, 0)
    const pb = pos(spoke.angle, 470, 0)
    const pc = pos(spoke.angle, 640, 0)
    nodes.push({ id: aId, x: pa.x, y: pa.y, data: spoke.minor })
    nodes.push({ id: bId, x: pb.x, y: pb.y, data: spoke.weak })
    nodes.push({ id: cId, x: pc.x, y: pc.y, data: attr(spoke.entryAttr) })
    edges.push(edgeBetween('centro-start', aId))
    edges.push(edgeBetween(aId, bId))
    edges.push(edgeBetween(bId, cId))
    edges.push(edgeBetween(cId, `${spoke.toSection}-path3`))
  }

  // Anel A circular: permite pivotar cedo dentro da região central
  for (let i = 0; i < CENTER_SPOKES.length; i++) {
    const a = CENTER_SPOKES[i]
    const b = CENTER_SPOKES[(i + 1) % CENTER_SPOKES.length]
    edges.push(edgeBetween(`centro-a-${a.toSection}`, `centro-a-${b.toSection}`))
  }

  return { nodes, edges }
}

// ─────────────────────────────────────────────────────────────────────────────
// GUERREIRO (ângulo -120 / 240) — seção grande, 5 clusters
//   Fúria (aberto), Sangue (aberto), Armas Pesadas (aberto, supremo externo),
//   Bruiser (fechado, interno), Sense (fechado, interno)
// ─────────────────────────────────────────────────────────────────────────────

const GUERREIRO: SectionSpec = {
  id: 'guerreiro',
  name: 'Guerreiro',
  angle: -120,
  nodes: {
    start: {
      r: PLAYER_RADIUS, t: 0,
      data: { type: 'player', name: 'Guerreiro', description: 'Combate corpo a corpo, fúria e poder físico bruto.' },
    },
    // Trilha interna (liga a seção à região central)
    path1: { r: 1250, t: 0, data: attr('might') },
    path2: { r: 1000, t: 0, data: attr('might') },
    path3: { r: 750,  t: 0, data: attr('might') },
    branchL: { r: 1350, t: -180, data: attr('fortitude') },
    branchR: { r: 1350, t: 180,  data: attr('might') },

    // ── Cluster FÚRIA (aberto: entradas via branchL e via w4/f4) ─────────────
    f1: { r: 1450, t: -360, data: attr('might') },
    f2: { r: 1550, t: -520, data: ability('furia', [{ attribute: 'might', value: 1 }]) },
    f3: { r: 1700, t: -560, data: attr('fortitude') },
    f4: { r: 1650, t: -380, data: ability('vicio-em-sangue', [{ attribute: 'might', value: 1 }]) },
    f5: { r: 1800, t: -480, data: stat('vida', 5) },
    f6: { r: 1850, t: -640, data: attr('might') },
    f7: {
      r: 1950, t: -560, cost: 2,
      data: ability('furia-descontrolada', [
        { attribute: 'might', value: 2 },
        { attribute: 'fortitude', value: 1 },
      ]),
    },
    f8: {
      r: 2050, t: -400, cost: 2,
      data: ability('instinto-sanguinario', [{ attribute: 'might', value: 2 }]),
    },

    // ── Cluster SANGUE (aberto: entradas via branchR e via w5/s4) ────────────
    s1: { r: 1450, t: 360, data: attr('fortitude') },
    s2: {
      r: 1550, t: 520,
      data: ability('sede-de-sangue', [
        { attribute: 'might', value: 1 },
        { attribute: 'fortitude', value: 1 },
      ]),
    },
    s3: { r: 1700, t: 560, data: attr('might') },
    s4: { r: 1650, t: 380, data: { type: 'extraDamage', dice: '1d4', attackTargets: ['melee'] } },
    s5: { r: 1800, t: 480, data: stat('resistencia', 3) },
    s6: { r: 1850, t: 640, data: attr('fortitude') },
    s7: {
      r: 1950, t: 560, cost: 2,
      data: ability('elipse-carmesim', [{ attribute: 'might', value: 2 }]),
    },
    s8: {
      r: 2050, t: 400,
      data: { type: 'weaponBonus', requiredTags: ['corpo-a-corpo'], bonusType: 'damage', dice: '1d4', value: 0 },
    },

    // ── Cluster ARMAS PESADAS (aberto: start, f4 e s4; supremo no extremo) ───
    w1: { r: 1650, t: -90, data: attr('might') },
    w2: { r: 1650, t: 90,  data: attr('fortitude') },
    w3: {
      r: 1800, t: 0,
      data: conditional(
        'Colosso de Duas Mãos',
        'Empunhar uma arma de duas mãos transforma cada golpe em devastação.',
        { weaponTagsAnyOf: ['duas-maos'], armorTagsAnyOf: [] },
        [
          { kind: 'extraDamage', flat: 2, attackTargets: ['corpo-a-corpo'] },
          { kind: 'attributeBonus', attribute: 'might', value: 1 },
        ],
      ),
    },
    w4: {
      r: 1950, t: -140,
      data: { type: 'weaponBonus', requiredTags: ['corpo-a-corpo'], bonusType: 'damage', dice: '1d6', value: 0 },
    },
    w5: {
      r: 1950, t: 140,
      data: { type: 'weaponBonus', requiredTags: ['duas-maos'], bonusType: 'critMultiplier', value: 1 },
    },
    w6: { r: 2100, t: -80, data: ability('desarmar', [{ attribute: 'might', value: 1 }]) },
    w7: { r: 2100, t: 80,  data: ability('rasteira', [{ attribute: 'fortitude', value: 1 }]) },
    w8: {
      r: 2250, t: 0, cost: 3,
      data: supreme(
        'Titã do Campo de Batalha',
        'Nó Supremo: seu corpo é uma arma de cerco viva.',
        [
          { kind: 'attributeBonus', attribute: 'might', value: 2 },
          { kind: 'attributeBonus', attribute: 'fortitude', value: 2 },
          { kind: 'statBonus', stat: 'vida', value: 10 },
          { kind: 'extraDamage', flat: 3, attackTargets: ['corpo-a-corpo'] },
        ],
      ),
    },

    // ── Cluster BRUISER (fechado, interno) ───────────────────────────────────
    b1: { r: 1100, t: 260, data: attr('fortitude') },
    b2: { r: 1000, t: 380, data: stat('vida', 10) },
    b3: { r: 950,  t: 480, data: { type: 'defenseBonus', damageType: 'physical', value: 1 } },

    // ── Cluster SENSE (fechado, interno; obrigatório em toda seção) ──────────
    se1: { r: 1100, t: -260, data: attr('sense') },
    se2: { r: 1000, t: -380, data: attr('sense') },
    se3: { r: 900,  t: -300, data: skillBonus('percepcao', 'Percepção') },
    se4: { r: 950,  t: -480, data: skillBonus('discernimento', 'Discernimento') },
  },
  edges: [
    ['start', 'path1'], ['path1', 'path2'], ['path2', 'path3'],
    ['path1', 'branchL'], ['path1', 'branchR'],
    // Fúria
    ['branchL', 'f1'], ['f1', 'f2'], ['f2', 'f3'], ['f2', 'f4'],
    ['f3', 'f5'], ['f5', 'f6'], ['f6', 'f7'], ['f4', 'f8'], ['f5', 'f8'],
    // Sangue
    ['branchR', 's1'], ['s1', 's2'], ['s2', 's3'], ['s2', 's4'],
    ['s3', 's5'], ['s5', 's6'], ['s6', 's7'], ['s4', 's8'], ['s5', 's8'],
    // Armas Pesadas (entradas: start; alternativas via f4 e s4 = cluster aberto)
    ['start', 'w1'], ['start', 'w2'],
    ['w1', 'w3'], ['w2', 'w3'], ['w3', 'w4'], ['w3', 'w5'],
    ['w4', 'w6'], ['w5', 'w7'], ['w6', 'w8'], ['w7', 'w8'],
    ['f4', 'w4'], ['s4', 'w5'],
    // Bruiser
    ['path2', 'b1'], ['b1', 'b2'], ['b2', 'b3'],
    // Sense
    ['path2', 'se1'], ['se1', 'se2'], ['se2', 'se3'], ['se2', 'se4'],
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// ROGUE (ângulo -60 / 300) — seção grande, 5 clusters
//   Assassinato (aberto), Sangramento (aberto), Dual Wield/Crítico (aberto,
//   supremo externo), Mobilidade (fechado, interno), Sense (fechado, interno)
// ─────────────────────────────────────────────────────────────────────────────

const ROGUE: SectionSpec = {
  id: 'rogue',
  name: 'Rogue',
  angle: -60,
  nodes: {
    start: {
      r: PLAYER_RADIUS, t: 0,
      data: { type: 'player', name: 'Rogue', description: 'Letalidade precisa, furtividade e golpes fatais.' },
    },
    path1: { r: 1250, t: 0, data: attr('grace') },
    path2: { r: 1000, t: 0, data: attr('grace') },
    path3: { r: 750,  t: 0, data: attr('grace') },
    branchL: { r: 1350, t: -180, data: attr('grace') },
    branchR: { r: 1350, t: 180,  data: attr('sense') },

    // ── Cluster ASSASSINATO (aberto: branchL e via a4/d4) ────────────────────
    a1: { r: 1450, t: -360, data: attr('grace') },
    a2: { r: 1550, t: -520, data: ability('emboscar', [{ attribute: 'grace', value: 1 }]) },
    a3: { r: 1700, t: -560, data: attr('sense') },
    a4: { r: 1650, t: -380, data: ability('garrote', [{ attribute: 'grace', value: 1 }]) },
    a5: { r: 1800, t: -480, data: skillBonus('furtividade', 'Furtividade') },
    a6: { r: 1850, t: -640, data: attr('grace') },
    a7: {
      r: 1950, t: -560, cost: 2,
      data: ability('marcar-para-a-morte', [
        { attribute: 'grace', value: 2 },
        { attribute: 'sense', value: 1 },
      ]),
    },
    a8: {
      r: 2050, t: -400, cost: 2,
      data: conditional(
        'Lâmina Oculta',
        'Com uma adaga em mãos, cada sombra é uma oportunidade de execução.',
        { weaponTagsAnyOf: ['adaga'], armorTagsAnyOf: [] },
        [
          { kind: 'extraDamage', dice: '1d6', attackTargets: ['corpo-a-corpo'] },
          { kind: 'attributeBonus', attribute: 'grace', value: 1 },
        ],
      ),
    },

    // ── Cluster SANGRAMENTO (aberto: branchR e via sg4/d5) ───────────────────
    sg1: { r: 1450, t: 360, data: attr('grace') },
    sg2: { r: 1550, t: 520, data: ability('hemorragia-interna', [{ attribute: 'grace', value: 1 }]) },
    sg3: { r: 1700, t: 560, data: attr('sense') },
    sg4: { r: 1650, t: 380, data: { type: 'extraDamage', flat: 1, attackTargets: ['corpo-a-corpo'] } },
    sg5: { r: 1800, t: 480, data: stat('pc', 1) },
    sg6: { r: 1850, t: 640, data: attr('grace') },
    sg7: {
      r: 1950, t: 560, cost: 2,
      data: ability('pontos-fatais', [{ attribute: 'grace', value: 2 }]),
    },
    sg8: {
      r: 2050, t: 400,
      data: { type: 'weaponBonus', requiredTags: ['adaga', 'rapieira', 'uma-mao'], bonusType: 'threatRange', value: 1 },
    },

    // ── Cluster DUAL WIELD / CRÍTICO (aberto: start, a4 e sg4) ───────────────
    d1: { r: 1650, t: -90, data: attr('grace') },
    d2: { r: 1650, t: 90,  data: attr('sense') },
    d3: {
      r: 1800, t: 0,
      data: conditional(
        'Dança das Lâminas',
        'Duas lâminas, um só fluxo de morte.',
        { weaponTagsAnyOf: ['dual-wield'], armorTagsAnyOf: [] },
        [
          { kind: 'extraDamage', dice: '1d4', attackTargets: ['corpo-a-corpo'] },
          { kind: 'attributeBonus', attribute: 'grace', value: 1 },
        ],
      ),
    },
    d4: {
      r: 1950, t: -140,
      data: { type: 'weaponBonus', requiredTags: ['uma-mao'], bonusType: 'critMultiplier', value: 1 },
    },
    d5: {
      r: 1950, t: 140,
      data: { type: 'weaponBonus', requiredTags: ['corpo-a-corpo'], bonusType: 'hitBonus', value: 1 },
    },
    d6: { r: 2100, t: -80, data: ability('desarranjar', [{ attribute: 'grace', value: 1 }]) },
    d7: { r: 2100, t: 80,  data: ability('recuar-estrategico', [{ attribute: 'grace', value: 1 }]) },
    d8: {
      r: 2250, t: 0, cost: 3,
      data: supreme(
        'Espectro Carmesim',
        'Nó Supremo: você é o corte que ninguém viu chegar.',
        [
          { kind: 'attributeBonus', attribute: 'grace', value: 2 },
          { kind: 'attributeBonus', attribute: 'sense', value: 1 },
          { kind: 'statBonus', stat: 'esquiva', value: 5 },
          { kind: 'extraDamage', dice: '1d4', attackTargets: ['corpo-a-corpo'] },
        ],
      ),
    },

    // ── Cluster MOBILIDADE (fechado, interno) ────────────────────────────────
    m1: { r: 1100, t: 260, data: attr('grace') },
    m2: { r: 1000, t: 380, data: stat('esquiva', 3) },
    m3: { r: 950,  t: 480, data: skillBonus('reflexos', 'Reflexos') },

    // ── Cluster SENSE (fechado, interno; obrigatório em toda seção) ──────────
    se1: { r: 1100, t: -260, data: attr('sense') },
    se2: { r: 1000, t: -380, data: attr('sense') },
    se3: { r: 900,  t: -300, data: skillBonus('investigacao', 'Investigação') },
    se4: { r: 950,  t: -480, data: skillBonus('percepcao', 'Percepção') },
  },
  edges: [
    ['start', 'path1'], ['path1', 'path2'], ['path2', 'path3'],
    ['path1', 'branchL'], ['path1', 'branchR'],
    // Assassinato
    ['branchL', 'a1'], ['a1', 'a2'], ['a2', 'a3'], ['a2', 'a4'],
    ['a3', 'a5'], ['a5', 'a6'], ['a6', 'a7'], ['a4', 'a8'], ['a5', 'a8'],
    // Sangramento
    ['branchR', 'sg1'], ['sg1', 'sg2'], ['sg2', 'sg3'], ['sg2', 'sg4'],
    ['sg3', 'sg5'], ['sg5', 'sg6'], ['sg6', 'sg7'], ['sg4', 'sg8'], ['sg5', 'sg8'],
    // Dual Wield / Crítico
    ['start', 'd1'], ['start', 'd2'],
    ['d1', 'd3'], ['d2', 'd3'], ['d3', 'd4'], ['d3', 'd5'],
    ['d4', 'd6'], ['d5', 'd7'], ['d6', 'd8'], ['d7', 'd8'],
    ['a4', 'd4'], ['sg4', 'd5'],
    // Mobilidade
    ['path2', 'm1'], ['m1', 'm2'], ['m2', 'm3'],
    // Sense
    ['path2', 'se1'], ['se1', 'se2'], ['se2', 'se3'], ['se2', 'se4'],
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÕES ESQUELETO (Tank, Arqueiro, Curandeiro, Mago)
// Estrutura básica a ser expandida depois, já com cluster de Sense.
// ─────────────────────────────────────────────────────────────────────────────

interface SkeletonSpec {
  id: string
  name: string
  description: string
  angle: number
  primary: AttributeName
  secondary: AttributeName
  sensePericia: { id: string; name: string }
  t1L: TalentNodeData
  t1R: TalentNodeData
  t2L: TalentNodeData
  t2R: TalentNodeData
  utilL: TalentNodeData
  utilR: TalentNodeData
  statL: TalentNodeData
  statR: TalentNodeData
  cond: TalentNodeData
  capstone: TalentNodeData
}

function skeletonToSection(spec: SkeletonSpec): SectionSpec {
  return {
    id: spec.id,
    name: spec.name,
    angle: spec.angle,
    nodes: {
      start: {
        r: PLAYER_RADIUS, t: 0,
        data: { type: 'player', name: spec.name, description: spec.description },
      },
      path1:   { r: 1250, t: 0, data: attr(spec.primary) },
      path2:   { r: 1000, t: 0, data: attr(spec.primary) },
      path3:   { r: 750,  t: 0, data: attr(spec.primary) },
      branchL: { r: 1350, t: -180, data: attr(spec.primary) },
      branchR: { r: 1350, t: 180,  data: attr(spec.secondary) },
      midL:    { r: 1150, t: -300, data: attr(spec.secondary) },
      midR:    { r: 1150, t: 300,  data: attr(spec.primary) },
      t1L:     { r: 1480, t: -340, data: spec.t1L },
      t1R:     { r: 1480, t: 340,  data: spec.t1R },
      t2L:     { r: 1230, t: -480, data: spec.t2L },
      t2R:     { r: 1230, t: 480,  data: spec.t2R },
      utilL:   { r: 1680, t: -180, data: spec.utilL },
      utilR:   { r: 1680, t: 180,  data: spec.utilR },
      statL:   { r: 1650, t: -460, data: spec.statL },
      statR:   { r: 1650, t: 460,  data: spec.statR },
      cond:    { r: 1840, t: 0, data: spec.cond },
      capstone:{ r: 2050, t: 0, cost: 2, data: spec.capstone },
      // Cluster de Sense (obrigatório em toda seção)
      senseA:  { r: 950, t: -180, data: attr('sense') },
      senseB:  { r: 880, t: -330, data: attr('sense') },
      senseC:  { r: 800, t: -230, data: skillBonus(spec.sensePericia.id, spec.sensePericia.name) },
    },
    edges: [
      ['start', 'path1'], ['path1', 'path2'], ['path2', 'path3'],
      ['path1', 'branchL'], ['path1', 'branchR'],
      ['branchL', 't1L'], ['branchR', 't1R'],
      ['branchL', 'midL'], ['branchR', 'midR'],
      ['midL', 't2L'], ['midR', 't2R'],
      ['t1L', 'statL'], ['t1R', 'statR'],
      ['start', 'utilL'], ['start', 'utilR'],
      ['utilL', 'cond'], ['utilR', 'cond'],
      ['cond', 'capstone'],
      ['path2', 'senseA'], ['senseA', 'senseB'], ['senseB', 'senseC'],
    ],
  }
}

const SKELETONS: SkeletonSpec[] = [
  {
    id: 'tank',
    name: 'Tank',
    description: 'Defesa impenetrável, controle e proteção do grupo.',
    angle: 180,
    primary: 'fortitude',
    secondary: 'might',
    sensePericia: { id: 'percepcao', name: 'Percepção' },
    t1L: ability('postura-de-muralha', [{ attribute: 'fortitude', value: 1 }]),
    t1R: ability('inabalavel', [{ attribute: 'fortitude', value: 1 }]),
    t2L: ability('contra-ataque', [
      { attribute: 'fortitude', value: 1 },
      { attribute: 'might', value: 1 },
    ]),
    t2R: ability('agarrar', [{ attribute: 'fortitude', value: 2 }]),
    utilL: { type: 'defenseBonus', damageType: 'physical', value: 2 },
    utilR: stat('vida', 10),
    statL: stat('resistencia', 5),
    statR: stat('vida', 5),
    cond: conditional(
      'Baluarte',
      'Com um escudo em mãos, você é a muralha entre o inimigo e seus aliados.',
      { weaponTagsAnyOf: [], armorTagsAnyOf: ['escudo-item'] },
      [
        { kind: 'blockBonus', value: 3 },
        { kind: 'defense', damageType: 'physical', value: 1 },
        { kind: 'attributeBonus', attribute: 'fortitude', value: 1 },
      ],
    ),
    capstone: ability('ultima-resistencia', [
      { attribute: 'fortitude', value: 2 },
      { attribute: 'might', value: 1 },
    ]),
  },
  {
    id: 'arqueiro',
    name: 'Arqueiro',
    description: 'Precisão à distância, mobilidade e controle de campo.',
    angle: 0,
    primary: 'sense',
    secondary: 'grace',
    sensePericia: { id: 'investigacao', name: 'Investigação' },
    t1L: ability('mira-focada', [{ attribute: 'sense', value: 1 }]),
    t1R: ability('desengajar', [{ attribute: 'grace', value: 1 }]),
    t2L: ability('ponto-cego', [
      { attribute: 'sense', value: 1 },
      { attribute: 'grace', value: 1 },
    ]),
    t2R: ability('tiro-ricochete', [{ attribute: 'sense', value: 2 }]),
    utilL: { type: 'weaponBonus', requiredTags: ['arco', 'besta'], bonusType: 'hitBonus', value: 1 },
    utilR: { type: 'extraDamage', dice: '1d4', attackTargets: ['projeteis', 'arcos'] },
    statL: skillBonus('pontaria', 'Pontaria'),
    statR: stat('esquiva', 3),
    cond: conditional(
      'Olho do Falcão',
      'Com um arco ou besta em mãos, nada escapa da sua mira.',
      { weaponTagsAnyOf: ['arco', 'besta'], armorTagsAnyOf: [] },
      [
        { kind: 'extraDamage', dice: '1d4', attackTargets: ['projeteis'] },
        { kind: 'attributeBonus', attribute: 'sense', value: 1 },
      ],
    ),
    capstone: ability('lobo-solitario', [
      { attribute: 'sense', value: 2 },
      { attribute: 'grace', value: 1 },
    ]),
  },
  {
    id: 'curandeiro',
    name: 'Curandeiro',
    description: 'Cura, suporte e a luz do Pináculo a favor dos aliados.',
    angle: 120,
    primary: 'wisdom',
    secondary: 'sense',
    sensePericia: { id: 'discernimento', name: 'Discernimento' },
    t1L: magic('onda-curativa', [{ attribute: 'wisdom', value: 1 }]),
    t1R: { type: 'healing', flat: 2, element: null },
    t2L: {
      type: 'spellModifier',
      conditionElements: [],
      conditionTypes: ['cura'],
      effectType: 'costReduction',
      value: 4,
    },
    t2R: { type: 'healing', dice: '1d4', element: null },
    utilL: skillBonus('medicina', 'Medicina'),
    utilR: stat('iep', 10),
    statL: stat('vida', 5),
    statR: stat('iep', 10),
    cond: conditional(
      'Canalizador Sagrado',
      'Um foco arcano amplifica a energia curativa que flui por você.',
      { weaponTagsAnyOf: ['cajado', 'varinha', 'bola-de-cristal'], armorTagsAnyOf: [] },
      [
        { kind: 'healingBonus', flat: 2, element: null },
        { kind: 'attributeBonus', attribute: 'wisdom', value: 1 },
      ],
    ),
    capstone: supreme(
      'Bênção do Pináculo',
      'Nó Supremo: a cura que flui de você carrega a graça direta do Pináculo.',
      [
        { kind: 'healingBonus', dice: '1d8', element: null },
        { kind: 'statBonus', stat: 'iep', value: 10 },
        { kind: 'attributeBonus', attribute: 'wisdom', value: 2 },
        { kind: 'attributeBonus', attribute: 'sense', value: 1 },
      ],
    ),
  },
  {
    id: 'mago',
    name: 'Mago',
    description: 'Poder arcano puro: dano mágico, IEP e domínio elemental.',
    angle: 60,
    primary: 'wisdom',
    secondary: 'sense',
    sensePericia: { id: 'percepcao', name: 'Percepção' },
    t1L: magic('encharcar', [{ attribute: 'wisdom', value: 1 }]),
    t1R: { type: 'extraDamage', dice: '1d4', attackTargets: ['magias'] },
    t2L: magic('estalactite', [
      { attribute: 'wisdom', value: 1 },
      { attribute: 'sense', value: 1 },
    ]),
    t2R: {
      type: 'spellModifier',
      conditionElements: [],
      conditionTypes: ['projetil'],
      effectType: 'damageBonus',
      dice: '1d6',
      value: 0,
    },
    utilL: stat('iep', 10),
    utilR: {
      type: 'spellModifier',
      conditionElements: [],
      conditionTypes: ['aoe'],
      effectType: 'costReduction',
      value: 4,
    },
    statL: stat('iep', 10),
    statR: stat('vida', 5),
    cond: conditional(
      'Foco Arcano',
      'Um canalizador mágico reduz o esforço de dobrar a realidade.',
      { weaponTagsAnyOf: ['grimorio', 'cajado', 'varinha', 'bola-de-cristal'], armorTagsAnyOf: [] },
      [
        { kind: 'spellModifier', conditionElements: [], conditionTypes: [], effectType: 'costReduction', value: 2 },
        { kind: 'attributeBonus', attribute: 'wisdom', value: 1 },
      ],
    ),
    capstone: supreme(
      'Domínio Arcano',
      'Nó Supremo: uma vez por descanso longo, conjure uma magia 1 nível acima do permitido.',
      [
        { kind: 'custom', description: 'Conjura magias 1 nível acima do permitido, uma vez por descanso longo.' },
        { kind: 'attributeBonus', attribute: 'wisdom', value: 2 },
        { kind: 'attributeBonus', attribute: 'sense', value: 1 },
      ],
    ),
  },
]

// ── Build tree ────────────────────────────────────────────────────────────────

const ALL_SECTIONS: SectionSpec[] = [
  GUERREIRO,
  ROGUE,
  ...SKELETONS.map(skeletonToSection),
]

function buildTree(): TalentTree {
  const nodes: TalentTreeNode[] = []
  const edges: TalentTreeEdge[] = []

  for (const section of ALL_SECTIONS) {
    const built = buildSection(section)
    nodes.push(...built.nodes)
    edges.push(...built.edges)
  }

  // Região central (depende dos path3 das seções)
  const center = buildCenter()
  nodes.push(...center.nodes)
  edges.push(...center.edges)

  return {
    id: TREE_ID,
    name: 'Árvore do Pináculo',
    description:
      'Árvore de talento oficial do OverGrown. Uma única árvore: o Coração central e seis seções — Guerreiro, Rogue, Tank, Arqueiro, Curandeiro e Mago — organizadas apenas para controle de nós.',
    version: TREE_VERSION,
    nodes: nodes.sort((a, b) => a.id.localeCompare(b.id)),
    edges: dedupeEdges(edges).sort((a, b) => a.id.localeCompare(b.id)),
  }
}

function dedupeEdges(edges: TalentTreeEdge[]): TalentTreeEdge[] {
  const seen = new Set<string>()
  return edges.filter((e) => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })
}

// ── Validation ────────────────────────────────────────────────────────────────

function validate(tree: TalentTree): string[] {
  const errors: string[] = []
  const ids = new Set<string>()

  for (const n of tree.nodes) {
    if (ids.has(n.id)) errors.push(`ID duplicado: ${n.id}`)
    ids.add(n.id)
    if (n.data.type === 'link')
      errors.push(`Nós de ligação não são permitidos (regra atual): ${n.id}`)
    if (n.data.type === 'attribute' && !n.data.attribute)
      errors.push(`Nó de atributo sem atributo fixo: ${n.id}`)
    if (n.data.type === 'combatAbility' && !(n.data.attributeBonuses ?? []).length)
      errors.push(`Habilidade sem bônus de atributo: ${n.id}`)
    if (n.data.type === 'magic' && !n.data.attributeBonuses.length)
      errors.push(`Magia sem bônus de atributo: ${n.id}`)
  }

  for (const e of tree.edges) {
    if (!ids.has(e.from)) errors.push(`Edge ${e.id}: nó inexistente ${e.from}`)
    if (!ids.has(e.to)) errors.push(`Edge ${e.id}: nó inexistente ${e.to}`)
  }

  // Alcançabilidade a partir dos nós de jogador
  const adj = new Map<string, string[]>()
  for (const e of tree.edges) {
    adj.set(e.from, [...(adj.get(e.from) ?? []), e.to])
    adj.set(e.to, [...(adj.get(e.to) ?? []), e.from])
  }
  const queue = tree.nodes.filter((n) => n.data.type === 'player').map((n) => n.id)
  const reached = new Set<string>(queue)
  while (queue.length > 0) {
    const cur = queue.pop() as string
    for (const next of adj.get(cur) ?? []) {
      if (!reached.has(next)) {
        reached.add(next)
        queue.push(next)
      }
    }
  }
  for (const n of tree.nodes)
    if (!reached.has(n.id)) errors.push(`Nó inalcançável a partir de um início: ${n.id}`)

  // Toda seção deve ter um cluster de Sense: ≥2 atributos sense + ≥1 perícia
  for (const section of ALL_SECTIONS) {
    const sectionNodes = tree.nodes.filter((n) => n.id.startsWith(`${section.id}-`))
    const senseAttrs = sectionNodes.filter(
      (n) => n.data.type === 'attribute' && n.data.attribute === 'sense',
    ).length
    const skillNodes = sectionNodes.filter((n) => n.data.type === 'skillBonus').length
    if (senseAttrs < 2 || skillNodes < 1)
      errors.push(
        `Seção ${section.id} sem cluster de Sense (precisa de ≥2 atributos sense e ≥1 perícia; tem ${senseAttrs}/${skillNodes})`,
      )
  }

  return errors
}

// ── Summary ───────────────────────────────────────────────────────────────────

function summarize(tree: TalentTree) {
  const byType = new Map<string, number>()
  for (const n of tree.nodes) byType.set(n.data.type, (byType.get(n.data.type) ?? 0) + 1)

  console.log(`Árvore "${tree.name}" v${tree.version}`)
  console.log(`  ${tree.nodes.length} nós · ${tree.edges.length} conexões`)
  for (const [type, count] of [...byType.entries()].sort()) console.log(`  ${type}: ${count}`)

  const sections = [...ALL_SECTIONS.map((s) => s.id), 'centro']
  for (const id of sections) {
    const sectionNodes = tree.nodes.filter((n) => n.id.startsWith(`${id}-`))
    const totalCost = sectionNodes.reduce((sum, n) => {
      if (n.cost != null) return sum + n.cost
      return sum + (n.data.type === 'player' || n.data.type === 'link' ? 0 : 1)
    }, 0)
    console.log(`  ${id}: ${sectionNodes.length} nós, custo total ${totalCost} pontos`)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const tree = buildTree()
const errors = validate(tree)
if (errors.length > 0) {
  console.error('Validação falhou:')
  for (const err of errors) console.error(`  ✗ ${err}`)
  process.exit(1)
}

// Rodar sempre a partir da raiz do repositório (npm run generate:tree)
const outPath = join(process.cwd(), 'src', 'data', 'defaultTalentTree.json')
writeFileSync(outPath, JSON.stringify(tree, null, 2) + '\n', 'utf-8')
summarize(tree)
console.log(`\n✓ Gerado: ${outPath}`)
