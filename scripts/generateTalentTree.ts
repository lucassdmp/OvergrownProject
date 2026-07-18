/* eslint-disable no-console -- CLI generator intentionally prints its audit summary. */
// ─────────────────────────────────────────────────────────────────────────────
// OverGrown – Gerador da Árvore de Talento oficial (template)
//
// Gera src/data/defaultTalentTree.json — o arquivo oficial carregado pelas
// páginas /talent-tree-builder e /arvore conforme a versão embarcada.
//
// Como usar:      npm run generate:tree
// Como balancear: edite as specs abaixo e rode o script de novo.
//                 A validação embutida garante consistência.
//
// LEIA docs/GUIA_ARVORE_DE_TALENTO.md antes de modificar a estrutura.
//
// Regras de design (resumo):
//   • Cada fantasia de classe forma um componente independente, iniciado pelo
//     seu próprio nó de jogador. Não existe mais Coração central.
//   • NÃO existem nós de ligação entre ramificações.
//   • Nós de jogador: podem ser pegos a qualquer momento; o 1º é gratuito e
//     cada seguinte custa +1 (mecânica implementada na página /arvore).
//   • Cada fantasia cresce em caminhos orgânicos ao redor de seu nó de jogador,
//     com raízes, bifurcações, terminais e reconexões entre fluxos.
//   • Quanto mais externo o nó, mais forte. Capstones custam 2+; os nós
//     supremos mais externos custam 3.
//   • Clusters agrupam uma temática. Cluster ABERTO tem 2+ entradas (o custo
//     de chegar varia conforme o caminho); FECHADO tem 1 entrada.
//   • Não existem nós de perícia na árvore.
//   • Nós de atributo são FIXOS e dão +1. Toda habilidade/magia dá atributos,
//     escalando com o investimento (~3 pts → +1, ~5-7 pts → +2, capstone → +3).
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  COMBAT_SKILLS_MAP,
  EFFORT_SKILLS,
  MELEE_SKILLS,
  combatSkillDependencyRequirement,
} from '../src/data/combatSkills'
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
const TREE_VERSION = 8

// ── Geometry ──────────────────────────────────────────────────────────────────
// 6 seções de classe num hexágono grande + região central de progressão.
// Ângulos em graus, sistema SVG (y cresce para baixo):
//   topo:  Guerreiro (-120°) e Rogue (-60°)
//   meio:  Tank (180°) e Arqueiro (0°)
//   baixo: Curandeiro (120°) e Mago (60°)

const PLAYER_RADIUS = 1500
const SECTION_RADIUS_OFFSET = 3500

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

/** Habilidade de combate do livro + bônus de atributo escalado pelo investimento */
function ability(skillId: string, attributeBonuses: AttrBonus[]): TalentNodeData {
  const skill = COMBAT_SKILLS_MAP[skillId]
  if (!skill) throw new Error(`Habilidade de combate desconhecida: ${skillId}`)
  if (attributeBonuses.length === 0)
    throw new Error(
      `Habilidade ${skillId} sem bônus de atributo (regra: toda habilidade dá atributos)`,
    )
  return {
    type: 'combatAbility',
    skillId: skill.id,
    skillName: skill.name,
    skillDescription: skill.description,
    skillCost: skill.cost,
    skillRequirement: combatSkillDependencyRequirement(skill),
    skillAction: skill.action,
    skillPurpose: skill.purpose,
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
    const { x, y } = pos(spec.angle, n.r + SECTION_RADIUS_OFFSET, n.t)
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
// CATÁLOGO LEGADO DO GUERREIRO
// Mantém as definições anteriores como referência de migração. A geometria e
// os efeitos oficiais atuais são produzidos exclusivamente por buildWarrior().
// ─────────────────────────────────────────────────────────────────────────────

const GUERREIRO: SectionSpec = {
  id: 'guerreiro',
  name: 'Guerreiro',
  angle: -120,
  nodes: {
    start: {
      r: PLAYER_RADIUS,
      t: 0,
      data: {
        type: 'player',
        name: 'Guerreiro',
        description: 'Combate corpo a corpo, fúria e poder físico bruto.',
      },
    },
    // Trilha interna (liga a seção à região central)
    path1: { r: 1250, t: 0, data: attr('might') },
    path2: { r: 1000, t: 0, data: attr('might') },
    path3: { r: 750, t: 0, data: attr('might') },
    branchL: { r: 1350, t: -180, data: attr('fortitude') },
    branchR: { r: 1350, t: 180, data: attr('might') },

    // ── Cluster FÚRIA (aberto: entradas via branchL e via w4/f4) ─────────────
    f1: { r: 1450, t: -360, data: attr('might') },
    f2: { r: 1550, t: -520, data: ability('furia', [{ attribute: 'might', value: 1 }]) },
    f3: { r: 1700, t: -560, data: attr('fortitude') },
    f4: { r: 1650, t: -380, data: ability('vicio-em-sangue', [{ attribute: 'might', value: 1 }]) },
    f5: { r: 1800, t: -480, data: stat('vida', 5) },
    f6: { r: 1850, t: -640, data: attr('might') },
    f7: {
      r: 1950,
      t: -560,
      cost: 2,
      data: ability('furia-descontrolada', [
        { attribute: 'might', value: 2 },
        { attribute: 'fortitude', value: 1 },
      ]),
    },
    f8: {
      r: 2050,
      t: -400,
      cost: 2,
      data: ability('instinto-sanguinario', [{ attribute: 'might', value: 2 }]),
    },

    // ── Cluster SANGUE (aberto: entradas via branchR e via w5/s4) ────────────
    s1: { r: 1450, t: 360, data: attr('fortitude') },
    s2: {
      r: 1550,
      t: 520,
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
      r: 1950,
      t: 560,
      cost: 2,
      data: ability('pisada-de-impacto', [
        { attribute: 'might', value: 2 },
        { attribute: 'fortitude', value: 1 },
      ]),
    },
    s8: {
      r: 2050,
      t: 400,
      data: {
        type: 'weaponBonus',
        requiredTags: ['corpo-a-corpo'],
        bonusType: 'damage',
        dice: '1d4',
        value: 0,
      },
    },

    // ── Cluster ARMAS PESADAS (aberto: start, f4 e s4; supremo no extremo) ───
    w1: { r: 1650, t: -90, data: attr('might') },
    w2: { r: 1650, t: 90, data: attr('fortitude') },
    w3: {
      r: 1800,
      t: 0,
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
      r: 1950,
      t: -140,
      data: {
        type: 'weaponBonus',
        requiredTags: ['corpo-a-corpo'],
        bonusType: 'damage',
        dice: '1d6',
        value: 0,
      },
    },
    w5: {
      r: 1950,
      t: 140,
      data: {
        type: 'weaponBonus',
        requiredTags: ['duas-maos'],
        bonusType: 'critMultiplier',
        value: 1,
      },
    },
    w6: { r: 2100, t: -80, data: ability('desarmar', [{ attribute: 'might', value: 1 }]) },
    w7: { r: 2100, t: 80, data: ability('rasteira', [{ attribute: 'fortitude', value: 1 }]) },
    w8: {
      r: 2250,
      t: 0,
      cost: 3,
      data: supreme('Titã do Campo de Batalha', 'Nó Supremo: seu corpo é uma arma de cerco viva.', [
        { kind: 'attributeBonus', attribute: 'might', value: 2 },
        { kind: 'attributeBonus', attribute: 'fortitude', value: 2 },
        { kind: 'statBonus', stat: 'vida', value: 10 },
        { kind: 'extraDamage', flat: 3, attackTargets: ['corpo-a-corpo'] },
      ]),
    },
    w9: {
      r: 2200,
      t: -260,
      cost: 2,
      data: ability('controle-de-zona', [
        { attribute: 'might', value: 2 },
        { attribute: 'sense', value: 1 },
      ]),
    },
    w10: {
      r: 2200,
      t: 260,
      cost: 2,
      data: ability('golpe-atordoante', [
        { attribute: 'might', value: 2 },
        { attribute: 'fortitude', value: 1 },
      ]),
    },
    wa1: {
      r: 2320,
      t: -520,
      data: conditional(
        'Mestre do Impacto',
        'Armas de impacto convertem força em controle e Concussão.',
        { weaponTagsAnyOf: ['impacto'], armorTagsAnyOf: [] },
        [
          { kind: 'extraDamage', flat: 2, attackTargets: ['armas-contundentes'] },
          { kind: 'attributeBonus', attribute: 'might', value: 1 },
        ],
      ),
    },
    wa2: {
      r: 2320,
      t: 520,
      data: { type: 'weaponBonus', requiredTags: ['haste'], bonusType: 'hitBonus', value: 2 },
    },
    wa3: {
      r: 2440,
      t: 0,
      data: { type: 'weaponBonus', requiredTags: ['cortante'], bonusType: 'damage', value: 3 },
    },

    // ── FRONTEIRA GUERREIRO ↔ TANK: vida, bloqueio e absorção ───────────────
    gt1: { r: 1500, t: -700, data: attr('fortitude') },
    gt2: { r: 1640, t: -760, data: stat('vida', 10) },
    gt3: { r: 1780, t: -820, data: { type: 'defenseBonus', damageType: 'physical', value: 1 } },
    gt4: { r: 1920, t: -880, data: stat('vida', 15) },
    gt5: {
      r: 2060,
      t: -940,
      cost: 2,
      data: conditional(
        'Coração Blindado',
        'Na fronteira entre Guerreiro e Tank, massa corporal e armadura convertem impacto em permanência.',
        { weaponTagsAnyOf: [], armorTagsAnyOf: ['media', 'pesada'] },
        [
          { kind: 'blockBonus', value: 2 },
          { kind: 'statBonus', stat: 'vida', value: 10 },
          { kind: 'attributeBonus', attribute: 'fortitude', value: 1 },
        ],
      ),
    },
    gtEnd: { r: 2200, t: -1000, cost: 2, data: stat('vida', 20) },

    // ── FRONTEIRA GUERREIRO ↔ ROGUE: dano bruto corpo a corpo ───────────────
    gr1: { r: 1500, t: 700, data: attr('might') },
    gr2: {
      r: 1640,
      t: 760,
      data: ability('ataque-secundario', [
        { attribute: 'might', value: 1 },
        { attribute: 'grace', value: 1 },
      ]),
    },
    gr3: {
      r: 1780,
      t: 820,
      data: { type: 'extraDamage', dice: '1d4', attackTargets: ['corpo-a-corpo'] },
    },
    gr4: {
      r: 1920,
      t: 880,
      cost: 2,
      data: ability('golpe-perfurante', [
        { attribute: 'might', value: 2 },
        { attribute: 'sense', value: 1 },
      ]),
    },
    gr5: {
      r: 2060,
      t: 940,
      data: { type: 'weaponBonus', requiredTags: ['corpo-a-corpo'], bonusType: 'damage', value: 3 },
    },
    grEnd: {
      r: 2200,
      t: 1000,
      cost: 2,
      data: supreme(
        'Impacto Implacável',
        'A transição Guerreiro–Rogue troca sutileza por pressão melee contínua.',
        [
          { kind: 'extraDamage', dice: '1d6', attackTargets: ['corpo-a-corpo'] },
          { kind: 'attributeBonus', attribute: 'might', value: 1 },
          { kind: 'attributeBonus', attribute: 'grace', value: 1 },
        ],
      ),
    },

    // ── Cluster BRUISER (fechado, interno) ───────────────────────────────────
    b1: { r: 1100, t: 260, data: attr('fortitude') },
    b2: { r: 1000, t: 380, data: stat('vida', 10) },
    b3: { r: 950, t: 480, data: { type: 'defenseBonus', damageType: 'physical', value: 1 } },

    // ── Cluster SENSE (fechado, interno; obrigatório em toda seção) ──────────
    se1: { r: 1100, t: -260, data: attr('sense') },
    se2: { r: 1000, t: -380, data: attr('sense') },
    se3: { r: 900, t: -300, data: attr('sense') },
    se4: { r: 950, t: -480, data: attr('sense') },
  },
  edges: [
    ['start', 'path1'],
    ['path1', 'path2'],
    ['path2', 'path3'],
    ['path1', 'branchL'],
    ['path1', 'branchR'],
    // Fúria
    ['branchL', 'f1'],
    ['f1', 'f2'],
    ['f2', 'f3'],
    ['f2', 'f4'],
    ['f3', 'f5'],
    ['f5', 'f6'],
    ['f6', 'f7'],
    ['f4', 'f8'],
    ['f5', 'f8'],
    // Sangue
    ['branchR', 's1'],
    ['s1', 's2'],
    ['s2', 's3'],
    ['s2', 's4'],
    ['s3', 's5'],
    ['s5', 's6'],
    ['s6', 's7'],
    ['s4', 's8'],
    ['s5', 's8'],
    // Armas Pesadas (entradas: start; alternativas via f4 e s4 = cluster aberto)
    ['start', 'w1'],
    ['start', 'w2'],
    ['w1', 'w3'],
    ['w2', 'w3'],
    ['w3', 'w4'],
    ['w3', 'w5'],
    ['w4', 'w6'],
    ['w5', 'w7'],
    ['w6', 'w8'],
    ['w7', 'w8'],
    ['w6', 'w9'],
    ['w7', 'w10'],
    ['w9', 'w8'],
    ['w10', 'w8'],
    ['w9', 'wa1'],
    ['w10', 'wa2'],
    ['w8', 'wa3'],
    ['wa1', 'wa3'],
    ['wa2', 'wa3'],
    ['f4', 'w4'],
    ['s4', 'w5'],
    // Fronteira Tank
    ['f3', 'gt1'],
    ['gt1', 'gt2'],
    ['gt2', 'gt3'],
    ['gt3', 'gt4'],
    ['gt4', 'gt5'],
    ['gt5', 'gtEnd'],
    // Fronteira Rogue
    ['s3', 'gr1'],
    ['gr1', 'gr2'],
    ['gr2', 'gr3'],
    ['gr3', 'gr4'],
    ['gr4', 'gr5'],
    ['gr5', 'grEnd'],
    // Bruiser
    ['path2', 'b1'],
    ['b1', 'b2'],
    ['b2', 'b3'],
    // Sense
    ['path2', 'se1'],
    ['se1', 'se2'],
    ['se2', 'se3'],
    ['se2', 'se4'],
  ],
}

const WARRIOR_ANGLE = -120
const WARRIOR_PLAYER_RADIUS = 8000
const WARRIOR_LAYOUT_SCALE = 0.75

interface WarriorPlacedNode {
  id: string
  radius: number
  sweep: number
  data: TalentNodeData
  cost?: number
}

function warriorPosition(radius: number, sweep: number): { x: number; y: number } {
  const anchor = pos(WARRIOR_ANGLE, WARRIOR_PLAYER_RADIUS, 0)
  const direction = ((WARRIOR_ANGLE + sweep) * Math.PI) / 180
  const compactRadius = radius * WARRIOR_LAYOUT_SCALE
  return {
    x: Math.round(anchor.x + Math.cos(direction) * compactRadius),
    y: Math.round(anchor.y + Math.sin(direction) * compactRadius),
  }
}

function buildWarrior(): { nodes: TalentTreeNode[]; edges: TalentTreeEdge[] } {
  const nodes: TalentTreeNode[] = []
  const edges: TalentTreeEdge[] = []
  const anchor = warriorPosition(0, 0)
  nodes.push({
    id: 'guerreiro-start',
    ...anchor,
    data: {
      type: 'player',
      name: GUERREIRO.name,
      description:
        'Combatente de linha de frente: muita vida, dano físico consistente e recursos para permanecer em lutas longas.',
    },
  })

  // Oito troncos orgânicos crescem em 360° ao redor do jogador. Cada tronco
  // bifurca em uma raiz; algumas terminam, outras reencontram outro fluxo.
  // São 104 atributos de malha: exatamente 10 Sense e apenas 5 Grace. Portões
  // exclusivos de dependência adicionam outros atributos temáticos depois.
  const trunkAngles = [-180, -135, -90, -45, 0, 45, 90, 135]
  const senseIndices = new Set([3, 13, 24, 35, 46, 57, 68, 79, 90, 101])
  const graceIndices = new Set([8, 30, 52, 74, 96])
  const attributeNodes: Array<{ id: string; radius: number; sweep: number }> = []
  const trunkNodeIds: string[][] = []
  const pendingRootConnections: Array<[string, number, number]> = []
  let attributeIndex = 0

  const addAttribute = (id: string, radius: number, sweep: number) => {
    let attribute: AttributeName
    if (senseIndices.has(attributeIndex)) attribute = 'sense'
    else if (graceIndices.has(attributeIndex)) attribute = 'grace'
    else attribute = attributeIndex % 5 < 2 ? 'fortitude' : 'might'
    nodes.push({ id, ...warriorPosition(radius, sweep), data: attr(attribute) })
    attributeNodes.push({ id, radius, sweep })
    attributeIndex++
  }

  for (let trunkIndex = 0; trunkIndex < trunkAngles.length; trunkIndex++) {
    const baseSweep = trunkAngles[trunkIndex]
    const ids: string[] = []

    for (let step = 1; step <= 9; step++) {
      const radius = step * 260
      const sweep = baseSweep + Math.sin(step * 0.82 + trunkIndex * 1.31) * 8
      const id = `guerreiro-tronco-${trunkIndex + 1}-${step}`
      addAttribute(id, radius, sweep)
      ids.push(id)
      if (step > 1) edges.push(edgeBetween(ids[step - 2], id))
    }
    trunkNodeIds.push(ids)

    const rootIds: string[] = []
    for (let step = 1; step <= 4; step++) {
      const radius = 1040 + step * 225
      const sweep = baseSweep + 18 + step * 4.5 + Math.sin(step + trunkIndex) * 1.5
      const id = `guerreiro-raiz-${trunkIndex + 1}-${step}`
      addAttribute(id, radius, sweep)
      rootIds.push(id)
      edges.push(edgeBetween(step === 1 ? ids[3] : rootIds[step - 2], id))
    }

    if ([0, 2, 5, 7].includes(trunkIndex))
      pendingRootConnections.push([rootIds[3], (trunkIndex + 1) % trunkAngles.length, 6])
  }

  // Órbita inicial: o jogador tem quatro saídas, e os demais fluxos podem ser
  // alcançados contornando-o. É circular sem obrigar o resto da árvore a sê-lo.
  for (let trunkIndex = 0; trunkIndex < trunkNodeIds.length; trunkIndex++) {
    const next = (trunkIndex + 1) % trunkNodeIds.length
    edges.push(edgeBetween(trunkNodeIds[trunkIndex][0], trunkNodeIds[next][0]))
  }
  for (const trunkIndex of [0, 2, 4, 6])
    edges.push(edgeBetween('guerreiro-start', trunkNodeIds[trunkIndex][0]))

  for (const [rootId, targetTrunk, targetStep] of pendingRootConnections)
    edges.push(edgeBetween(rootId, trunkNodeIds[targetTrunk][targetStep]))

  // Uma ponte assimétrica cria um circuito opcional sem atravessar outros fluxos.
  for (const [fromTrunk, fromStep, toTrunk, toStep] of [[0, 2, 1, 4]])
    edges.push(edgeBetween(trunkNodeIds[fromTrunk][fromStep], trunkNodeIds[toTrunk][toStep]))

  const closestAttributeNode = (placed: WarriorPlacedNode) => {
    const position = warriorPosition(placed.radius, placed.sweep)
    return attributeNodes.reduce((best, candidate) => {
      const candidatePosition = warriorPosition(candidate.radius, candidate.sweep)
      const bestPosition = warriorPosition(best.radius, best.sweep)
      const candidateDistance = Math.hypot(
        candidatePosition.x - position.x,
        candidatePosition.y - position.y,
      )
      const bestDistance = Math.hypot(bestPosition.x - position.x, bestPosition.y - position.y)
      return candidateDistance < bestDistance ? candidate : best
    }, attributeNodes[0]).id
  }

  const addSpine = (spine: string, placedNodes: WarriorPlacedNode[]) => {
    const targetSweep: Record<string, number> = {
      poder: 0,
      tenacidade: -72,
      armas: 72,
      furia: -144,
      tecnica: 144,
    }
    const rotation = (targetSweep[spine] ?? placedNodes[0].sweep) - placedNodes[0].sweep
    for (let index = 0; index < placedNodes.length; index++) {
      const placed = placedNodes[index]
      const curvedPlaced: WarriorPlacedNode = {
        ...placed,
        sweep: placed.sweep + rotation + Math.sin(index * 1.17 + rotation) * 10,
      }
      const baseSweep = curvedPlaced.sweep
      const offsets = [0, 6, -6, 12, -12, 18, -18, 24, -24, 30, -30]
      for (const offset of offsets) {
        const candidate = warriorPosition(curvedPlaced.radius, baseSweep + offset)
        const collides = nodes.some(
          (existing) => Math.hypot(existing.x - candidate.x, existing.y - candidate.y) < 110,
        )
        if (!collides) {
          curvedPlaced.sweep = baseSweep + offset
          break
        }
      }
      const id = `guerreiro-${spine}-${placed.id}`
      const node: TalentTreeNode = {
        id,
        ...warriorPosition(curvedPlaced.radius, curvedPlaced.sweep),
        data: placed.data,
      }
      if (placed.cost != null) node.cost = placed.cost
      nodes.push(node)

      edges.push(edgeBetween(id, closestAttributeNode(curvedPlaced)))
    }
  }

  addSpine('poder', [
    { id: 'vida1', radius: 390, sweep: 0, data: stat('vida', 5) },
    {
      id: 'pressao1',
      radius: 650,
      sweep: 0,
      data: { type: 'extraDamage', flat: 1, attackTargets: ['corpo-a-corpo'] },
    },
    {
      id: 'impacto1',
      radius: 910,
      sweep: 0,
      data: {
        type: 'weaponBonus',
        requiredTags: ['corpo-a-corpo'],
        bonusType: 'damage',
        value: 1,
      },
    },
    { id: 'vida2', radius: 1170, sweep: 0, data: stat('vida', 10) },
    { id: 'resistencia', radius: 1430, sweep: 0, data: stat('resistencia', 3) },
    {
      id: 'veterano',
      radius: 1690,
      sweep: 0,
      cost: 2,
      data: supreme(
        'Veterano de Cem Batalhas',
        'Quanto mais longa a luta, mais difícil se torna derrubar você.',
        [
          { kind: 'statBonus', stat: 'vida', value: 10 },
          { kind: 'attributeBonus', attribute: 'fortitude', value: 1 },
          { kind: 'extraDamage', flat: 1, attackTargets: ['corpo-a-corpo'] },
        ],
      ),
    },
    {
      id: 'devastacao',
      radius: 2080,
      sweep: 0,
      cost: 2,
      data: {
        type: 'weaponBonus',
        requiredTags: ['corpo-a-corpo'],
        bonusType: 'damage',
        value: 3,
      },
    },
    {
      id: 'tita',
      radius: 2440,
      sweep: 0,
      cost: 3,
      data: supreme('Titã do Campo de Batalha', 'Seu corpo é uma arma de cerco viva.', [
        { kind: 'attributeBonus', attribute: 'might', value: 2 },
        { kind: 'attributeBonus', attribute: 'fortitude', value: 2 },
        { kind: 'statBonus', stat: 'vida', value: 10 },
        { kind: 'extraDamage', flat: 3, attackTargets: ['corpo-a-corpo'] },
      ]),
    },
  ])

  addSpine('tenacidade', [
    { id: 'vida1', radius: 390, sweep: -43, data: stat('vida', 5) },
    {
      id: 'rd1',
      radius: 650,
      sweep: -43,
      data: { type: 'defenseBonus', damageType: 'physical', value: 1 },
    },
    { id: 'vida2', radius: 910, sweep: -43, data: stat('vida', 10) },
    {
      id: 'vb1',
      radius: 1170,
      sweep: -43,
      data: supreme('Guarda Econômica', 'Um reforço limitado de guarda para absorver pressão.', [
        { kind: 'blockBonus', value: 1 },
      ]),
    },
    {
      id: 'armadura',
      radius: 1430,
      sweep: -43,
      data: conditional(
        'Marcha Blindada',
        'Armadura intermediária ou pesada sustenta o avanço sem transformar o Guerreiro em Tank.',
        { weaponTagsAnyOf: [], armorTagsAnyOf: ['media', 'pesada'] },
        [
          { kind: 'statBonus', stat: 'vida', value: 10 },
          { kind: 'blockBonus', value: 1 },
        ],
      ),
    },
    { id: 'esquiva', radius: 1690, sweep: -43, data: stat('esquiva', 2) },
    {
      id: 'vb2',
      radius: 2050,
      sweep: -43,
      cost: 2,
      data: supreme('Aparar o Inevitável', 'Uma rara especialização de bloqueio do Guerreiro.', [
        { kind: 'blockBonus', value: 2 },
      ]),
    },
    {
      id: 'inquebravel',
      radius: 2380,
      sweep: -43,
      cost: 3,
      data: supreme(
        'Inquebrável',
        'O extremo defensivo de quem sobrevive pela própria tenacidade.',
        [
          { kind: 'statBonus', stat: 'vida', value: 20 },
          { kind: 'defenseBonus', damageType: 'physical', value: 2 },
          { kind: 'attributeBonus', attribute: 'fortitude', value: 2 },
        ],
      ),
    },
  ])

  addSpine('armas', [
    {
      id: 'uma-mao',
      radius: 390,
      sweep: 43,
      data: { type: 'weaponBonus', requiredTags: ['uma-mao'], bonusType: 'damage', value: 1 },
    },
    {
      id: 'duas-maos',
      radius: 650,
      sweep: 43,
      data: {
        type: 'weaponBonus',
        requiredTags: ['duas-maos'],
        bonusType: 'damage',
        dice: '1d4',
        value: 0,
      },
    },
    {
      id: 'impacto',
      radius: 910,
      sweep: 43,
      data: conditional(
        'Mestre do Impacto',
        'Armas de impacto convertem força em controle e Concussão.',
        { weaponTagsAnyOf: ['impacto'], armorTagsAnyOf: [] },
        [
          { kind: 'extraDamage', flat: 2, attackTargets: ['armas-contundentes'] },
          { kind: 'attributeBonus', attribute: 'might', value: 1 },
        ],
      ),
    },
    {
      id: 'cortante',
      radius: 1170,
      sweep: 43,
      data: { type: 'weaponBonus', requiredTags: ['cortante'], bonusType: 'damage', value: 2 },
    },
    {
      id: 'haste',
      radius: 1430,
      sweep: 43,
      data: { type: 'weaponBonus', requiredTags: ['haste'], bonusType: 'hitBonus', value: 2 },
    },
    {
      id: 'colosso',
      radius: 1690,
      sweep: 43,
      cost: 2,
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
    {
      id: 'mestre',
      radius: 2050,
      sweep: 43,
      cost: 2,
      data: { type: 'weaponBonus', requiredTags: ['cortante'], bonusType: 'damage', value: 3 },
    },
    {
      id: 'arsenal',
      radius: 2380,
      sweep: 43,
      cost: 3,
      data: supreme('Arsenal Vivo', 'O extremo ofensivo domina qualquer arma corpo a corpo.', [
        { kind: 'extraDamage', dice: '1d6', attackTargets: ['corpo-a-corpo'] },
        { kind: 'attributeBonus', attribute: 'might', value: 2 },
      ]),
    },
  ])

  const addDestinationNode = (
    id: string,
    radius: number,
    sweep: number,
    data: TalentNodeData,
    connectTo: string,
    cost?: number,
  ) => {
    const candidates: Array<[number, number]> = [
      [0, 0],
      [7, 0],
      [-7, 0],
      [14, 0],
      [-14, 0],
      [0, 120],
      [0, -120],
      [21, 0],
      [-21, 0],
    ]
    let position = warriorPosition(radius, sweep)
    for (const [sweepOffset, radiusOffset] of candidates) {
      const candidate = warriorPosition(radius + radiusOffset, sweep + sweepOffset)
      if (
        nodes.every(
          (existing) => Math.hypot(existing.x - candidate.x, existing.y - candidate.y) >= 110,
        )
      ) {
        position = candidate
        break
      }
    }
    const node: TalentTreeNode = { id, ...position, data }
    if (cost != null) node.cost = cost
    nodes.push(node)
    edges.push(edgeBetween(connectTo, id))
    return id
  }

  const addGate = (
    id: string,
    radius: number,
    sweep: number,
    attribute: AttributeName,
    connectTo: string,
  ) => addDestinationNode(id, radius, sweep, attr(attribute), connectTo)

  const addSkillDestination = (
    key: string,
    skillId: string,
    bonuses: AttrBonus[],
    radius: number,
    sweep: number,
    connectTo: string,
    cost?: number,
  ) =>
    addDestinationNode(
      `guerreiro-habilidade-${key}`,
      radius,
      sweep,
      ability(skillId, bonuses),
      connectTo,
      cost,
    )

  // Habilidades independentes: destinos espalhados por regiões diferentes.
  addSkillDestination(
    'impulsao',
    'impulsao',
    [{ attribute: 'might', value: 1 }],
    820,
    -172,
    'guerreiro-tronco-1-3',
  )
  addSkillDestination(
    'desarmar',
    'desarmar',
    [{ attribute: 'might', value: 1 }],
    1080,
    -84,
    'guerreiro-tronco-3-4',
  )
  addSkillDestination(
    'rasteira',
    'rasteira',
    [{ attribute: 'fortitude', value: 1 }],
    1340,
    4,
    'guerreiro-tronco-5-5',
  )
  addSkillDestination(
    'ataque-secundario',
    'ataque-secundario',
    [
      { attribute: 'might', value: 1 },
      { attribute: 'grace', value: 1 },
    ],
    1600,
    92,
    'guerreiro-tronco-7-6',
  )
  addSkillDestination(
    'golpe-perfurante',
    'golpe-perfurante',
    [
      { attribute: 'might', value: 2 },
      { attribute: 'sense', value: 1 },
    ],
    1910,
    142,
    'guerreiro-tronco-8-7',
    2,
  )
  addSkillDestination(
    'controle-zona',
    'controle-de-zona',
    [
      { attribute: 'might', value: 2 },
      { attribute: 'sense', value: 1 },
    ],
    2170,
    78,
    'guerreiro-tronco-7-8',
    2,
  )
  addSkillDestination(
    'golpe-atordoante',
    'golpe-atordoante',
    [
      { attribute: 'might', value: 2 },
      { attribute: 'fortitude', value: 1 },
    ],
    2550,
    20,
    'guerreiro-tronco-5-9',
    3,
  )

  // Caminho exclusivo de Fúria. O único acesso à parte dependente passa pela
  // habilidade Fúria; cada evolução ainda exige atributos intermediários.
  const fury = addSkillDestination(
    'furia',
    'furia',
    [{ attribute: 'might', value: 1 }],
    2600,
    -135,
    'guerreiro-tronco-2-9',
  )
  const furyGate1 = addGate('guerreiro-furia-portao-1', 2900, -125, 'might', fury)
  const furyHub = addGate('guerreiro-furia-portao-2', 3200, -125, 'fortitude', furyGate1)

  const uncontrolledGate = addGate(
    'guerreiro-furia-descontrolada-portao',
    3500,
    -148,
    'might',
    furyHub,
  )
  addSkillDestination(
    'furia-descontrolada',
    'furia-descontrolada',
    [
      { attribute: 'might', value: 2 },
      { attribute: 'fortitude', value: 1 },
    ],
    3850,
    -152,
    uncontrolledGate,
    2,
  )

  const instinctGate = addGate('guerreiro-instinto-portao', 3510, -125, 'fortitude', furyHub)
  addSkillDestination(
    'instinto-sanguinario',
    'instinto-sanguinario',
    [{ attribute: 'might', value: 2 }],
    3860,
    -125,
    instinctGate,
    2,
  )

  const stompGate1 = addGate('guerreiro-pisada-portao-1', 3500, -102, 'might', furyHub)
  const stompGate2 = addGate('guerreiro-pisada-portao-2', 3750, -98, 'fortitude', stompGate1)
  addSkillDestination(
    'pisada-impacto',
    'pisada-de-impacto',
    [
      { attribute: 'might', value: 2 },
      { attribute: 'fortitude', value: 1 },
    ],
    4100,
    -94,
    stompGate2,
    2,
  )

  const furyCapGate = addGate('guerreiro-furia-eterna-portao', 3550, -138, 'might', furyHub)
  addDestinationNode(
    'guerreiro-furia-eterna',
    4200,
    -138,
    supreme('Fúria Eterna', 'A luta prolongada alimenta uma violência impossível de conter.', [
      { kind: 'statBonus', stat: 'vida', value: 15 },
      { kind: 'extraDamage', flat: 3, attackTargets: ['corpo-a-corpo'] },
      { kind: 'attributeBonus', attribute: 'might', value: 2 },
    ]),
    furyCapGate,
    3,
  )

  // Vício em Sangue é a única entrada para Sede de Sangue.
  const bloodVice = addSkillDestination(
    'vicio-sangue',
    'vicio-em-sangue',
    [{ attribute: 'might', value: 1 }],
    2600,
    -48,
    'guerreiro-tronco-4-9',
  )
  const bloodGate1 = addGate('guerreiro-sede-portao-1', 2900, -48, 'might', bloodVice)
  const bloodGate2 = addGate('guerreiro-sede-portao-2', 3200, -48, 'fortitude', bloodGate1)
  addSkillDestination(
    'sede-sangue',
    'sede-de-sangue',
    [
      { attribute: 'might', value: 1 },
      { attribute: 'fortitude', value: 1 },
    ],
    3550,
    -48,
    bloodGate2,
    2,
  )

  return { nodes, edges: dedupeEdges(edges) }
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
      r: PLAYER_RADIUS,
      t: 0,
      data: {
        type: 'player',
        name: 'Rogue',
        description: 'Letalidade precisa, furtividade e golpes fatais.',
      },
    },
    path1: { r: 1250, t: 0, data: attr('grace') },
    path2: { r: 1000, t: 0, data: attr('grace') },
    path3: { r: 750, t: 0, data: attr('grace') },
    branchL: { r: 1350, t: -180, data: attr('grace') },
    branchR: { r: 1350, t: 180, data: attr('sense') },

    // ── Cluster ASSASSINATO (aberto: branchL e via a4/d4) ────────────────────
    a1: { r: 1450, t: -360, data: attr('grace') },
    a2: { r: 1550, t: -520, data: ability('emboscar', [{ attribute: 'grace', value: 1 }]) },
    a3: { r: 1700, t: -560, data: attr('sense') },
    a4: { r: 1650, t: -380, data: ability('garrote', [{ attribute: 'grace', value: 1 }]) },
    a5: { r: 1800, t: -480, data: attr('grace') },
    a6: { r: 1850, t: -640, data: attr('grace') },
    a7: {
      r: 1950,
      t: -560,
      cost: 2,
      data: ability('marcar-para-a-morte', [
        { attribute: 'grace', value: 2 },
        { attribute: 'sense', value: 1 },
      ]),
    },
    a8: {
      r: 2050,
      t: -400,
      cost: 2,
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
    a9: {
      r: 2180,
      t: -560,
      cost: 2,
      data: ability('execucao', [
        { attribute: 'grace', value: 2 },
        { attribute: 'sense', value: 1 },
      ]),
    },

    // ── Cluster SANGRAMENTO (aberto: branchR e via sg4/d5) ───────────────────
    sg1: { r: 1450, t: 360, data: attr('grace') },
    sg2: {
      r: 1550,
      t: 520,
      data: ability('hemorragia-interna', [{ attribute: 'grace', value: 1 }]),
    },
    sg3: { r: 1700, t: 560, data: attr('sense') },
    sg4: {
      r: 1650,
      t: 380,
      data: { type: 'extraDamage', flat: 1, attackTargets: ['corpo-a-corpo'] },
    },
    sg5: { r: 1800, t: 480, data: stat('pc', 1) },
    sg6: { r: 1850, t: 640, data: attr('grace') },
    sg7: {
      r: 1950,
      t: 560,
      cost: 2,
      data: ability('pontos-fatais', [{ attribute: 'grace', value: 2 }]),
    },
    sg8: {
      r: 2050,
      t: 400,
      data: {
        type: 'weaponBonus',
        requiredTags: ['adaga', 'rapieira', 'uma-mao'],
        bonusType: 'threatRange',
        value: 1,
      },
    },
    sg9: {
      r: 2120,
      t: 560,
      cost: 2,
      data: ability('elipse-carmesim', [
        { attribute: 'grace', value: 2 },
        { attribute: 'might', value: 1 },
      ]),
    },
    sg10: {
      r: 2260,
      t: 640,
      cost: 2,
      data: ability('elipse-carmesim-suprema', [
        { attribute: 'grace', value: 2 },
        { attribute: 'sense', value: 1 },
      ]),
    },

    // ── Cluster DUAL WIELD / CRÍTICO (aberto: start, a4 e sg4) ───────────────
    d1: { r: 1650, t: -90, data: attr('grace') },
    d2: { r: 1650, t: 90, data: attr('sense') },
    d3: {
      r: 1800,
      t: 0,
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
      r: 1950,
      t: -140,
      data: {
        type: 'weaponBonus',
        requiredTags: ['uma-mao'],
        bonusType: 'critMultiplier',
        value: 1,
      },
    },
    d5: {
      r: 1950,
      t: 140,
      data: {
        type: 'weaponBonus',
        requiredTags: ['corpo-a-corpo'],
        bonusType: 'hitBonus',
        value: 1,
      },
    },
    d6: { r: 2100, t: -80, data: ability('desarranjar', [{ attribute: 'grace', value: 1 }]) },
    d7: { r: 2100, t: 80, data: ability('recuar-estrategico', [{ attribute: 'grace', value: 1 }]) },
    d8: {
      r: 2250,
      t: 0,
      cost: 3,
      data: supreme('Espectro Carmesim', 'Nó Supremo: você é o corte que ninguém viu chegar.', [
        { kind: 'attributeBonus', attribute: 'grace', value: 2 },
        { kind: 'attributeBonus', attribute: 'sense', value: 1 },
        { kind: 'statBonus', stat: 'esquiva', value: 5 },
        { kind: 'extraDamage', dice: '1d4', attackTargets: ['corpo-a-corpo'] },
      ]),
    },

    // ── FRONTEIRA ROGUE ↔ GUERREIRO: dano bruto e múltiplos golpes ──────────
    rw1: { r: 1500, t: -700, data: attr('grace') },
    rw2: {
      r: 1640,
      t: -760,
      data: ability('golpe-duplo', [
        { attribute: 'grace', value: 1 },
        { attribute: 'might', value: 1 },
      ]),
    },
    rw3: {
      r: 1780,
      t: -820,
      data: { type: 'extraDamage', dice: '1d4', attackTargets: ['corpo-a-corpo'] },
    },
    rw4: { r: 1920, t: -880, data: attr('might') },
    rw5: {
      r: 2060,
      t: -940,
      data: {
        type: 'weaponBonus',
        requiredTags: ['uma-mao', 'dual-wield'],
        bonusType: 'damage',
        value: 3,
      },
    },
    rwEnd: {
      r: 2200,
      t: -1000,
      cost: 2,
      data: supreme(
        'Carnificina Cadenciada',
        'A transição Rogue–Guerreiro transforma velocidade em dano melee bruto.',
        [
          { kind: 'extraDamage', dice: '1d6', attackTargets: ['corpo-a-corpo'] },
          { kind: 'attributeBonus', attribute: 'grace', value: 1 },
          { kind: 'attributeBonus', attribute: 'might', value: 1 },
        ],
      ),
    },

    // ── FRONTEIRA ROGUE ↔ ARQUEIRO: crítico, leitura e precisão ──────────────
    ra1: { r: 1500, t: 760, data: attr('sense') },
    ra2: { r: 1640, t: 900, data: ability('analisar-padrao', [{ attribute: 'sense', value: 1 }]) },
    ra3: {
      r: 1780,
      t: 1040,
      data: {
        type: 'weaponBonus',
        requiredTags: ['uma-mao', 'distancia'],
        bonusType: 'hitBonus',
        value: 2,
      },
    },
    ra4: {
      r: 1920,
      t: 1180,
      cost: 2,
      data: ability('estocada-interruptora', [
        { attribute: 'grace', value: 2 },
        { attribute: 'sense', value: 1 },
      ]),
    },
    ra5: {
      r: 2060,
      t: 1320,
      data: {
        type: 'weaponBonus',
        requiredTags: ['rapieira', 'adaga', 'arco', 'besta', 'arma-de-fogo'],
        bonusType: 'threatRange',
        value: 1,
      },
    },
    raEnd: {
      r: 2200,
      t: 1460,
      cost: 2,
      data: supreme(
        'Precisão Predatória',
        'Na fronteira Rogue–Arqueiro, observar, acertar e critar são a mesma disciplina.',
        [
          { kind: 'attributeBonus', attribute: 'grace', value: 1 },
          { kind: 'attributeBonus', attribute: 'sense', value: 2 },
          {
            kind: 'custom',
            description:
              '+1 no acerto e +1 na Margem de Ameaça com ataques de arma contra alvos já observados ou Desprevenidos.',
          },
        ],
      ),
    },

    // ── Cluster MOBILIDADE (fechado, interno) ────────────────────────────────
    m1: { r: 1100, t: 260, data: attr('grace') },
    m2: { r: 1000, t: 380, data: stat('esquiva', 3) },
    m3: { r: 950, t: 480, data: attr('grace') },
    m4: {
      r: 1110,
      t: 600,
      data: conditional(
        'Couro Ágil',
        'Armadura leve preserva Esquiva, Furtividade e reposicionamento.',
        { weaponTagsAnyOf: [], armorTagsAnyOf: ['armadura-de-couro', 'leve'] },
        [
          { kind: 'statBonus', stat: 'esquiva', value: 3 },
          { kind: 'attributeBonus', attribute: 'grace', value: 1 },
        ],
      ),
    },
    m5: {
      r: 1270,
      t: 700,
      data: {
        type: 'weaponBonus',
        requiredTags: ['leve', 'perfurante'],
        bonusType: 'hitBonus',
        value: 2,
      },
    },

    // ── Cluster SENSE (fechado, interno; obrigatório em toda seção) ──────────
    se1: { r: 1100, t: -260, data: attr('sense') },
    se2: { r: 1000, t: -380, data: attr('sense') },
    se3: { r: 900, t: -300, data: attr('sense') },
    se4: { r: 950, t: -480, data: attr('sense') },
  },
  edges: [
    ['start', 'path1'],
    ['path1', 'path2'],
    ['path2', 'path3'],
    ['path1', 'branchL'],
    ['path1', 'branchR'],
    // Assassinato
    ['branchL', 'a1'],
    ['a1', 'a2'],
    ['a2', 'a3'],
    ['a2', 'a4'],
    ['a3', 'a5'],
    ['a5', 'a6'],
    ['a6', 'a7'],
    ['a4', 'a8'],
    ['a5', 'a8'],
    ['a7', 'a9'],
    ['a8', 'a9'],
    // Sangramento
    ['branchR', 'sg1'],
    ['sg1', 'sg2'],
    ['sg2', 'sg3'],
    ['sg2', 'sg4'],
    ['sg3', 'sg5'],
    ['sg5', 'sg6'],
    ['sg6', 'sg7'],
    ['sg4', 'sg8'],
    ['sg5', 'sg8'],
    ['sg7', 'sg9'],
    ['sg8', 'sg9'],
    ['sg9', 'sg10'],
    // Dual Wield / Crítico
    ['start', 'd1'],
    ['start', 'd2'],
    ['d1', 'd3'],
    ['d2', 'd3'],
    ['d3', 'd4'],
    ['d3', 'd5'],
    ['d4', 'd6'],
    ['d5', 'd7'],
    ['d6', 'd8'],
    ['d7', 'd8'],
    ['a4', 'd4'],
    ['sg4', 'd5'],
    // Fronteira Guerreiro
    ['a3', 'rw1'],
    ['rw1', 'rw2'],
    ['rw2', 'rw3'],
    ['rw3', 'rw4'],
    ['rw4', 'rw5'],
    ['rw5', 'rwEnd'],
    // Fronteira Arqueiro
    ['sg3', 'ra1'],
    ['ra1', 'ra2'],
    ['ra2', 'ra3'],
    ['ra3', 'ra4'],
    ['ra4', 'ra5'],
    ['ra5', 'raEnd'],
    // Mobilidade
    ['path2', 'm1'],
    ['m1', 'm2'],
    ['m2', 'm3'],
    ['m3', 'm4'],
    ['m4', 'm5'],
    // Sense
    ['path2', 'se1'],
    ['se1', 'se2'],
    ['se2', 'se3'],
    ['se2', 'se4'],
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// TANK (ângulo 180) — defesa reativa, armadura, controle e proteção do grupo
//   Guarda (aberto), Controle (aberto), Reação (aberto), Armadura (fechado),
//   Sense (fechado) e fronteira Guerreiro/Tank focada em vida e absorção.
// ─────────────────────────────────────────────────────────────────────────────

const TANK: SectionSpec = {
  id: 'tank',
  name: 'Tank',
  angle: 180,
  nodes: {
    start: {
      r: PLAYER_RADIUS,
      t: 0,
      data: {
        type: 'player',
        name: 'Tank',
        description: 'Bloqueio, vida, controle de zona e proteção direta dos aliados.',
      },
    },
    path1: { r: 1250, t: 0, data: attr('fortitude') },
    path2: { r: 1000, t: 0, data: attr('fortitude') },
    path3: { r: 750, t: 0, data: attr('fortitude') },
    branchL: { r: 1350, t: -180, data: attr('sense') },
    branchR: { r: 1350, t: 180, data: attr('might') },

    // ── GUARDA E PROTEÇÃO (aberto) ──────────────────────────────────────────
    g1: { r: 1580, t: -120, data: attr('fortitude') },
    g2: { r: 1580, t: 120, data: stat('vida', 10) },
    g3: { r: 1720, t: -220, data: ability('guarda-total', [{ attribute: 'fortitude', value: 1 }]) },
    g4: {
      r: 1740,
      t: 0,
      data: conditional(
        'Baluarte de Escudo',
        'Escudo equipado amplia o VB e ancora sua linha defensiva.',
        { weaponTagsAnyOf: ['escudo'], armorTagsAnyOf: [] },
        [
          { kind: 'blockBonus', value: 3 },
          { kind: 'attributeBonus', attribute: 'fortitude', value: 1 },
        ],
      ),
    },
    g5: {
      r: 1720,
      t: 220,
      data: ability('escudo-humano', [
        { attribute: 'fortitude', value: 1 },
        { attribute: 'sense', value: 1 },
      ]),
    },
    g6: {
      r: 1900,
      t: -180,
      cost: 2,
      data: ability('postura-de-muralha', [
        { attribute: 'fortitude', value: 2 },
        { attribute: 'might', value: 1 },
      ]),
    },
    g7: {
      r: 1900,
      t: 180,
      cost: 2,
      data: ability('ultima-resistencia', [{ attribute: 'fortitude', value: 3 }]),
    },
    g8: {
      r: 2100,
      t: 0,
      cost: 3,
      data: supreme('Muralha Viva', 'Nó Supremo: você existe entre o perigo e o grupo.', [
        { kind: 'attributeBonus', attribute: 'fortitude', value: 3 },
        { kind: 'statBonus', stat: 'vida', value: 20 },
        { kind: 'blockBonus', value: 5 },
        { kind: 'defense', damageType: 'physical', value: 2 },
        {
          kind: 'custom',
          description:
            'Uma vez por rodada, pode Bloquear um ataque dirigido a um aliado adjacente usando sua própria Reação.',
        },
      ]),
    },

    // ── CONTROLE DE LINHA (aberto) ──────────────────────────────────────────
    c1: { r: 1480, t: -380, data: attr('sense') },
    c2: { r: 1580, t: -520, data: ability('provocacao', [{ attribute: 'sense', value: 1 }]) },
    c3: { r: 1720, t: -580, data: attr('might') },
    c4: { r: 1700, t: -400, data: ability('agarrar', [{ attribute: 'might', value: 1 }]) },
    c5: {
      r: 1860,
      t: -520,
      cost: 2,
      data: ability('pressao-constante', [
        { attribute: 'might', value: 1 },
        { attribute: 'fortitude', value: 1 },
      ]),
    },
    c6: {
      r: 1980,
      t: -640,
      cost: 2,
      data: ability('comando-de-assalto', [
        { attribute: 'sense', value: 2 },
        { attribute: 'fortitude', value: 1 },
      ]),
    },
    c7: { r: 2040, t: -440, data: attr('fortitude') },

    // ── EQUIPAMENTO DEFENSIVO (aberto: escudo, arma defensiva ou armadura) ──
    e1: { r: 1480, t: -760, data: attr('might') },
    e2: {
      r: 1600,
      t: -900,
      data: conditional(
        'Arma Defensiva',
        'Espadas e martelos de duas mãos, tonfas e escudos também constroem VB.',
        {
          weaponTagsAnyOf: ['escudo', 'espada-duas-maos', 'martelo-duas-maos', 'tonfa'],
          armorTagsAnyOf: [],
        },
        [
          { kind: 'blockBonus', value: 2 },
          { kind: 'attributeBonus', attribute: 'might', value: 1 },
        ],
      ),
    },
    e3: { r: 1740, t: -1020, data: stat('vida', 10) },
    e4: { r: 1860, t: -1140, data: { type: 'defenseBonus', damageType: 'all', value: 1 } },
    e5: { r: 1980, t: -1260, data: stat('resistencia', 3) },
    e6: {
      r: 2100,
      t: -1380,
      cost: 2,
      data: supreme(
        'Defesa de Área',
        'Treinamento para explosões e efeitos perceptíveis que atingem toda a formação.',
        [
          { kind: 'blockBonus', value: 3 },
          { kind: 'attributeBonus', attribute: 'sense', value: 1 },
          {
            kind: 'custom',
            description:
              'Ao Bloquear dano de área perceptível, um aliado adjacente recebe +2 VB contra a mesma instância.',
          },
        ],
      ),
    },
    e7: { r: 2200, t: -1500, cost: 2, data: stat('vida', 20) },
    e8: {
      r: 2300,
      t: -1620,
      cost: 3,
      data: supreme(
        'Sobreviver ao Imbloqueável',
        'Quando Bloqueio e RD não se aplicam, resta uma reserva de vida treinada.',
        [
          { kind: 'attributeBonus', attribute: 'fortitude', value: 2 },
          { kind: 'statBonus', stat: 'vida', value: 25 },
          {
            kind: 'custom',
            description:
              'Uma vez por Descanso Pleno, reduza à metade uma instância de dano contínuo, ambiental, mental ou Puro.',
          },
        ],
      ),
    },

    // ── REAÇÃO E ESTABILIDADE (aberto) ──────────────────────────────────────
    r1: { r: 1480, t: 380, data: attr('grace') },
    r2: { r: 1580, t: 520, data: ability('inabalavel', [{ attribute: 'fortitude', value: 1 }]) },
    r3: { r: 1720, t: 580, data: stat('pc', 2) },
    r4: {
      r: 1700,
      t: 400,
      data: ability('contra-ataque', [
        { attribute: 'grace', value: 1 },
        { attribute: 'fortitude', value: 1 },
      ]),
    },
    r5: {
      r: 1860,
      t: 520,
      data: supreme('Reação Treinada', 'A defesa correta preserva sua próxima resposta.', [
        { kind: 'blockBonus', value: 2 },
        { kind: 'statBonus', stat: 'pc', value: 2 },
        {
          kind: 'custom',
          description: 'Uma vez por rodada, quando um Bloqueio reduzir o dano a 0, recupere 1 PC.',
        },
      ]),
    },
    r6: { r: 2010, t: 620, data: stat('resistencia', 3) },

    // ── ARMADURA PESADA (fechado, interno) ──────────────────────────────────
    a1: { r: 1120, t: 150, data: attr('might') },
    a2: {
      r: 1020,
      t: 280,
      data: conditional(
        'Treinamento de Armadura Pesada',
        'Cota de Malha, Couraça ou Placas passam a funcionar como extensão do corpo.',
        {
          weaponTagsAnyOf: [],
          armorTagsAnyOf: ['cota-de-malha', 'couraca-de-metal', 'armadura-de-placas', 'pesada'],
        },
        [
          { kind: 'defense', damageType: 'physical', value: 1 },
          { kind: 'statBonus', stat: 'vida', value: 10 },
          { kind: 'attributeBonus', attribute: 'might', value: 1 },
        ],
      ),
    },
    a3: { r: 900, t: 400, data: stat('vida', 10) },
    a4: { r: 820, t: 260, data: { type: 'defenseBonus', damageType: 'physical', value: 1 } },
    a5: {
      r: 740,
      t: 140,
      data: conditional(
        'Camadas Amortecidas',
        'Gambeson sob armadura mantém o amortecimento e soma seu VB.',
        { weaponTagsAnyOf: [], armorTagsAnyOf: ['gambeson', 'media'] },
        [
          { kind: 'blockBonus', value: 1 },
          { kind: 'statBonus', stat: 'vida', value: 5 },
        ],
      ),
    },
    a6: { r: 640, t: 240, data: stat('vida', 10) },

    // ── SENSE (fechado, obrigatório) ────────────────────────────────────────
    se1: { r: 1120, t: -280, data: attr('sense') },
    se2: { r: 1020, t: -420, data: attr('sense') },
    se3: { r: 900, t: -520, data: attr('sense') },
    se4: { r: 820, t: -400, data: attr('sense') },

    // ── FRONTEIRA TANK ↔ GUERREIRO: vida adicional e tankar mais ────────────
    tg1: { r: 1500, t: 700, data: attr('fortitude') },
    tg2: { r: 1640, t: 760, data: stat('vida', 10) },
    tg3: {
      r: 1780,
      t: 820,
      data: supreme('Guarda Reforçada', 'O peso do ataque é distribuído pelo corpo inteiro.', [
        { kind: 'blockBonus', value: 2 },
        { kind: 'attributeBonus', attribute: 'fortitude', value: 1 },
      ]),
    },
    tg4: { r: 1920, t: 880, data: { type: 'defenseBonus', damageType: 'physical', value: 2 } },
    tg5: { r: 2060, t: 940, cost: 2, data: stat('vida', 20) },
    tgEnd: {
      r: 2200,
      t: 1000,
      cost: 2,
      data: supreme(
        'Linha Inquebrável',
        'A transição Tank–Guerreiro maximiza HP, VB e permanência na linha de frente.',
        [
          { kind: 'statBonus', stat: 'vida', value: 20 },
          { kind: 'blockBonus', value: 3 },
          { kind: 'attributeBonus', attribute: 'fortitude', value: 2 },
        ],
      ),
    },
  },
  edges: [
    ['start', 'path1'],
    ['path1', 'path2'],
    ['path2', 'path3'],
    ['path1', 'branchL'],
    ['path1', 'branchR'],
    // Guarda
    ['start', 'g1'],
    ['start', 'g2'],
    ['g1', 'g3'],
    ['g2', 'g5'],
    ['g3', 'g4'],
    ['g5', 'g4'],
    ['g3', 'g6'],
    ['g5', 'g7'],
    ['g6', 'g8'],
    ['g7', 'g8'],
    // Controle
    ['branchL', 'c1'],
    ['c1', 'c2'],
    ['c2', 'c3'],
    ['c2', 'c4'],
    ['c3', 'c5'],
    ['c4', 'c5'],
    ['c5', 'c6'],
    ['c5', 'c7'],
    ['c7', 'g6'],
    // Equipamento defensivo
    ['c3', 'e1'],
    ['e1', 'e2'],
    ['e2', 'e3'],
    ['e3', 'e4'],
    ['e4', 'e5'],
    ['e5', 'e6'],
    ['e6', 'e7'],
    ['e7', 'e8'],
    // Reação
    ['branchR', 'r1'],
    ['r1', 'r2'],
    ['r2', 'r3'],
    ['r2', 'r4'],
    ['r3', 'r5'],
    ['r4', 'r5'],
    ['r5', 'r6'],
    ['r5', 'g7'],
    // Armadura e Sense
    ['path2', 'a1'],
    ['a1', 'a2'],
    ['a2', 'a3'],
    ['a3', 'a4'],
    ['a4', 'a5'],
    ['a5', 'a6'],
    ['path2', 'se1'],
    ['se1', 'se2'],
    ['se2', 'se3'],
    ['se2', 'se4'],
    // Fronteira Guerreiro
    ['r3', 'tg1'],
    ['tg1', 'tg2'],
    ['tg2', 'tg3'],
    ['tg3', 'tg4'],
    ['tg4', 'tg5'],
    ['tg5', 'tgEnd'],
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÕES ESQUELETO (Arqueiro, Curandeiro, Mago)
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
        r: PLAYER_RADIUS,
        t: 0,
        data: { type: 'player', name: spec.name, description: spec.description },
      },
      path1: { r: 1250, t: 0, data: attr(spec.primary) },
      path2: { r: 1000, t: 0, data: attr(spec.primary) },
      path3: { r: 750, t: 0, data: attr(spec.primary) },
      branchL: { r: 1350, t: -180, data: attr(spec.primary) },
      branchR: { r: 1350, t: 180, data: attr(spec.secondary) },
      midL: { r: 1150, t: -300, data: attr(spec.secondary) },
      midR: { r: 1150, t: 300, data: attr(spec.primary) },
      t1L: { r: 1480, t: -340, data: spec.t1L },
      t1R: { r: 1480, t: 340, data: spec.t1R },
      t2L: { r: 1230, t: -480, data: spec.t2L },
      t2R: { r: 1230, t: 480, data: spec.t2R },
      utilL: { r: 1680, t: -180, data: spec.utilL },
      utilR: { r: 1680, t: 180, data: spec.utilR },
      statL: { r: 1650, t: -460, data: spec.statL },
      statR: { r: 1650, t: 460, data: spec.statR },
      cond: { r: 1840, t: 0, data: spec.cond },
      capstone: { r: 2050, t: 0, cost: 2, data: spec.capstone },
      // Cluster de Sense (obrigatório em toda seção)
      senseA: { r: 950, t: -180, data: attr('sense') },
      senseB: { r: 880, t: -330, data: attr('sense') },
      senseC: { r: 800, t: -230, data: attr('sense') },
    },
    edges: [
      ['start', 'path1'],
      ['path1', 'path2'],
      ['path2', 'path3'],
      ['path1', 'branchL'],
      ['path1', 'branchR'],
      ['branchL', 't1L'],
      ['branchR', 't1R'],
      ['branchL', 'midL'],
      ['branchR', 'midR'],
      ['midL', 't2L'],
      ['midR', 't2R'],
      ['t1L', 'statL'],
      ['t1R', 'statR'],
      ['start', 'utilL'],
      ['start', 'utilR'],
      ['utilL', 'cond'],
      ['utilR', 'cond'],
      ['cond', 'capstone'],
      ['path2', 'senseA'],
      ['senseA', 'senseB'],
      ['senseB', 'senseC'],
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
    utilL: {
      type: 'weaponBonus',
      requiredTags: ['arco', 'besta'],
      bonusType: 'hitBonus',
      value: 1,
    },
    utilR: { type: 'extraDamage', dice: '1d4', attackTargets: ['projeteis', 'arcos'] },
    statL: attr('sense'),
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
    utilL: attr('wisdom'),
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
        {
          kind: 'spellModifier',
          conditionElements: [],
          conditionTypes: [],
          effectType: 'costReduction',
          value: 2,
        },
        { kind: 'attributeBonus', attribute: 'wisdom', value: 1 },
      ],
    ),
    capstone: supreme(
      'Domínio Arcano',
      'Nó Supremo: uma vez por descanso longo, conjure uma magia 1 nível acima do permitido.',
      [
        {
          kind: 'custom',
          description: 'Conjura magias 1 nível acima do permitido, uma vez por descanso longo.',
        },
        { kind: 'attributeBonus', attribute: 'wisdom', value: 2 },
        { kind: 'attributeBonus', attribute: 'sense', value: 1 },
      ],
    ),
  },
]

// ── Build tree ────────────────────────────────────────────────────────────────

const ALL_SECTIONS: SectionSpec[] = [
  ROGUE,
  TANK,
  ...SKELETONS.filter((section) => section.id !== 'tank').map(skeletonToSection),
]

function buildTree(): TalentTree {
  const nodes: TalentTreeNode[] = []
  const edges: TalentTreeEdge[] = []

  const warrior = buildWarrior()
  nodes.push(...warrior.nodes)
  edges.push(...warrior.edges)

  for (const section of ALL_SECTIONS) {
    const built = buildSection(section)
    nodes.push(...built.nodes)
    edges.push(...built.edges)
  }

  return {
    id: TREE_ID,
    name: 'Árvore do Pináculo',
    description:
      'Árvore de talento oficial do OverGrown. As seis fantasias de classe são independentes, distantes e iniciadas por seus próprios nós de jogador. O Guerreiro se ramifica em caminhos circulares compactos ao redor do jogador.',
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

function parseCombatSkillCards(source: string): Array<{
  name: string
  cost: string
  requirement: string
  action: string
}> {
  const cards: Array<{ name: string; cost: string; requirement: string; action: string }> = []
  const marker = '\\combatSkillFull'
  let cursor = 0
  while ((cursor = source.indexOf(marker, cursor)) >= 0) {
    cursor += marker.length
    const args: string[] = []
    for (let argIndex = 0; argIndex < 6; argIndex++) {
      while (/\s/.test(source[cursor] ?? '')) cursor++
      if (source[cursor] !== '{')
        throw new Error(`Card melee inválido perto do caractere ${cursor}`)
      const start = ++cursor
      let depth = 1
      while (cursor < source.length && depth > 0) {
        if (source[cursor] === '{' && source[cursor - 1] !== '\\') depth++
        if (source[cursor] === '}' && source[cursor - 1] !== '\\') depth--
        cursor++
      }
      if (depth !== 0) throw new Error(`Chaves desbalanceadas no card melee perto de ${start}`)
      args.push(source.slice(start, cursor - 1).trim())
    }
    cards.push({ name: args[0], cost: args[1], requirement: args[2], action: args[3] })
  }
  return cards
}

function validate(tree: TalentTree): string[] {
  const errors: string[] = []
  const ids = new Set<string>()

  for (const n of tree.nodes) {
    if (ids.has(n.id)) errors.push(`ID duplicado: ${n.id}`)
    ids.add(n.id)
    if (n.data.type === 'link')
      errors.push(`Nós de ligação não são permitidos (regra atual): ${n.id}`)
    if (n.data.type === 'skillBonus')
      errors.push(`Nós de perícia foram removidos da árvore: ${n.id}`)
    if (n.data.type === 'attribute' && !n.data.attribute)
      errors.push(`Nó de atributo sem atributo fixo: ${n.id}`)
    if (n.data.type === 'combatAbility' && !(n.data.attributeBonuses ?? []).length)
      errors.push(`Habilidade sem bônus de atributo: ${n.id}`)
    if (n.data.type === 'combatAbility') {
      const catalogSkill = COMBAT_SKILLS_MAP[n.data.skillId]
      const expectedRequirement = catalogSkill
        ? combatSkillDependencyRequirement(catalogSkill)
        : undefined
      if (n.data.skillRequirement !== expectedRequirement)
        errors.push(
          `Requisito mecânico inválido em ${n.id}: esperado=${expectedRequirement ?? 'nenhum'}, recebido=${n.data.skillRequirement ?? 'nenhum'}`,
        )
    }
    if (n.data.type === 'magic' && !n.data.attributeBonuses.length)
      errors.push(`Magia sem bônus de atributo: ${n.id}`)
    if (n.cost != null && (!Number.isInteger(n.cost) || n.cost < 1))
      errors.push(`Custo inválido em ${n.id}: ${n.cost}`)
    if (n.data.type === 'conditional' && n.data.effects.length === 0)
      errors.push(`Nó condicional sem efeitos: ${n.id}`)
    if (n.data.type === 'weaponBonus' && n.data.requiredTags.length === 0)
      errors.push(`Bônus de arma sem tags: ${n.id}`)
  }

  for (const e of tree.edges) {
    if (!ids.has(e.from)) errors.push(`Edge ${e.id}: nó inexistente ${e.from}`)
    if (!ids.has(e.to)) errors.push(`Edge ${e.id}: nó inexistente ${e.to}`)
  }

  const nodesById = new Map(tree.nodes.map((node) => [node.id, node]))
  for (const edge of tree.edges) {
    const from = nodesById.get(edge.from)
    const to = nodesById.get(edge.to)
    if (
      from?.id.startsWith('guerreiro-') &&
      to?.id.startsWith('guerreiro-') &&
      from.data.type === 'combatAbility' &&
      to.data.type === 'combatAbility'
    )
      errors.push(`Habilidades do Guerreiro não podem ter ligação direta: ${edge.id}`)
  }

  // Cada classe é um componente independente, contendo exatamente um jogador.
  const adj = new Map<string, string[]>()
  for (const e of tree.edges) {
    adj.set(e.from, [...(adj.get(e.from) ?? []), e.to])
    adj.set(e.to, [...(adj.get(e.to) ?? []), e.from])
  }
  const playerNodes = tree.nodes.filter((n) => n.data.type === 'player')
  if (playerNodes.length !== 6)
    errors.push(
      `A árvore oficial precisa de 6 nós de jogador laterais; encontrou ${playerNodes.length}`,
    )
  if (tree.nodes.some((node) => node.id.startsWith('centro-')))
    errors.push('A região central foi removida e não pode conter nós')

  const unvisited = new Set(tree.nodes.map((node) => node.id))
  const components: string[][] = []
  while (unvisited.size > 0) {
    const first = unvisited.values().next().value as string
    const queue = [first]
    const component: string[] = []
    unvisited.delete(first)
    while (queue.length > 0) {
      const current = queue.pop() as string
      component.push(current)
      for (const next of adj.get(current) ?? []) {
        if (!unvisited.has(next)) continue
        unvisited.delete(next)
        queue.push(next)
      }
    }
    components.push(component)
  }
  if (components.length !== 6)
    errors.push(`As classes precisam formar 6 componentes isolados; encontrou ${components.length}`)
  for (const component of components) {
    const players = component.filter(
      (id) => tree.nodes.find((node) => node.id === id)?.data.type === 'player',
    )
    if (players.length !== 1)
      errors.push(
        `Componente ${component[0]} precisa de exatamente 1 jogador; encontrou ${players.length}`,
      )
  }

  // Dependências do livro formam subárvores exclusivas: sem adquirir a
  // habilidade-base, não pode existir outro caminho até o jogador.
  const warriorDependencies: Array<[string, string]> = [
    ['guerreiro-habilidade-furia', 'guerreiro-habilidade-furia-descontrolada'],
    ['guerreiro-habilidade-furia', 'guerreiro-habilidade-instinto-sanguinario'],
    ['guerreiro-habilidade-furia', 'guerreiro-habilidade-pisada-impacto'],
    ['guerreiro-habilidade-vicio-sangue', 'guerreiro-habilidade-sede-sangue'],
  ]
  for (const [required, dependent] of warriorDependencies) {
    if (!ids.has(required) || !ids.has(dependent)) {
      errors.push(`Cadeia de dependência incompleta: ${required} → ${dependent}`)
      continue
    }
    const queue = [dependent]
    const reached = new Set(queue)
    while (queue.length > 0) {
      const current = queue.pop() as string
      for (const next of adj.get(current) ?? []) {
        if (next === required || reached.has(next)) continue
        reached.add(next)
        queue.push(next)
      }
    }
    if (reached.has('guerreiro-start'))
      errors.push(`Dependência pode ser contornada: ${required} → ${dependent}`)
  }

  // O primeiro pacote melee precisa cobrir, exatamente uma vez, todas as
  // técnicas do capítulo 12 (incluindo as manobras genéricas de Esforço).
  const abilityNodes = tree.nodes.filter((n) => n.data.type === 'combatAbility')
  const abilityCounts = new Map<string, number>()
  for (const node of abilityNodes)
    abilityCounts.set(node.data.skillId, (abilityCounts.get(node.data.skillId) ?? 0) + 1)
  for (const skill of [...MELEE_SKILLS, ...EFFORT_SKILLS]) {
    const count = abilityCounts.get(skill.id) ?? 0
    if (count === 0) errors.push(`Habilidade melee do livro ausente da árvore: ${skill.id}`)
    if (count > 1) errors.push(`Habilidade melee repetida ${count} vezes: ${skill.id}`)
  }

  const meleeBookPath = join(process.cwd(), 'Livro', 'Contents', '12-melee.tex')
  const bookCards = parseCombatSkillCards(readFileSync(meleeBookPath, 'utf8'))
  const meleeCatalog = new Map(
    [...MELEE_SKILLS, ...EFFORT_SKILLS].map((skill) => [skill.name, skill]),
  )
  for (const card of bookCards) {
    const skill = meleeCatalog.get(card.name)
    if (!skill) {
      errors.push(`Habilidade do capítulo 12 ausente do catálogo: ${card.name}`)
      continue
    }
    if (skill.cost !== card.cost)
      errors.push(`Custo divergente em ${card.name}: livro=${card.cost}, catálogo=${skill.cost}`)
    if (skill.requirement !== card.requirement) errors.push(`Requisito divergente em ${card.name}`)
    if (skill.action !== card.action) errors.push(`Ação divergente em ${card.name}`)
  }
  for (const skillName of meleeCatalog.keys())
    if (!bookCards.some((card) => card.name === skillName))
      errors.push(`Habilidade melee no catálogo mas ausente do capítulo 12: ${skillName}`)

  const coveredWeaponTags = new Set<string>()
  const coveredArmorTags = new Set<string>()
  for (const node of tree.nodes) {
    if (node.data.type === 'weaponBonus')
      for (const tag of node.data.requiredTags) coveredWeaponTags.add(tag)
    if (node.data.type === 'conditional') {
      for (const tag of node.data.conditions.weaponTagsAnyOf) coveredWeaponTags.add(tag)
      for (const tag of node.data.conditions.armorTagsAnyOf) coveredArmorTags.add(tag)
    }
  }
  for (const tag of [
    'uma-mao',
    'duas-maos',
    'dual-wield',
    'escudo',
    'leve',
    'cortante',
    'perfurante',
    'impacto',
    'haste',
  ])
    if (!coveredWeaponTags.has(tag)) errors.push(`Fantasia de arma melee sem cobertura: ${tag}`)
  for (const tag of [
    'leve',
    'media',
    'pesada',
    'gambeson',
    'armadura-de-couro',
    'cota-de-malha',
    'couraca-de-metal',
    'armadura-de-placas',
  ])
    if (!coveredArmorTags.has(tag)) errors.push(`Fantasia de armadura sem cobertura: ${tag}`)

  // Sobreposição dura: abaixo de 80 unidades, os círculos de nós grandes se
  // tornam praticamente indistinguíveis. A faixa central de 110 é intencional.
  for (let i = 0; i < tree.nodes.length; i++) {
    for (let j = i + 1; j < tree.nodes.length; j++) {
      const a = tree.nodes[i]
      const b = tree.nodes[j]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      if (distance < 80) errors.push(`Nós sobrepostos (${distance.toFixed(1)}): ${a.id} / ${b.id}`)
    }
  }

  // Clareza visual do Guerreiro: nenhuma aresta pode atravessar outra. A rede
  // pode reconectar fluxos, mas cada circuito precisa ter leitura inequívoca.
  const warriorEdges = tree.edges.filter(
    (edge) => edge.from.startsWith('guerreiro-') && edge.to.startsWith('guerreiro-'),
  )
  const orientation = (a: TalentTreeNode, b: TalentTreeNode, c: TalentTreeNode) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  for (let i = 0; i < warriorEdges.length; i++) {
    for (let j = i + 1; j < warriorEdges.length; j++) {
      const first = warriorEdges[i]
      const second = warriorEdges[j]
      if ([first.from, first.to].some((id) => id === second.from || id === second.to)) continue
      const a = nodesById.get(first.from)
      const b = nodesById.get(first.to)
      const c = nodesById.get(second.from)
      const d = nodesById.get(second.to)
      if (!a || !b || !c || !d) continue
      const crosses =
        orientation(a, b, c) * orientation(a, b, d) < 0 &&
        orientation(c, d, a) * orientation(c, d, b) < 0
      if (crosses) errors.push(`Caminhos do Guerreiro se cruzam: ${first.id} / ${second.id}`)
    }
  }

  // A rodada atual fecha o Guerreiro; as demais classes serão ampliadas em ciclos próprios.
  const warriorNodes = tree.nodes.filter((node) => node.id.startsWith('guerreiro-'))
  const warriorAttributes = warriorNodes.filter((node) => node.data.type === 'attribute')
  const warriorSense = warriorAttributes.filter(
    (node) => node.data.type === 'attribute' && node.data.attribute === 'sense',
  )
  if (warriorAttributes.length < 100)
    errors.push(`Guerreiro precisa de ≥100 nós de atributo; tem ${warriorAttributes.length}`)
  if (warriorSense.length < 10)
    errors.push(`Guerreiro precisa de ≥10 nós de Sense; tem ${warriorSense.length}`)

  return errors
}

// ── Summary ───────────────────────────────────────────────────────────────────

function summarize(tree: TalentTree) {
  const byType = new Map<string, number>()
  for (const n of tree.nodes) byType.set(n.data.type, (byType.get(n.data.type) ?? 0) + 1)

  console.log(`Árvore "${tree.name}" v${tree.version}`)
  console.log(`  ${tree.nodes.length} nós · ${tree.edges.length} conexões`)
  for (const [type, count] of [...byType.entries()].sort()) console.log(`  ${type}: ${count}`)

  const sections = ['guerreiro', ...ALL_SECTIONS.map((s) => s.id)]
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
