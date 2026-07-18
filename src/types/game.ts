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
  requirement?: string
  action?: string
  purpose?: string
  effect?: string
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
  type:
    | 'attributeBonus'
    | 'statBonus'
    | 'skillBonus'
    | 'skillUnlock'
    | 'heal'
    | 'restoreIep'
    | 'custom'
  /** For attributeBonus */
  attribute?: AttributeName
  /** For statBonus: which derived stat to add to */
  stat?: keyof DerivedStats
  /** For skillBonus / skillUnlock: target skill id */
  skillId?: string
  value?: number
  description?: string
}

export interface WeaponDamageRoll {
  count: number
  die: number
}

export interface WeaponAttributeScaling {
  attribute: AttributeName
  multiplier: number
}

export interface WeaponDetails {
  damage: WeaponDamageRoll[]
  scaling: WeaponAttributeScaling[]
  /** Combat skill used by this weapon's basic attack. */
  combatSkill?: 'luta' | 'pontaria' | 'arcanismo'
  critical?: {
    multiplier: number
    rangeMin: number
  }
}

export interface ArmorDetails {
  currentHealth: number
  maxHealth: number
  blockValue?: number
  requirement?: { attribute: AttributeName; value: number }
  slot?: 'primary' | 'underlayer' | 'shield'
  blockBonus?: number
  ruleText?: string
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
  /** Weapon only: detailed damage stats */
  weaponDetails?: WeaponDetails
  /** Armor only: health stats */
  armorDetails?: ArmorDetails
  /** Weapon/armor only: if true, the item is broken and provides no passive bonuses */
  broken?: boolean
  /** Item weight in load units (carga); optional for backward compatibility */
  weight?: number
  /** Weapon only: tags used by talent-tree conditions and bonuses */
  weaponTags?: WeaponTag[]
  /** Armor only: tags used by talent-tree conditions and bonuses */
  armorTags?: ArmorTag[]
}

// ── Weapon Tags ───────────────────────────────────────────────────────────────
// Specific weapon names from 6-armas_e_armaduras.tex plus category tags.
// These tags allow talent tree nodes to target specific weapon types.

export type WeaponTag =
  // ── Melee weapons
  | 'adaga'
  | 'alabarda'
  | 'bo'
  | 'clava'
  | 'escudo'
  | 'espada-duas-maos'
  | 'espada-uma-mao'
  | 'lanca'
  | 'machado-uma-mao'
  | 'machado-duas-maos'
  | 'maca-uma-mao'
  | 'maca-duas-maos'
  | 'martelo-uma-mao'
  | 'martelo-duas-maos'
  | 'rapieira'
  | 'soqueiras'
  | 'tonfa'
  // ── Ranged weapons
  | 'arco-composto'
  | 'arco-leve'
  | 'arco-recurvo'
  | 'besta-leve'
  | 'besta-pesada'
  | 'bola-de-cristal'
  | 'bucaneira'
  | 'cajado'
  | 'espingarda-de-caca'
  | 'grimorio'
  | 'pistola'
  | 'rifle-de-precisao'
  | 'varinha'
  // ── Category tags (can be combined with specific weapon tags)
  | 'corpo-a-corpo'
  | 'distancia'
  | 'magica'
  | 'duas-maos'
  | 'uma-mao'
  | 'dual-wield'
  | 'leve'
  | 'cortante'
  | 'perfurante'
  | 'impacto'
  | 'haste'
  | 'arco'
  | 'besta'
  | 'arma-de-fogo'

export const WEAPON_TAG_LABELS: Record<WeaponTag, string> = {
  // Melee
  adaga: 'Adaga',
  alabarda: 'Alabarda',
  bo: 'Bo',
  clava: 'Clava',
  escudo: 'Escudo (arma)',
  'espada-duas-maos': 'Espada (2 mãos)',
  'espada-uma-mao': 'Espada (1 mão)',
  lanca: 'Lança',
  'machado-uma-mao': 'Machado (1 mão)',
  'machado-duas-maos': 'Machado (2 mãos)',
  'maca-uma-mao': 'Maça (1 mão)',
  'maca-duas-maos': 'Maça (2 mãos)',
  'martelo-uma-mao': 'Martelo (1 mão)',
  'martelo-duas-maos': 'Martelo (2 mãos)',
  rapieira: 'Rapieira',
  soqueiras: 'Soqueiras',
  tonfa: 'Tonfa',
  // Ranged
  'arco-composto': 'Arco Composto',
  'arco-leve': 'Arco Leve',
  'arco-recurvo': 'Arco Recurvo',
  'besta-leve': 'Besta Leve',
  'besta-pesada': 'Besta Pesada',
  'bola-de-cristal': 'Bola de Cristal',
  bucaneira: 'Bucaneira',
  cajado: 'Cajado',
  'espingarda-de-caca': 'Espingarda de Caça',
  grimorio: 'Grimório',
  pistola: 'Pistola',
  'rifle-de-precisao': 'Rifle de Precisão',
  varinha: 'Varinha',
  // Categories
  'corpo-a-corpo': 'Corpo a Corpo',
  distancia: 'Distância',
  magica: 'Mágica',
  'duas-maos': 'Duas Mãos',
  'uma-mao': 'Uma Mão',
  'dual-wield': 'Dual Wield',
  leve: 'Leve',
  cortante: 'Cortante',
  perfurante: 'Perfurante',
  impacto: 'Impacto',
  haste: 'Haste',
  arco: 'Arco',
  besta: 'Besta',
  'arma-de-fogo': 'Arma de Fogo',
}

// Groups for UI display
export const WEAPON_TAGS_MELEE: WeaponTag[] = [
  'adaga',
  'alabarda',
  'bo',
  'clava',
  'escudo',
  'espada-duas-maos',
  'espada-uma-mao',
  'lanca',
  'machado-uma-mao',
  'machado-duas-maos',
  'maca-uma-mao',
  'maca-duas-maos',
  'martelo-uma-mao',
  'martelo-duas-maos',
  'rapieira',
  'soqueiras',
  'tonfa',
]

export const WEAPON_TAGS_RANGED: WeaponTag[] = [
  'arco-composto',
  'arco-leve',
  'arco-recurvo',
  'besta-leve',
  'besta-pesada',
  'bola-de-cristal',
  'bucaneira',
  'cajado',
  'espingarda-de-caca',
  'grimorio',
  'pistola',
  'rifle-de-precisao',
  'varinha',
]

export const WEAPON_TAGS_CATEGORY: WeaponTag[] = [
  'corpo-a-corpo',
  'distancia',
  'magica',
  'duas-maos',
  'uma-mao',
  'dual-wield',
  'leve',
  'cortante',
  'perfurante',
  'impacto',
  'haste',
  'arco',
  'besta',
  'arma-de-fogo',
]

// ── Armor Tags ────────────────────────────────────────────────────────────────

export type ArmorTag =
  | 'vestes-de-pano'
  | 'gambeson'
  | 'armadura-de-couro'
  | 'cota-de-malha'
  | 'couraca-de-metal'
  | 'armadura-de-placas'
  | 'escudo-item'
  | 'leve'
  | 'media'
  | 'pesada'

export const ARMOR_TAG_LABELS: Record<ArmorTag, string> = {
  'vestes-de-pano': 'Vestes de Pano',
  gambeson: 'Gambeson',
  'armadura-de-couro': 'Armadura de Couro',
  'cota-de-malha': 'Cota de Malha',
  'couraca-de-metal': 'Couraça de Metal',
  'armadura-de-placas': 'Armadura de Placas',
  'escudo-item': 'Escudo (proteção)',
  leve: 'Leve',
  media: 'Média',
  pesada: 'Pesada',
}

export const ARMOR_TAGS_SPECIFIC: ArmorTag[] = [
  'vestes-de-pano',
  'gambeson',
  'armadura-de-couro',
  'cota-de-malha',
  'couraca-de-metal',
  'armadura-de-placas',
  'escudo-item',
]

export const ARMOR_TAGS_CATEGORY: ArmorTag[] = ['leve', 'media', 'pesada']

// ── Character ─────────────────────────────────────────────────────────────────
// Attributes, spells, and attacks all come from the talent tree.
// The character sheet only tracks what the player controls directly.

export interface Character {
  id: string
  name: string
  race: string
  origin?: string
  divinity: number
  avatarBase64?: string
  avatarPosition?: string
  avatarScale?: number
  /** ID of the talent tree this character is connected to */
  connectedTreeId?: string
  /** IDs of talent tree nodes this character has acquired */
  acquiredNodeIds: string[]
  /** Per-node player configuration (e.g. chosen attribute for flexible attribute nodes) */
  nodeConfigs: Record<string, { attribute?: AttributeName }>
  /** Perícia mastery levels – controlled by the player */
  skills: Record<string, MasteryLevel>
  /** Inventory with weapon/armor tag support */
  inventory: InventoryItem[]
  notes?: string
  money: {
    platina: number
    ouro: number
    prata: number
    bronze: number
  }
  /** Current (in-play) resource values */
  currentResources: {
    vida: number
    iep: number
    pc: number
  }
}
