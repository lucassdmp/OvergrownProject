// ─────────────────────────────────────────────────────────────────────────────
// OverGrown – Game Configuration
// All resource formulas are centralised here so they can be tuned without
// touching business logic.
// ─────────────────────────────────────────────────────────────────────────────

import type { AttributeName } from '../types/game'
// ── Formula primitive ─────────────────────────────────────────────────────────

/**
 * Describes how a resource is derived from attributes.
 *
 * result = base + (sum of attributes) * rate
 *
 * Examples from the rulebook:
 *   IEP         = 10 + Wisdom        * 5     →  base:10, attrs:['wisdom'],             rate:5
 *   PC          = 2  + (Might+Grace) * 1     →  base:2,  attrs:['might','grace'],      rate:1
 *   Vida        = 10 + Fortitude     * 5     →  base:10, attrs:['fortitude'],          rate:5
 *   Resistência = 5  + Fortitude     * (1/7) →  base:5, attrs:['fortitude'],          rate:1/7
 *   Esquiva     = 5  + Grace         * (1/5) →  base:5, attrs:['grace'],              rate:1/5
 */
export interface ResourceFormula {
  base: number
  attributes: AttributeName[]
  rate: number
}

export interface GameConfig {
  resources: {
    iep: ResourceFormula
    pc: ResourceFormula
    vida: ResourceFormula
    resistencia: ResourceFormula
    esquiva: ResourceFormula
  }
}

// ── Default (rulebook) values ─────────────────────────────────────────────────

export const defaultGameConfig: GameConfig = {
  resources: {
    iep: {
      base: 10,
      attributes: ['wisdom'],
      rate: 5,
    },
    pc: {
      base: 2,
      attributes: ['might', 'grace'],
      rate: 1,
    },
    vida: {
      base: 10,
      attributes: ['fortitude'],
      rate: 5,
    },
    resistencia: {
      base: 5,
      attributes: ['fortitude'],
      rate: 1 / 8,
    },
    esquiva: {
      base: 5,
      attributes: ['grace'],
      rate: 1 / 7,
    },
  },
}

// ── Calculator ────────────────────────────────────────────────────────────────

import type { Attributes, DerivedStats, Character } from '../types/game'

/**
 * Computes all derived resource values from a character's raw attributes
 * using the provided (or default) game config.
 */
export function calculateDerivedStats(
  attributes: Attributes,
  config: GameConfig = defaultGameConfig,
): DerivedStats {
  const calc = (formula: ResourceFormula): number => {
    const attrSum = formula.attributes.reduce((sum, attr) => sum + attributes[attr], 0)
    return Math.floor(formula.base + attrSum * formula.rate)
  }

  return {
    iep: calc(config.resources.iep),
    pc: calc(config.resources.pc),
    vida: calc(config.resources.vida),
    resistencia: calc(config.resources.resistencia),
    esquiva: calc(config.resources.esquiva),
  }
}

/**
 * Like calculateDerivedStats but also factors in passive item bonuses
 * (attributeBonus and statBonus effects on items with quantity > 0).
 */
export function calculateEffectiveDerivedStats(
  character: Character,
  config: GameConfig = defaultGameConfig,
): DerivedStats {
  // Only include passive bonuses from items that are "active":
  // - weapons/armor must be equipped AND not broken
  // - everything else must have quantity > 0
  const activeItems = (character.inventory ?? []).filter((it) =>
    it.type === 'weapon' || it.type === 'armor'
      ? it.equipped === true && !it.broken
      : it.quantity > 0
  )

  // 1. Sum attributeBonus effects into a copy of the attributes
  const boostedAttrs: Attributes = { ...character.attributes }
  for (const item of activeItems) {
    for (const ef of item.effects) {
      if (ef.type === 'attributeBonus' && ef.attribute && ef.value != null) {
        boostedAttrs[ef.attribute] = (boostedAttrs[ef.attribute] ?? 0) + ef.value
      }
    }
  }

  // 2. Calculate base derived stats from boosted attributes
  const stats = calculateDerivedStats(boostedAttrs, config)

  // 3. Add statBonus effects directly
  for (const item of activeItems) {
    for (const ef of item.effects) {
      if (ef.type === 'statBonus' && ef.stat && ef.value != null) {
        stats[ef.stat] = (stats[ef.stat] ?? 0) + ef.value
      }
    }
  }

  // 4. Perícia Reflexos adds +5 to Esquiva per mastery level
  const reflexosMastery = (character.skills?.['reflexos'] ?? 0) as number
  if (reflexosMastery > 0) {
    stats.esquiva += reflexosMastery * 5
  }

  return stats
}
