import armorBookRaw from '../../Livro/Contents/6-armas_e_armaduras.tex?raw'
import type { AttributeName, InventoryItem, WeaponAttributeScaling, WeaponDamageRoll } from '../types/game'

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

function parseDamage(value: string): { damage: WeaponDamageRoll[]; scaling: WeaponAttributeScaling[] } {
  const damage = [...value.matchAll(/(\d+)D(\d+)/gi)].map((match) => ({ count: Number(match[1]), die: Number(match[2]) }))
  const scaling = [...value.matchAll(/MOD de (MIG|GRA|WIS|SEN|FOR)/gi)]
    .map((match) => ATTRIBUTE_BY_CODE[match[1].toUpperCase()])
    .filter(Boolean)
    .map((attribute) => ({ attribute, multiplier: 1 }))
  return { damage, scaling }
}

function parseWeapons(): EquipmentPreset[] {
  const section = armorBookRaw.split('\\titlesection{Armaduras e Proteções}')[0]
  const rows: EquipmentPreset[] = []
  const rowPattern = /^\s*([^%\\][^&\n]+?)\s*&\s*(\d+)\s*&\s*(\d+)\s*&\s*([^&\n]+?)\s*&\s*(.*?)\s*\\\\/gm
  for (const match of section.matchAll(rowPattern)) {
    const name = stripLatex(match[1])
    if (!name || name.includes('Nome')) continue
    const threat = Number(match[2])
    const weight = Number(match[3])
    const damageText = stripLatex(match[4])
    const property = stripLatex(match[5])
    const parsedDamage = parseDamage(damageText)
    const blockBonus = name === 'Escudo' ? 5 : ['Espada de Duas Mãos', 'Martelo de Duas Mãos'].includes(name) ? 3 : 0
    rows.push({
      name,
      description: `${damageText}. ${property}`,
      type: 'weapon',
      effects: [],
      weight,
      threat: String(threat),
      weaponDetails: {
        ...parsedDamage,
        critical: { rangeMin: threat, multiplier: 2 },
      },
      armorDetails: blockBonus > 0 || name === 'Escudo'
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
    name: 'Vestes de Pano', description: 'VB 0. Condutor Rúnico: +1 Espaço de Melhoria Rúnica. Sem limite de Esquiva ou penalidade de ruído.',
    type: 'armor', effects: [], weight: 2,
    armorDetails: { currentHealth: 0, maxHealth: 0, blockValue: 0, slot: 'primary', ruleText: 'Sem requisito.' },
  },
  {
    name: 'Gambeson', description: 'VB 3. Amortecida: reduz o dano de Concussão em 1D4. Pode ser usado sob armaduras pesadas.',
    type: 'armor', effects: [], weight: 2,
    armorDetails: { currentHealth: 0, maxHealth: 0, blockValue: 3, slot: 'underlayer', ruleText: 'Sem requisito.' },
  },
  {
    name: 'Armadura de Couro', description: 'VB 5. Agilidade: +5 de Esquiva adicional.',
    type: 'armor', effects: [{ type: 'statBonus', stat: 'esquiva', value: 5 }], weight: 4,
    armorDetails: { currentHealth: 0, maxHealth: 0, blockValue: 5, slot: 'primary', requirement: { attribute: 'grace', value: 10 }, ruleText: 'Requisito: GRA 10.' },
  },
  {
    name: 'Cota de Malha', description: 'VB 8. +2 RD contra dano cortante e -3 em Furtividade.',
    type: 'armor', effects: [], weight: 7,
    armorDetails: { currentHealth: 0, maxHealth: 0, blockValue: 8, slot: 'primary', requirement: { attribute: 'might', value: 12 }, ruleText: 'Requisito: MIG 12.' },
  },
  {
    name: 'Couraça de Metal', description: 'VB 12. -7 de Esquiva e imunidade a Concussão.',
    type: 'armor', effects: [{ type: 'statBonus', stat: 'esquiva', value: -7 }], weight: 10,
    armorDetails: { currentHealth: 0, maxHealth: 0, blockValue: 12, slot: 'primary', requirement: { attribute: 'might', value: 15 }, ruleText: 'Requisito: MIG 15.' },
  },
  {
    name: 'Armadura de Placas', description: 'VB 15. Tanque de Guerra: -15 de Esquiva.',
    type: 'armor', effects: [{ type: 'statBonus', stat: 'esquiva', value: -15 }], weight: 15,
    armorDetails: { currentHealth: 0, maxHealth: 0, blockValue: 15, slot: 'primary', requirement: { attribute: 'might', value: 20 }, ruleText: 'Requisito: MIG 20.' },
  },
]

export const WEAPON_PRESETS = parseWeapons()
export const ARMOR_PRESETS = ARMORS
export const EQUIPMENT_PRESETS = [...ARMORS, ...WEAPON_PRESETS]
