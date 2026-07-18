// ─────────────────────────────────────────────────────────────────────────────
// OverGrown – Gerador da Árvore de Talento oficial (template)
//
// Gera src/data/defaultTalentTree.json — o arquivo oficial carregado
// automaticamente pelas páginas /talent-tree-builder e /arvore.
//
// Como usar:
//   npm run generate:tree
//
// Como balancear:
//   Edite as specs de classe abaixo (CLASSES) e rode o script de novo.
//   A validação embutida garante que a árvore continua consistente.
//
// Regras de design aplicadas:
//   • Nós de atributo são FIXOS (sem escolha do jogador) e dão +1 atributo.
//   • Todo nó de habilidade/magia dá atributos. O bônus escala com o
//     investimento necessário para alcançá-lo: tier 1 (~3 pts) → +1,
//     tier 2 (~5 pts) → +2, capstone (~8+ pts) → +3.
//   • Nós de ligação custam 0 e conectam seções (builds híbridas).
//   • Nós condicionais ("com script") ativam efeitos conforme equipamento.
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
const TREE_VERSION = 1

// ── Geometry ──────────────────────────────────────────────────────────────────
// 6 nós de jogador num hexágono grande + 1 nó central de ligação.
// Ângulos em graus, sistema SVG (y cresce para baixo):
//   topo:    Guerreiro (-120°) e Rogue (-60°)
//   meio:    Tank (180°) e Arqueiro (0°)
//   baixo:   Curandeiro (120°) e Mago (60°)

const PLAYER_RADIUS = 1500

interface ClassGeometry {
  angle: number
}

function pos(angleDeg: number, radius: number, tangent: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180
  const ux = Math.cos(a)
  const uy = Math.sin(a)
  const tx = -Math.sin(a)
  const ty = Math.cos(a)
  return {
    x: Math.round(ux * radius + tx * tangent),
    y: Math.round(uy * radius + ty * tangent),
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

// ── Class skeleton ────────────────────────────────────────────────────────────
// Cada classe usa o mesmo esqueleto de posições (coordenadas locais r/t):
//
//   capstone (r=2050)          ← mais fundo, custo 2, +3 atributos
//   cond     (r=1840)          ← nó condicional da classe
//   utilL/utilR (r=1680)       ← bônus passivos (arma/defesa/perícia…)
//   start    (r=1500)          ← NÓ DE JOGADOR (custo 0)
//   t1L/t1R  (r=1480, t=±340)  ← habilidades tier 1 (+1 atributo)
//   branchL/branchR (r=1350)   ← atributos de desvio
//   t2L/t2R  (r=1230, t=±480)  ← habilidades tier 2 (+2 atributos)
//   statL/statR (r=1650, t=±460) ← nós de stat
//   midL/midR (r=1150, t=±300) ← atributos
//   path1..3 (r=1250→750)      ← trilha de atributos até o centro
//   hub      (r=0)             ← nó de ligação central (compartilhado)

interface SkeletonSpec {
  id: string
  name: string
  description: string
  angle: number
  /** Atributo primário/secundário da trilha */
  primary: AttributeName
  secondary: AttributeName
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

const SKELETON_LAYOUT: Record<string, { r: number; t: number }> = {
  start:   { r: PLAYER_RADIUS, t: 0 },
  path1:   { r: 1250, t: 0 },
  path2:   { r: 1000, t: 0 },
  path3:   { r: 750,  t: 0 },
  branchL: { r: 1350, t: -180 },
  branchR: { r: 1350, t: 180 },
  midL:    { r: 1150, t: -300 },
  midR:    { r: 1150, t: 300 },
  t1L:     { r: 1480, t: -340 },
  t1R:     { r: 1480, t: 340 },
  t2L:     { r: 1230, t: -480 },
  t2R:     { r: 1230, t: 480 },
  utilL:   { r: 1680, t: -180 },
  utilR:   { r: 1680, t: 180 },
  statL:   { r: 1650, t: -460 },
  statR:   { r: 1650, t: 460 },
  cond:    { r: 1840, t: 0 },
  capstone:{ r: 2050, t: 0 },
}

const SKELETON_EDGES: Array<[string, string]> = [
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
]

function buildClass(spec: SkeletonSpec): { nodes: TalentTreeNode[]; edges: TalentTreeEdge[] } {
  const dataByKey: Record<string, TalentNodeData> = {
    start:   { type: 'player', name: spec.name, description: spec.description },
    path1:   attr(spec.primary),
    path2:   attr(spec.primary),
    path3:   attr(spec.primary),
    branchL: attr(spec.primary),
    branchR: attr(spec.secondary),
    midL:    attr(spec.secondary),
    midR:    attr(spec.primary),
    t1L: spec.t1L,
    t1R: spec.t1R,
    t2L: spec.t2L,
    t2R: spec.t2R,
    utilL: spec.utilL,
    utilR: spec.utilR,
    statL: spec.statL,
    statR: spec.statR,
    cond: spec.cond,
    capstone: spec.capstone,
  }

  const nodes: TalentTreeNode[] = Object.entries(dataByKey).map(([key, data]) => {
    const { r, t } = SKELETON_LAYOUT[key]
    const { x, y } = pos(spec.angle, r, t)
    const node: TalentTreeNode = { id: `${spec.id}-${key}`, x, y, data }
    if (key === 'capstone') node.cost = 2 // capstones custam 2 pontos
    return node
  })

  const edges: TalentTreeEdge[] = SKELETON_EDGES.map(([a, b]) => {
    const from = `${spec.id}-${a}`
    const to = `${spec.id}-${b}`
    return { id: [from, to].sort().join('--'), from, to }
  })

  return { nodes, edges }
}

// ── Class specs ───────────────────────────────────────────────────────────────

const CLASSES: SkeletonSpec[] = [
  // ── Topo: fantasias de combate ──────────────────────────────────────────────
  {
    id: 'guerreiro',
    name: 'Guerreiro',
    description: 'Combate corpo a corpo, fúria e poder físico bruto.',
    angle: -120,
    primary: 'might',
    secondary: 'fortitude',
    t1L: ability('furia', [{ attribute: 'might', value: 1 }]),
    t1R: ability('vicio-em-sangue', [{ attribute: 'might', value: 1 }]),
    t2L: ability('sede-de-sangue', [
      { attribute: 'might', value: 1 },
      { attribute: 'fortitude', value: 1 },
    ]),
    t2R: ability('elipse-carmesim', [{ attribute: 'might', value: 2 }]),
    utilL: {
      type: 'weaponBonus',
      requiredTags: ['corpo-a-corpo'],
      bonusType: 'damage',
      dice: '1d4',
      value: 0,
    },
    utilR: { type: 'extraDamage', dice: '1d4', flat: undefined, attackTargets: ['melee'] },
    statL: stat('vida', 5),
    statR: stat('resistencia', 3),
    cond: conditional(
      'Colosso de Duas Mãos',
      'Empunhar uma arma de duas mãos transforma cada golpe em devastação.',
      { weaponTagsAnyOf: ['duas-maos'], armorTagsAnyOf: [] },
      [
        { kind: 'extraDamage', flat: 2, attackTargets: ['corpo-a-corpo'] },
        { kind: 'attributeBonus', attribute: 'might', value: 1 },
      ],
    ),
    capstone: ability('furia-descontrolada', [
      { attribute: 'might', value: 2 },
      { attribute: 'fortitude', value: 1 },
    ]),
  },
  {
    id: 'rogue',
    name: 'Rogue',
    description: 'Letalidade precisa, furtividade e golpes fatais.',
    angle: -60,
    primary: 'grace',
    secondary: 'sense',
    t1L: ability('pontos-fatais', [{ attribute: 'grace', value: 1 }]),
    t1R: ability('hemorragia-interna', [{ attribute: 'grace', value: 1 }]),
    t2L: ability('garrote', [
      { attribute: 'grace', value: 1 },
      { attribute: 'sense', value: 1 },
    ]),
    t2R: ability('emboscar', [{ attribute: 'grace', value: 2 }]),
    utilL: {
      type: 'weaponBonus',
      requiredTags: ['adaga', 'rapieira', 'uma-mao'],
      bonusType: 'threatRange',
      value: 1,
    },
    utilR: { type: 'skillBonus', skillId: 'furtividade', skillName: 'Furtividade', value: 5 },
    statL: stat('esquiva', 3),
    statR: stat('pc', 1),
    cond: conditional(
      'Dança das Lâminas',
      'Duas lâminas, um só fluxo de morte.',
      { weaponTagsAnyOf: ['dual-wield'], armorTagsAnyOf: [] },
      [
        { kind: 'extraDamage', dice: '1d4', attackTargets: ['corpo-a-corpo'] },
        { kind: 'attributeBonus', attribute: 'grace', value: 1 },
      ],
    ),
    capstone: ability('marcar-para-a-morte', [
      { attribute: 'grace', value: 2 },
      { attribute: 'sense', value: 1 },
    ]),
  },
  // ── Meio: fantasias abertas ─────────────────────────────────────────────────
  {
    id: 'tank',
    name: 'Tank',
    description: 'Defesa impenetrável, controle e proteção do grupo.',
    angle: 180,
    primary: 'fortitude',
    secondary: 'might',
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
    utilR: { type: 'extraDamage', dice: '1d4', flat: undefined, attackTargets: ['projeteis', 'arcos'] },
    statL: { type: 'skillBonus', skillId: 'pontaria', skillName: 'Pontaria', value: 5 },
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
  // ── Baixo: fantasias mágicas ────────────────────────────────────────────────
  {
    id: 'curandeiro',
    name: 'Curandeiro',
    description: 'Cura, suporte e a luz do Pináculo a favor dos aliados.',
    angle: 120,
    primary: 'wisdom',
    secondary: 'sense',
    t1L: magic('onda-curativa', [{ attribute: 'wisdom', value: 1 }]),
    t1R: { type: 'healing', dice: undefined, flat: 2, element: null },
    t2L: {
      type: 'spellModifier',
      conditionElements: [],
      conditionTypes: ['cura'],
      effectType: 'costReduction',
      value: 4,
    },
    t2R: { type: 'healing', dice: '1d4', flat: undefined, element: null },
    utilL: { type: 'skillBonus', skillId: 'medicina', skillName: 'Medicina', value: 5 },
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
    capstone: conditional(
      'Bênção do Pináculo',
      'Nó Supremo: a cura que flui de você carrega a graça direta do Pináculo.',
      { weaponTagsAnyOf: [], armorTagsAnyOf: [] },
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
    t1L: magic('encharcar', [{ attribute: 'wisdom', value: 1 }]),
    t1R: { type: 'extraDamage', dice: '1d4', flat: undefined, attackTargets: ['magias'] },
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
    capstone: conditional(
      'Domínio Arcano',
      'Nó Supremo: uma vez por descanso longo, conjure uma magia 1 nível acima do permitido.',
      { weaponTagsAnyOf: [], armorTagsAnyOf: [] },
      [
        { kind: 'custom', description: 'Conjura magias 1 nível acima do permitido, uma vez por descanso longo.' },
        { kind: 'attributeBonus', attribute: 'wisdom', value: 2 },
        { kind: 'attributeBonus', attribute: 'sense', value: 1 },
      ],
    ),
  },
]

// ── Build tree ────────────────────────────────────────────────────────────────

function edgeBetween(a: string, b: string): TalentTreeEdge {
  return { id: [a, b].sort().join('--'), from: a, to: b }
}

function buildTree(): TalentTree {
  const nodes: TalentTreeNode[] = []
  const edges: TalentTreeEdge[] = []

  // Nó central de ligação (custo 0) — hub que conecta as 6 seções
  nodes.push({
    id: 'coracao-do-pinaculo',
    x: 0,
    y: 0,
    data: { type: 'link', name: 'Coração' },
  })

  for (const spec of CLASSES) {
    const built = buildClass(spec)
    nodes.push(...built.nodes)
    edges.push(...built.edges)
    // Trilha de atributos termina no hub central
    edges.push(edgeBetween(`${spec.id}-path3`, 'coracao-do-pinaculo'))
  }

  // Nós de ligação entre seções adjacentes (ring) — builds híbridas
  const byAngle = [...CLASSES].sort((a, b) => a.angle - b.angle)
  for (let i = 0; i < byAngle.length; i++) {
    const a = byAngle[i]
    const b = byAngle[(i + 1) % byAngle.length]
    const midAngle = a.angle + 30 // classes são espaçadas a cada 60°
    const { x, y } = pos(midAngle, 1300, 0)
    const linkId = `ligacao-${a.id}-${b.id}`
    nodes.push({ id: linkId, x, y, data: { type: 'link', name: `${a.name}↔${b.name}` } })
    // Conecta o tier-2 de cada vizinho (lado voltado para o outro)
    edges.push(edgeBetween(`${a.id}-t2R`, linkId))
    edges.push(edgeBetween(`${b.id}-t2L`, linkId))
  }

  return {
    id: TREE_ID,
    name: 'Árvore do Pináculo',
    description:
      'Árvore de talento oficial do OverGrown. Seis caminhos de classe — Guerreiro, Rogue, Tank, Arqueiro, Curandeiro e Mago — ligados pelo Coração do Pináculo.',
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

  return errors
}

// ── Summary ───────────────────────────────────────────────────────────────────

function summarize(tree: TalentTree) {
  const byType = new Map<string, number>()
  for (const n of tree.nodes) byType.set(n.data.type, (byType.get(n.data.type) ?? 0) + 1)

  console.log(`Árvore "${tree.name}" v${tree.version}`)
  console.log(`  ${tree.nodes.length} nós · ${tree.edges.length} conexões`)
  for (const [type, count] of [...byType.entries()].sort()) console.log(`  ${type}: ${count}`)

  for (const spec of CLASSES) {
    const classNodes = tree.nodes.filter((n) => n.id.startsWith(`${spec.id}-`))
    const totalCost = classNodes.reduce((sum, n) => {
      if (n.cost != null) return sum + n.cost
      return sum + (n.data.type === 'player' || n.data.type === 'link' ? 0 : 1)
    }, 0)
    console.log(`  ${spec.name}: ${classNodes.length} nós, custo total ${totalCost} pontos`)
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
