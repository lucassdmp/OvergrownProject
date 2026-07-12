// ─────────────────────────────────────────────────────────────────────────────
// OverGrown – Talent Tree Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

import type { AttributeName, DerivedStats, ElementId, MagicTypeId, SpellLevel, SpellLevelEntry } from './game'
import type { WeaponTag } from './gameV2'

// ── Node type discriminator ───────────────────────────────────────────────────

export type TalentNodeType =
  | 'player'
  | 'attribute'
  | 'magic'
  | 'stat'
  | 'combatAbility'
  | 'extraDamage'
  | 'healing'
  // ── V2 node types
  | 'weaponBonus'
  | 'spellModifier'
  | 'defenseBonus'
  | 'skillBonus'

// ── Attack targets for damage-bonus nodes ─────────────────────────────────────

export type BaseAttackTarget =
  | 'magias'
  | 'projeteis'
  | 'corpo-a-corpo'
  | 'melee'
  | 'armas-cortantes'
  | 'armas-perfurantes'
  | 'armas-contundentes'
  | 'arcos'

/** A damage-bonus attack target: physical category, magic type, or element */
export type AttackTarget = BaseAttackTarget | MagicTypeId | ElementId

export const BASE_ATTACK_TARGETS: BaseAttackTarget[] = [
  'magias', 'projeteis', 'corpo-a-corpo', 'melee',
  'armas-cortantes', 'armas-perfurantes', 'armas-contundentes', 'arcos',
]

export const BASE_ATTACK_TARGET_LABELS: Record<BaseAttackTarget, string> = {
  'magias':             'Mágias',
  'projeteis':          'Projéteis',
  'corpo-a-corpo':      'Corpo a Corpo',
  'melee':              'Melee',
  'armas-cortantes':    'Armas Cortantes',
  'armas-perfurantes':  'Armas Perfurantes',
  'armas-contundentes': 'Armas Contundentes',
  'arcos':              'Arcos',
}

// ── Per-type data shapes ──────────────────────────────────────────────────────

/** Root/start node – represents the player character origin */
export interface PlayerNodeData {
  type: 'player'
  name: string
  description: string
}

export interface AttributeNodeData {
  type: 'attribute'
  /**
   * null = the player chooses which attribute when acquiring this node in-game.
   * By default nodes are created with null (empty attribute).
   */
  attribute: AttributeName | null
  value: number
}

export interface MagicNodeData {
  type: 'magic'
  name: string
  elements: ElementId[]
  magicTypes: MagicTypeId[]
  description: string
  category: string
  notes?: string
  /** Full per-level stats table, entries for levels 0 – 9 and "divino" */
  levels: SpellLevelEntry[]
  /** Extra attribute bonuses the node also grants */
  attributeBonuses: Array<{ attribute: AttributeName; value: number }>
  /** Extra stat bonuses the node also grants */
  statBonuses: Array<{ stat: keyof DerivedStats; value: number }>
}

export interface StatNodeData {
  type: 'stat'
  stat: keyof DerivedStats
  value: number
}

export interface CombatAbilityNodeData {
  type: 'combatAbility'
  skillId: string
  skillName: string
  skillDescription: string
  skillCost: string
}

export interface ExtraDamageNodeData {
  type: 'extraDamage'
  /** Dice expression, e.g. "1d6", "2d8" – optional if only flat */
  dice?: string
  /** Flat damage value – optional if only dice */
  flat?: number
  /** Which attacks this applies to (multi-select) */
  attackTargets: AttackTarget[]
}

export interface HealingNodeData {
  type: 'healing'
  /** Dice expression added to healing rolls, e.g. "1d6" */
  dice?: string
  /** Flat bonus added to healing */
  flat?: number
  /** null = all healing (general); ElementId = only healing of that element */
  element: ElementId | null
}

// ── V2 Node data shapes ───────────────────────────────────────────────────────

export type WeaponBonusType = 'damage' | 'threatRange' | 'critMultiplier' | 'hitBonus'

export const WEAPON_BONUS_TYPE_LABELS: Record<WeaponBonusType, string> = {
  damage:         'Dano Extra',
  threatRange:    'Margem de Ameaça (-)',
  critMultiplier: 'Multiplicador de Crítico (+)',
  hitBonus:       'Bônus de Acerto (+)',
}

/** Passive bonus applied when an equipped weapon has the required tags */
export interface WeaponBonusNodeData {
  type: 'weaponBonus'
  /** Weapon must have AT LEAST ONE of these tags to benefit */
  requiredTags: WeaponTag[]
  bonusType: WeaponBonusType
  /** Dice expression for bonus damage (e.g. "1d6") */
  dice?: string
  /** Flat numeric bonus (damage, threat range reduction, crit multiplier, or hit) */
  value: number
}

export type SpellModifierEffectType =
  | 'costReduction'
  | 'extraProjectile'
  | 'duration'
  | 'damageBonus'

export const SPELL_MODIFIER_EFFECT_LABELS: Record<SpellModifierEffectType, string> = {
  costReduction:   'Redução de Custo (IEP)',
  extraProjectile: 'Projétil Extra (+)',
  duration:        'Duração Extra (rodadas)',
  damageBonus:     'Dano Extra',
}

/** Passive modifier applied when a cast spell matches the condition tags */
export interface SpellModifierNodeData {
  type: 'spellModifier'
  /** Spell must match AT LEAST ONE element (empty = applies to all elements) */
  conditionElements: ElementId[]
  /** Spell must match AT LEAST ONE type (empty = applies to all types) */
  conditionTypes: MagicTypeId[]
  effectType: SpellModifierEffectType
  value: number
  /** Optional dice expression for damageBonus effect */
  dice?: string
}

export type DefenseDamageType = 'physical' | 'all' | ElementId

/** Passive damage reduction when character receives damage of the specified type */
export interface DefenseBonusNodeData {
  type: 'defenseBonus'
  /** What kind of incoming damage this reduces */
  damageType: DefenseDamageType
  /** Amount of damage reduction (positive number) */
  value: number
}

/** Passive bonus to a specific perícia check */
export interface SkillBonusNodeData {
  type: 'skillBonus'
  skillId: string
  skillName: string
  value: number
}

export type TalentNodeData =
  | PlayerNodeData
  | AttributeNodeData
  | MagicNodeData
  | StatNodeData
  | CombatAbilityNodeData
  | ExtraDamageNodeData
  | HealingNodeData
  | WeaponBonusNodeData
  | SpellModifierNodeData
  | DefenseBonusNodeData
  | SkillBonusNodeData

// ── Node shape colors (CSS hex) ───────────────────────────────────────────────

export const NODE_TYPE_COLORS: Record<TalentNodeType, { fill: string; stroke: string; text: string }> = {
  player:        { fill: '#f0f9ff', stroke: '#0284c7', text: '#0c4a6e' },
  attribute:     { fill: '#fef3c7', stroke: '#d97706', text: '#92400e' },
  magic:         { fill: '#ede9fe', stroke: '#7c3aed', text: '#4c1d95' },
  stat:          { fill: '#d1fae5', stroke: '#059669', text: '#064e3b' },
  combatAbility: { fill: '#ffe4e6', stroke: '#e11d48', text: '#881337' },
  extraDamage:   { fill: '#ffedd5', stroke: '#ea580c', text: '#7c2d12' },
  healing:       { fill: '#dcfce7', stroke: '#16a34a', text: '#14532d' },
  // V2 node types
  weaponBonus:   { fill: '#fdf2f8', stroke: '#9d174d', text: '#701a75' },
  spellModifier: { fill: '#f5f3ff', stroke: '#6d28d9', text: '#3b0764' },
  defenseBonus:  { fill: '#f0fdf4', stroke: '#166534', text: '#14532d' },
  skillBonus:    { fill: '#fff7ed', stroke: '#c2410c', text: '#7c2d12' },
}

export const NODE_TYPE_LABELS: Record<TalentNodeType, string> = {
  player:        'Jogador',
  attribute:     'Atributo',
  magic:         'Magia',
  stat:          'Stat',
  combatAbility: 'Habilidade de Combate',
  extraDamage:   'Dano Extra',
  healing:       'Cura',
  // V2 node types
  weaponBonus:   'Bônus de Arma',
  spellModifier: 'Modificador de Magia',
  defenseBonus:  'Bônus de Defesa',
  skillBonus:    'Bônus de Perícia',
}

// ── Tree primitives ───────────────────────────────────────────────────────────

export interface TalentTreeNode {
  id: string
  x: number
  y: number
  data: TalentNodeData
}

export interface TalentTreeEdge {
  id: string
  from: string
  to: string
}

// ── Full tree ─────────────────────────────────────────────────────────────────

export interface TalentTree {
  id: string
  name: string
  description: string
  nodes: TalentTreeNode[]
  edges: TalentTreeEdge[]
}

// ── Default data factories ────────────────────────────────────────────────────

const ALL_SPELL_LEVELS: SpellLevel[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'divino']

function emptySpellLevels(): SpellLevelEntry[] {
  return ALL_SPELL_LEVELS.map((level) => ({ level, cost: '', scaling: '', special: null }))
}

export function defaultNodeData(type: TalentNodeType): TalentNodeData {
  switch (type) {
    case 'player':
      return { type: 'player', name: 'Jogador', description: '' }
    case 'attribute':
      return { type: 'attribute', attribute: null, value: 1 }
    case 'magic':
      return {
        type: 'magic',
        name: 'Nova Magia',
        elements: [],
        magicTypes: [],
        description: '',
        category: '',
        notes: undefined,
        levels: emptySpellLevels(),
        attributeBonuses: [],
        statBonuses: [],
      }
    case 'stat':
      return { type: 'stat', stat: 'vida', value: 5 }
    case 'combatAbility':
      return { type: 'combatAbility', skillId: '', skillName: '', skillDescription: '', skillCost: '' }
    case 'extraDamage':
      return { type: 'extraDamage', dice: '1d6', flat: undefined, attackTargets: [] }
    case 'healing':
      return { type: 'healing', dice: undefined, flat: undefined, element: null }
    case 'weaponBonus':
      return { type: 'weaponBonus', requiredTags: [], bonusType: 'damage', value: 5 }
    case 'spellModifier':
      return { type: 'spellModifier', conditionElements: [], conditionTypes: [], effectType: 'costReduction', value: 10 }
    case 'defenseBonus':
      return { type: 'defenseBonus', damageType: 'physical', value: 5 }
    case 'skillBonus':
      return { type: 'skillBonus', skillId: '', skillName: '', value: 5 }
  }
}

export function nodeTooltip(data: TalentNodeData): string {
  switch (data.type) {
    case 'player':
      return `★ ${data.name || 'Jogador'}\n${data.description || ''}`
    case 'attribute': {
      const labels: Record<AttributeName, string> = {
        might: 'Might', grace: 'Grace', wisdom: 'Wisdom', sense: 'Sense', fortitude: 'Fortitude',
      }
      const attrLabel = data.attribute ? labels[data.attribute] : '(jogador escolhe)'
      return `+${data.value} ${attrLabel}`
    }
    case 'magic': {
      const elems = data.elements.join(', ') || '—'
      const firstLevel = data.levels.find((l) => l.cost || l.scaling)
      const lines = [
        `✦ ${data.name}`,
        `Elementos: ${elems}`,
        firstLevel?.cost ? `Custo: ${firstLevel.cost}` : null,
        firstLevel?.scaling ? `Escalonamento: ${firstLevel.scaling}` : null,
        data.description || null,
        ...data.attributeBonuses.map((b) => `+${b.value} ${b.attribute}`),
        ...data.statBonuses.map((b) => `+${b.value} ${b.stat}`),
      ].filter(Boolean)
      return lines.join('\n')
    }
    case 'stat': {
      const labels: Record<keyof DerivedStats, string> = {
        vida: 'Vida', iep: 'IEP', pc: 'PC', resistencia: 'Resistência', esquiva: 'Esquiva',
      }
      return `+${data.value} ${labels[data.stat]}`
    }
    case 'combatAbility':
      return data.skillName
        ? `⚔ ${data.skillName}\nCusto: ${data.skillCost}\n${data.skillDescription}`
        : 'Habilidade de Combate (não configurada)'
    case 'extraDamage': {
      const parts: string[] = []
      if (data.dice) parts.push(data.dice)
      if (data.flat) parts.push(`+${data.flat}`)
      const targets = data.attackTargets.length > 0 ? data.attackTargets.join(', ') : 'nenhum'
      return `Dano Extra: ${parts.join(' ') || '—'}\nAtaques: ${targets}`
    }
    case 'healing': {
      const parts: string[] = []
      if (data.dice) parts.push(data.dice)
      if (data.flat) parts.push(`+${data.flat}`)
      const scope = data.element ? `Cura (${data.element})` : 'Cura Geral'
      return `${scope}: ${parts.join(' ') || '—'}`
    }
    case 'weaponBonus': {
      const tags = data.requiredTags.length > 0 ? data.requiredTags.join(', ') : 'qualquer arma'
      const diceStr = data.dice ? `${data.dice}+` : ''
      return `⚔ ${WEAPON_BONUS_TYPE_LABELS[data.bonusType]}: ${diceStr}${data.value}\nArmas: ${tags}`
    }
    case 'spellModifier': {
      const elems = data.conditionElements.length > 0 ? data.conditionElements.join(', ') : 'todos elementos'
      const types = data.conditionTypes.length > 0 ? data.conditionTypes.join(', ') : 'todos tipos'
      const effectLabel = SPELL_MODIFIER_EFFECT_LABELS[data.effectType]
      const diceStr = data.dice ? `${data.dice}+` : ''
      return `✦ ${effectLabel}: ${diceStr}${data.value}\nElementos: ${elems}\nTipos: ${types}`
    }
    case 'defenseBonus':
      return `🛡 Redução de Dano: ${data.value}\nTipo: ${data.damageType}`
    case 'skillBonus':
      return `📚 +${data.value} ${data.skillName || data.skillId}`
  }
}
