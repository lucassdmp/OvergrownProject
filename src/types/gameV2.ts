// ─────────────────────────────────────────────────────────────────────────────
// OverGrown V2 – Extended Game Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

import type { InventoryItem, MasteryLevel } from './game'

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
  | 'arco'
  | 'besta'
  | 'arma-de-fogo'

export const WEAPON_TAG_LABELS: Record<WeaponTag, string> = {
  // Melee
  adaga:             'Adaga',
  alabarda:          'Alabarda',
  bo:                'Bo',
  clava:             'Clava',
  escudo:            'Escudo (arma)',
  'espada-duas-maos': 'Espada (2 mãos)',
  'espada-uma-mao':   'Espada (1 mão)',
  lanca:             'Lança',
  'machado-uma-mao':  'Machado (1 mão)',
  'machado-duas-maos':'Machado (2 mãos)',
  'maca-uma-mao':     'Maça (1 mão)',
  'maca-duas-maos':   'Maça (2 mãos)',
  'martelo-uma-mao':  'Martelo (1 mão)',
  'martelo-duas-maos':'Martelo (2 mãos)',
  rapieira:          'Rapieira',
  soqueiras:         'Soqueiras',
  tonfa:             'Tonfa',
  // Ranged
  'arco-composto':   'Arco Composto',
  'arco-leve':       'Arco Leve',
  'arco-recurvo':    'Arco Recurvo',
  'besta-leve':      'Besta Leve',
  'besta-pesada':    'Besta Pesada',
  'bola-de-cristal': 'Bola de Cristal',
  bucaneira:         'Bucaneira',
  cajado:            'Cajado',
  'espingarda-de-caca': 'Espingarda de Caça',
  grimorio:          'Grimório',
  pistola:           'Pistola',
  'rifle-de-precisao': 'Rifle de Precisão',
  varinha:           'Varinha',
  // Categories
  'corpo-a-corpo':   'Corpo a Corpo',
  distancia:         'Distância',
  magica:            'Mágica',
  'duas-maos':       'Duas Mãos',
  'uma-mao':         'Uma Mão',
  'dual-wield':      'Dual Wield',
  arco:              'Arco',
  besta:             'Besta',
  'arma-de-fogo':    'Arma de Fogo',
}

// Groups for UI display
export const WEAPON_TAGS_MELEE: WeaponTag[] = [
  'adaga', 'alabarda', 'bo', 'clava', 'escudo',
  'espada-duas-maos', 'espada-uma-mao', 'lanca',
  'machado-uma-mao', 'machado-duas-maos',
  'maca-uma-mao', 'maca-duas-maos',
  'martelo-uma-mao', 'martelo-duas-maos',
  'rapieira', 'soqueiras', 'tonfa',
]

export const WEAPON_TAGS_RANGED: WeaponTag[] = [
  'arco-composto', 'arco-leve', 'arco-recurvo',
  'besta-leve', 'besta-pesada',
  'bola-de-cristal', 'bucaneira', 'cajado',
  'espingarda-de-caca', 'grimorio',
  'pistola', 'rifle-de-precisao', 'varinha',
]

export const WEAPON_TAGS_CATEGORY: WeaponTag[] = [
  'corpo-a-corpo', 'distancia', 'magica',
  'duas-maos', 'uma-mao', 'dual-wield',
  'arco', 'besta', 'arma-de-fogo',
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
  'vestes-de-pano':     'Vestes de Pano',
  gambeson:             'Gambeson',
  'armadura-de-couro':  'Armadura de Couro',
  'cota-de-malha':      'Cota de Malha',
  'couraca-de-metal':   'Couraça de Metal',
  'armadura-de-placas': 'Armadura de Placas',
  'escudo-item':        'Escudo (proteção)',
  leve:                 'Leve',
  media:                'Média',
  pesada:               'Pesada',
}

export const ARMOR_TAGS_SPECIFIC: ArmorTag[] = [
  'vestes-de-pano', 'gambeson', 'armadura-de-couro',
  'cota-de-malha', 'couraca-de-metal', 'armadura-de-placas', 'escudo-item',
]

export const ARMOR_TAGS_CATEGORY: ArmorTag[] = ['leve', 'media', 'pesada']

// ── V2 Inventory Item (extends base with weapon/armor tags) ───────────────────

export interface InventoryItemV2 extends InventoryItem {
  weaponTags?: WeaponTag[]
  armorTags?: ArmorTag[]
}

// ── V2 Character ──────────────────────────────────────────────────────────────
// In V2, attributes, spells, and attacks all come from the talent tree.
// The character sheet only tracks what the player controls directly.

export interface CharacterV2 {
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
  /** Perícia mastery levels – controlled by the player */
  skills: Record<string, MasteryLevel>
  /** Inventory with V2 weapon/armor tag support */
  inventory: InventoryItemV2[]
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
