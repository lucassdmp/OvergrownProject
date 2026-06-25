// ─────────────────────────────────────────────────────────────────────────────
// OverGrown V2 – Stats hook
// Derives all character stats from acquired talent tree nodes.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import { useCharacterV2Store } from '../store/characterV2Store'
import { useTalentTreeStore } from '../../talentTree/store/talentTreeStore'
import { calculateAttributeModifiers, calculateDerivedStats, defaultGameConfig } from '../../../config/gameConfig'
import type { Attributes, DerivedStats, AttributeName } from '../../../types/game'
import type {
  MagicNodeData,
  CombatAbilityNodeData,
  WeaponBonusNodeData,
  SpellModifierNodeData,
  DefenseBonusNodeData,
  TalentNodeData,
} from '../../../types/talentTree'

export interface CharacterV2Stats {
  /** Summed attribute values from all acquired attribute nodes */
  attributes: Attributes
  /** Attribute modifiers (e.g. MOD MIG) derived from attributes */
  attributeModifiers: Record<AttributeName, number>
  /** Derived stats (max vida, IEP, PC, resistência, esquiva) from attributes + tree stat bonuses + item bonuses */
  derivedStats: DerivedStats
  /** Unlocked spells (magic nodes that are acquired) */
  unlockedSpells: MagicNodeData[]
  /** Unlocked combat abilities */
  unlockedAttacks: CombatAbilityNodeData[]
  /** Weapon bonus nodes (passive, applied in combat UI) */
  weaponBonuses: WeaponBonusNodeData[]
  /** Spell modifier nodes (passive, applied to spell display) */
  spellModifiers: SpellModifierNodeData[]
  /** Defense bonus nodes (passive, damage reduction) */
  defenseBonuses: DefenseBonusNodeData[]
  /** Aggregated skill bonuses from skill bonus nodes */
  skillBonuses: Record<string, number>
}

const EMPTY_ATTRIBUTES: Attributes = {
  might: 0, grace: 0, wisdom: 0, sense: 0, fortitude: 0,
}

export function useCharacterV2Stats(): CharacterV2Stats {
  const character = useCharacterV2Store((s) => s.character)
  const tree = useTalentTreeStore((s) => s.tree)

  return useMemo(() => {
    const acquiredSet = new Set(character.acquiredNodeIds)
    const acquiredNodes = tree.nodes
      .filter((n) => acquiredSet.has(n.id))
      .map((n) => n.data as TalentNodeData)

    // ── Accumulate attributes from attribute + magic nodes ────────────────────
    const attributes: Attributes = { ...EMPTY_ATTRIBUTES }
    const unlockedSpells: MagicNodeData[] = []
    const unlockedAttacks: CombatAbilityNodeData[] = []
    const weaponBonuses: WeaponBonusNodeData[] = []
    const spellModifiers: SpellModifierNodeData[] = []
    const defenseBonuses: DefenseBonusNodeData[] = []
    const skillBonuses: Record<string, number> = {}

    let statBonuses: Partial<DerivedStats> = {}

    for (const data of acquiredNodes) {
      switch (data.type) {
        case 'attribute': {
          if (data.attribute) {
            attributes[data.attribute] = (attributes[data.attribute] ?? 0) + data.value
          }
          break
        }
        case 'magic': {
          unlockedSpells.push(data)
          // Magic nodes can also grant attribute/stat bonuses
          for (const b of data.attributeBonuses) {
            attributes[b.attribute] = (attributes[b.attribute] ?? 0) + b.value
          }
          for (const b of data.statBonuses) {
            statBonuses = { ...statBonuses, [b.stat]: (statBonuses[b.stat as keyof DerivedStats] ?? 0) + b.value }
          }
          break
        }
        case 'combatAbility': {
          unlockedAttacks.push(data)
          break
        }
        case 'stat': {
          statBonuses = { ...statBonuses, [data.stat]: (statBonuses[data.stat as keyof DerivedStats] ?? 0) + data.value }
          break
        }
        case 'weaponBonus': {
          weaponBonuses.push(data)
          break
        }
        case 'spellModifier': {
          spellModifiers.push(data)
          break
        }
        case 'defenseBonus': {
          defenseBonuses.push(data)
          break
        }
        case 'skillBonus': {
          if (data.skillId) {
            skillBonuses[data.skillId] = (skillBonuses[data.skillId] ?? 0) + data.value
          }
          break
        }
        default:
          break
      }
    }

    // ── Factor in item attribute bonuses on top of tree attributes ────────────
    const boostedAttributes: Attributes = { ...attributes }
    const activeItems = (character.inventory ?? []).filter((it) =>
      it.type === 'weapon' || it.type === 'armor'
        ? it.equipped === true && !it.broken
        : it.quantity > 0,
    )
    for (const item of activeItems) {
      for (const ef of item.effects) {
        if (ef.type === 'attributeBonus' && ef.attribute && ef.value != null) {
          boostedAttributes[ef.attribute] = (boostedAttributes[ef.attribute] ?? 0) + ef.value
        }
      }
    }

    // ── Calculate derived stats ───────────────────────────────────────────────
    const baseDerived = calculateDerivedStats(boostedAttributes, defaultGameConfig)

    // Apply stat bonuses from tree nodes
    const derivedStats: DerivedStats = { ...baseDerived }
    for (const [key, val] of Object.entries(statBonuses)) {
      if (val != null) derivedStats[key as keyof DerivedStats] += val
    }

    // Apply statBonus effects from active items
    for (const item of activeItems) {
      for (const ef of item.effects) {
        if (ef.type === 'statBonus' && ef.stat && ef.value != null) {
          derivedStats[ef.stat] = (derivedStats[ef.stat] ?? 0) + ef.value
        }
      }
    }

    // Apply Reflexos perícia bonus
    const reflexosMastery = (character.skills?.['reflexos'] ?? 0) as number
    if (reflexosMastery > 0) {
      derivedStats.esquiva += reflexosMastery * 5
    }

    // Apply skillBonus nodes
    for (const [skillId, bonus] of Object.entries(skillBonuses)) {
      skillBonuses[skillId] = bonus
    }

    const attributeModifiers = calculateAttributeModifiers(boostedAttributes, defaultGameConfig)

    return {
      attributes,
      attributeModifiers,
      derivedStats,
      unlockedSpells,
      unlockedAttacks,
      weaponBonuses,
      spellModifiers,
      defenseBonuses,
      skillBonuses,
    }
  }, [character.acquiredNodeIds, character.inventory, character.skills, tree.nodes])
}
