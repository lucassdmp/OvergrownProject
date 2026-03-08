// ─────────────────────────────────────────────────────────────────────────────
// OverGrown – Core Game Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

// ── Attributes ────────────────────────────────────────────────────────────────

export type AttributeName = 'might' | 'grace' | 'wisdom' | 'sense' | 'fortitude'

export const ATTRIBUTE_LABELS: Record<AttributeName, string> = {
  might: 'Might',
  grace: 'Grace',
  wisdom: 'Wisdom',
  sense: 'Sense',
  fortitude: 'Fortitude',
}

export interface Attributes {
  might: number
  grace: number
  wisdom: number
  sense: number
  fortitude: number
}

// ── Primary Resources ──────────────────────────────────────────────────────────

export type PrimaryResourceName = 'iep' | 'pc' | 'vida'

export const PRIMARY_RESOURCE_LABELS: Record<PrimaryResourceName, string> = {
  iep: 'IEP',
  pc: 'Pontos de Combate',
  vida: 'Vida',
}

// ── Secondary Resources ────────────────────────────────────────────────────────

export type SecondaryResourceName = 'resistencia' | 'esquiva'

export const SECONDARY_RESOURCE_LABELS: Record<SecondaryResourceName, string> = {
  resistencia: 'Resistência',
  esquiva: 'Esquiva',
}

export type ResourceName = PrimaryResourceName | SecondaryResourceName

// ── Derived Stats (calculated values) ─────────────────────────────────────────

export interface DerivedStats {
  iep: number
  pc: number
  vida: number
  resistencia: number
  esquiva: number
}

// ── Elements ──────────────────────────────────────────────────────────────────

/** Core element IDs – extend this union as the system grows */
export type ElementId =
  | 'agua'
  | 'ar'
  | 'espacial'
  | 'fogo'
  | 'luz'
  | 'mental'
  | 'natureza'
  | 'pedra'
  | 'raio'
  | 'sombras'
  | 'tempo'
  | (string & {}) // allow future string ids without breaking exhaustive checks

export interface Element {
  id: ElementId
  label: string
  /** Tailwind-compatible color class or hex string for tag rendering */
  color: string
  /** Text color for contrast on the element background */
  textColor: string
}

// ── Magic Types ───────────────────────────────────────────────────────────────

/** Core magic type IDs – extend freely */
export type MagicTypeId =
  | 'aoe'
  | 'projetil'
  | 'debuff'
  | 'cura'
  | 'single'
  | 'buff'
  | 'invocacao'
  | 'transformacao'
  | (string & {})

export interface MagicType {
  id: MagicTypeId
  label: string
  color: string
  textColor: string
}

// ── Spell Levels ──────────────────────────────────────────────────────────────

export type SpellLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 'divino'

export const SPELL_LEVEL_LABELS: Record<SpellLevel, string> = {
  0: '0',
  1: '1',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  divino: 'Div',
}

export interface SpellLevelEntry {
  level: SpellLevel
  /** Resource cost, e.g. "6 IEP" */
  cost: string
  /** Primary scaling value, e.g. "2D8 + WIS" or "1m Raio" */
  scaling: string
  /** Name of the special ability unlocked at this level, or null */
  special: string | null
}

// ── Spell ─────────────────────────────────────────────────────────────────────

export interface Spell {
  id: string
  name: string
  /** One or more elements (e.g. Água + Ar for Estalactite) */
  elements: ElementId[]
  /** Minimum character level required to learn this spell */
  minLevel: SpellLevel
  description: string
  /** Table of per-level stats */
  levels: SpellLevelEntry[]
  /** Map of special-ability-name → full description text */
  specialDescriptions: Record<string, string>
  /** Category label shown on the card header, e.g. "Alcance", "Ataque", "Cura" */
  category: string
  /** Magic type tags */
  types: MagicTypeId[]
  /** Free-form scaling summary */
  notes?: string
}

// ── Combat Skills ─────────────────────────────────────────────────────────────

export type CombatCategory = 'melee' | 'ranged' | 'effort'

export const COMBAT_CATEGORY_LABELS: Record<CombatCategory, string> = {
  melee: 'Corpo a Corpo',
  ranged: 'Distância',
  effort: 'Mecânicas de Esforço',
}

export interface CombatSkill {
  id: string
  name: string
  /** PC cost as a display string, e.g. "2", "3 / 5", "X (máx. 10)", "1 por rodada" */
  cost: string
  description: string
  category: CombatCategory
}

// ── Talent Tree ───────────────────────────────────────────────────────────────

export type TalentNodeEffect =
  | { type: 'attributeBonus'; attribute: AttributeName; value: number }
  | { type: 'resourceBonus'; resource: ResourceName; value: number }
  | { type: 'unlockSkill'; skillId: string }
  | { type: 'upgradeSkill'; skillId: string; upgradeKey: string }
  | { type: 'custom'; description: string }

export interface TalentNode {
  id: string
  name: string
  description: string
  /** IDs of nodes that must be acquired first */
  requires: string[]
  /** Talent point cost to acquire */
  cost: number
  effects: TalentNodeEffect[]
  /** Layout position for tree canvas rendering */
  position: { x: number; y: number }
  tier: number
}

export interface TalentTree {
  id: string
  name: string
  description: string
  nodes: TalentNode[]
}

// ── Custom Spell (manually added to character sheet) ─────────────────────────

export interface CustomSpell {
  id: string
  name: string
  elements: ElementId[]
  description: string
  levels: SpellLevelEntry[]
  specialDescriptions: Record<string, string>
  category: string
  types: MagicTypeId[]
  notes?: string
}

// ── Character Attack (manually added; single-level, consumes PC) ──────────────

export interface CharacterAttack {
  id: string
  name: string
  /** PC cost display string */
  cost: string
  description: string
  damage?: string
  category: CombatCategory
}

// ── Perícias (Skills) ────────────────────────────────────────────────────────

/** 0 = untrained; 1-4 = Maestria I–IV */
export type MasteryLevel = 0 | 1 | 2 | 3 | 4

export const MASTERY_LABELS: Record<MasteryLevel, string> = {
  0: '—',
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
}

export const MASTERY_BONUS: Record<MasteryLevel, number> = {
  0: 0,
  1: 5,
  2: 10,
  3: 15,
  4: 20,
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export type ItemType = 'weapon' | 'armor' | 'potion-vida' | 'potion-iep' | 'misc'

export interface ItemEffect {
  type: 'attributeBonus' | 'statBonus' | 'skillBonus' | 'skillUnlock' | 'heal' | 'restoreIep' | 'custom'
  /** For attributeBonus */
  attribute?: AttributeName
  /** For statBonus: which derived stat to add to */
  stat?: keyof DerivedStats
  /** For skillBonus / skillUnlock: target skill id */
  skillId?: string
  value?: number
  description?: string
}

export interface InventoryItem {
  id: string
  name: string
  description: string
  quantity: number
  type: ItemType
  effects: ItemEffect[]
  /** Only relevant for weapon/armor – whether it is currently equipped */
  equipped?: boolean
  /** Weapon only: critical threat range, e.g. "19-20" or "18-20" */
  threat?: string
  /** Weapon/armor only: if true, the item is broken and provides no passive bonuses */
  broken?: boolean
  /** Item weight in load units (carga); optional for backward compatibility */
  weight?: number
}

// ── Character ─────────────────────────────────────────────────────────────────

export interface Character {
  id: string
  name: string
  playerName: string
  race: string
  level: number
  /** Each point of divinity grants 5 attribute points (base = 10) */
  divinity: number
  attributes: Attributes
  /** IDs of acquired talent nodes */
  acquiredTalents: string[]
  /** Manually added spells */
  customSpells: CustomSpell[]
  /** Manually added attacks / combat skills */
  characterAttacks: CharacterAttack[]
  /** Inventory items */
  inventory: InventoryItem[]
  /** Skill mastery levels – key = skill id, value = MasteryLevel (0 = untrained) */
  skills: Record<string, MasteryLevel>
  /** Selected origin id – grants 1 free skill at Mastery I */
  origin?: string
  /** Current resource values (can be below max during play) */
  currentResources: {
    vida: number
    iep: number
    pc: number
  }
}
