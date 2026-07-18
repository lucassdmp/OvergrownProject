import armorBookRaw from '../../Livro/Contents/6-armas_e_armaduras.tex?raw'
import type {
  AttributeName,
  InventoryItem,
  WeaponAttributeScaling,
  WeaponDamageRoll,
  WeaponTag,
} from '../types/game'

export type EquipmentPreset = Omit<InventoryItem, 'id' | 'quantity' | 'equipped' | 'broken'>

function stripLatex(value: string) {
  return value
    .replace(/\\link\{[^}]*\}\{([^}]*)\}/g, '$1')
    .replace(/\\textbf\{([^}]*)\}/g, '$1')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\\times/g, '×')
    .replace(/\\-/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

const ATTRIBUTE_BY_CODE: Record<string, AttributeName> = {
  MIG: 'might',
  GRA: 'grace',
  WIS: 'wisdom',
  SEN: 'sense',
  FOR: 'fortitude',
}

function parseDamage(value: string): {
  damage: WeaponDamageRoll[]
  scaling: WeaponAttributeScaling[]
} {
  const damage = [...value.matchAll(/(\d+)D(\d+)/gi)].map((match) => ({
    count: Number(match[1]),
    die: Number(match[2]),
  }))
  const scaling = [...value.matchAll(/MOD de (MIG|GRA|WIS|SEN|FOR)/gi)]
    .map((match) => ATTRIBUTE_BY_CODE[match[1].toUpperCase()])
    .filter(Boolean)
    .map((attribute) => ({ attribute, multiplier: 1 }))
  return { damage, scaling }
}

const SPECIFIC_WEAPON_TAG: Record<string, WeaponTag> = {
  Adaga: 'adaga',
  Alabarda: 'alabarda',
  Bo: 'bo',
  Clava: 'clava',
  Escudo: 'escudo',
  'Espada de Duas Mãos': 'espada-duas-maos',
  'Espada de Uma Mão': 'espada-uma-mao',
  Lança: 'lanca',
  'Machado de Uma Mão': 'machado-uma-mao',
  'Machado de Duas Mãos': 'machado-duas-maos',
  'Maça de Uma Mão': 'maca-uma-mao',
  'Maça de Duas Mãos': 'maca-duas-maos',
  'Martelo de Uma Mão': 'martelo-uma-mao',
  'Martelo de Duas Mãos': 'martelo-duas-maos',
  Rapieira: 'rapieira',
  Soqueiras: 'soqueiras',
  Tonfa: 'tonfa',
  'Arco Composto': 'arco-composto',
  'Arco Leve': 'arco-leve',
  'Arco Recurvo': 'arco-recurvo',
  'Besta Leve': 'besta-leve',
  'Besta Pesada': 'besta-pesada',
  'Bola de Cristal': 'bola-de-cristal',
  Bucaneira: 'bucaneira',
  Cajado: 'cajado',
  'Espingarda de Caça': 'espingarda-de-caca',
  Grimório: 'grimorio',
  Pistola: 'pistola',
  'Rifle de Precisão': 'rifle-de-precisao',
  Varinha: 'varinha',
}

function inferWeaponTags(name: string, isRanged: boolean): WeaponTag[] {
  const tags = new Set<WeaponTag>()
  const specific = SPECIFIC_WEAPON_TAG[name]
  if (specific) tags.add(specific)
  tags.add(isRanged ? 'distancia' : 'corpo-a-corpo')
  if (/Gême[ao]s/i.test(name)) tags.add('dual-wield')
  if (/Duas Mãos/i.test(name)) tags.add('duas-maos')
  if (/Uma Mão|Adaga|Clava|Escudo|Rapieira|Soqueiras|Tonfa|Pistola|Varinha/i.test(name))
    tags.add('uma-mao')
  if (/Adaga|Rapieira|Soqueiras|Tonfa|Arco Leve|Besta Leve/i.test(name)) tags.add('leve')
  if (/Adaga|Alabarda|Espada|Machado/i.test(name)) tags.add('cortante')
  if (/Adaga|Alabarda|Lança|Rapieira|Arco|Besta|Bucaneira|Espingarda|Pistola|Rifle/i.test(name))
    tags.add('perfurante')
  if (/Bo|Clava|Escudo|Maça|Martelo|Soqueiras|Tonfa/i.test(name)) tags.add('impacto')
  if (/Alabarda|Lança|Bo|Cajado/i.test(name)) tags.add('haste')
  if (/Arco/i.test(name)) tags.add('arco')
  if (/Besta/i.test(name)) tags.add('besta')
  if (/Bucaneira|Espingarda|Pistola|Rifle/i.test(name)) tags.add('arma-de-fogo')
  if (/Bola de Cristal|Cajado|Grimório|Varinha/i.test(name)) tags.add('magica')
  // Cajado é explicitamente utilizável em corpo a corpo no livro.
  if (name === 'Cajado') tags.add('corpo-a-corpo')
  return [...tags]
}

function parseWeapons(): EquipmentPreset[] {
  const section = armorBookRaw.split('\\titlesection{Armaduras e Proteções}')[0]
  const rangedStart = section.indexOf('\\titlesection{Armas de Longo Alcance}')
  const dualStart = section.indexOf('\\titlesection{Configurações de Empunhadura Dupla}')
  const rows: EquipmentPreset[] = []
  const rowPattern =
    /^\s*([^%\\][^&\n]+?)\s*&\s*(\d+)\s*&\s*(\d+)\s*&\s*([^&\n]+?)\s*&\s*([^&\n]+?)\s*&\s*(.*?)\s*\\\\/gm
  for (const match of section.matchAll(rowPattern)) {
    const name = stripLatex(match[1])
    if (!name || name.includes('Nome')) continue
    const threat = Number(match[2])
    const weight = Number(match[3])
    const damageText = stripLatex(match[4])
    const requirement = stripLatex(match[5])
    const property = stripLatex(match[6])
    const parsedDamage = parseDamage(damageText)
    const rowPosition = match.index ?? 0
    const isRangedSection =
      rangedStart >= 0 && rowPosition >= rangedStart && (dualStart < 0 || rowPosition < dualStart)
    const isRangedDual = /Bestas|Pistolas/i.test(name)
    const combatSkill = parsedDamage.scaling.some((scaling) => scaling.attribute === 'wisdom')
      ? 'arcanismo'
      : isRangedSection || isRangedDual
        ? 'pontaria'
        : 'luta'
    const blockBonus =
      name === 'Escudo' ? 5 : ['Espada de Duas Mãos', 'Martelo de Duas Mãos'].includes(name) ? 3 : 0
    rows.push({
      name,
      description: `${damageText}. Requisito: ${requirement}. ${property}`,
      type: 'weapon',
      effects: [],
      weight,
      threat: String(threat),
      weaponDetails: {
        ...parsedDamage,
        combatSkill,
        critical: { rangeMin: threat, multiplier: 2 },
      },
      weaponTags: inferWeaponTags(name, isRangedSection || isRangedDual),
      armorDetails:
        blockBonus > 0 || name === 'Escudo'
          ? {
              currentHealth: 0,
              maxHealth: 0,
              blockBonus,
              slot: name === 'Escudo' ? 'shield' : undefined,
              ruleText: property,
            }
          : undefined,
    })
  }
  return rows
}

const ARMORS: EquipmentPreset[] = [
  {
    name: 'Vestes de Pano',
    description:
      'VB 0. Condutor Rúnico: +1 Espaço de Melhoria Rúnica. Sem limite de Esquiva ou penalidade de ruído.',
    type: 'armor',
    effects: [],
    weight: 2,
    armorTags: ['vestes-de-pano', 'leve'],
    armorDetails: {
      currentHealth: 0,
      maxHealth: 0,
      blockValue: 0,
      slot: 'primary',
      ruleText: 'Sem requisito.',
    },
  },
  {
    name: 'Gambeson',
    description:
      'VB 3. Amortecida: reduz o dano de Concussão em 1D4. Pode ser usado sob armaduras pesadas.',
    type: 'armor',
    effects: [],
    weight: 2,
    armorTags: ['gambeson', 'leve'],
    armorDetails: {
      currentHealth: 0,
      maxHealth: 0,
      blockValue: 3,
      slot: 'underlayer',
      ruleText: 'Sem requisito.',
    },
  },
  {
    name: 'Armadura de Couro',
    description: 'VB 5. Agilidade: +5 de Esquiva adicional.',
    type: 'armor',
    effects: [{ type: 'statBonus', stat: 'esquiva', value: 5 }],
    weight: 4,
    armorTags: ['armadura-de-couro', 'leve'],
    armorDetails: {
      currentHealth: 0,
      maxHealth: 0,
      blockValue: 5,
      slot: 'primary',
      requirement: { attribute: 'grace', value: 10 },
      ruleText: 'Requisito: GRA 10.',
    },
  },
  {
    name: 'Cota de Malha',
    description: 'VB 8. +2 RD contra dano cortante e -3 em Furtividade.',
    type: 'armor',
    effects: [],
    weight: 7,
    armorTags: ['cota-de-malha', 'media'],
    armorDetails: {
      currentHealth: 0,
      maxHealth: 0,
      blockValue: 8,
      slot: 'primary',
      requirement: { attribute: 'might', value: 12 },
      ruleText: 'Requisito: MIG 12.',
    },
  },
  {
    name: 'Couraça de Metal',
    description: 'VB 12. -7 de Esquiva e imunidade a Concussão.',
    type: 'armor',
    effects: [{ type: 'statBonus', stat: 'esquiva', value: -7 }],
    weight: 10,
    armorTags: ['couraca-de-metal', 'pesada'],
    armorDetails: {
      currentHealth: 0,
      maxHealth: 0,
      blockValue: 12,
      slot: 'primary',
      requirement: { attribute: 'might', value: 15 },
      ruleText: 'Requisito: MIG 15.',
    },
  },
  {
    name: 'Armadura de Placas',
    description: 'VB 15. Tanque de Guerra: -15 de Esquiva.',
    type: 'armor',
    effects: [{ type: 'statBonus', stat: 'esquiva', value: -15 }],
    weight: 15,
    armorTags: ['armadura-de-placas', 'pesada'],
    armorDetails: {
      currentHealth: 0,
      maxHealth: 0,
      blockValue: 15,
      slot: 'primary',
      requirement: { attribute: 'might', value: 20 },
      ruleText: 'Requisito: MIG 20.',
    },
  },
]

export const WEAPON_PRESETS = parseWeapons()
export const ARMOR_PRESETS = ARMORS
export const EQUIPMENT_PRESETS = [...ARMORS, ...WEAPON_PRESETS]
