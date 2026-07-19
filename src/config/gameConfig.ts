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

export interface AttributeModifierFormula {
  base: number
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
  attributeModifiers: Record<AttributeName, AttributeModifierFormula>
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
  attributeModifiers: {
    might: { base: 0, rate: 1 / 5 },
    grace: { base: 0, rate: 1 / 5 },
    wisdom: { base: 0, rate: 1 / 5 },
    sense: { base: 0, rate: 1 / 5 },
    fortitude: { base: 0, rate: 1 / 5 },
  },
}

// ── Calculator ────────────────────────────────────────────────────────────────

import type { Attributes, DerivedStats } from '../types/game'

export function calculateAttributeModifiers(
  attributes: Attributes,
  config: GameConfig = defaultGameConfig,
): Record<AttributeName, number> {
  const modifierConfig = config.attributeModifiers ?? defaultGameConfig.attributeModifiers

  const calc = (attribute: AttributeName) => {
    const value = attributes[attribute]
    if (value <= 0) return 0
    const formula = modifierConfig[attribute]
    return Math.ceil(formula.base + value * formula.rate)
  }

  return {
    might: calc('might'),
    grace: calc('grace'),
    wisdom: calc('wisdom'),
    sense: calc('sense'),
    fortitude: calc('fortitude'),
  }
}

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

