import { useMemo, useState, useEffect } from 'react'
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
  TalentTreeNode,
} from '../../../types/talentTree'

export interface CharacterV2Stats {
  attributes: Attributes
  attributeModifiers: Record<AttributeName, number>
  derivedStats: DerivedStats
  unlockedSpells: MagicNodeData[]
  unlockedAttacks: CombatAbilityNodeData[]
  weaponBonuses: WeaponBonusNodeData[]
  spellModifiers: SpellModifierNodeData[]
  defenseBonuses: DefenseBonusNodeData[]
  skillBonuses: Record<string, number>
}

const EMPTY_ATTRIBUTES: Attributes = {
  might: 0, grace: 0, wisdom: 0, sense: 0, fortitude: 0,
}

const EMPTY_STATS: CharacterV2Stats = {
  attributes: { ...EMPTY_ATTRIBUTES },
  attributeModifiers: { might: 0, grace: 0, wisdom: 0, sense: 0, fortitude: 0 },
  derivedStats: { vida: 10, iep: 10, pc: 2, resistencia: 5, esquiva: 5 },
  unlockedSpells: [],
  unlockedAttacks: [],
  weaponBonuses: [],
  spellModifiers: [],
  defenseBonuses: [],
  skillBonuses: {},
}

export function useCharacterV2Stats(): CharacterV2Stats {
  const character    = useCharacterV2Store((s) => s.character)
  // Subscribe to nodes and edges individually so React sees reference changes
  const treeNodes = useTalentTreeStore((s) => s.tree.nodes)

  // Force a re-render when the talent tree store finishes hydrating
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    if (useTalentTreeStore.persist.hasHydrated()) return
    const unsub = useTalentTreeStore.persist.onFinishHydration(() => forceUpdate((n) => n + 1))
    return unsub
  }, [])

  return useMemo(() => {
    if (!treeNodes.length) return EMPTY_STATS

    const acquiredSet  = new Set(character.acquiredNodeIds)
    const nodeConfigs  = character.nodeConfigs ?? {}

    const attributes: Attributes = { ...EMPTY_ATTRIBUTES }
    const unlockedSpells: MagicNodeData[] = []
    const unlockedAttacks: CombatAbilityNodeData[] = []
    const weaponBonuses: WeaponBonusNodeData[] = []
    const spellModifiers: SpellModifierNodeData[] = []
    const defenseBonuses: DefenseBonusNodeData[] = []
    const skillBonuses: Record<string, number> = {}
    let statBonuses: Partial<DerivedStats> = {}

    for (const node of treeNodes.filter((n: TalentTreeNode) => acquiredSet.has(n.id))) {
      const data = node.data as TalentNodeData
      switch (data.type) {
        case 'attribute': {
          const chosenAttr = nodeConfigs[node.id]?.attribute ?? data.attribute
          if (chosenAttr) attributes[chosenAttr] = (attributes[chosenAttr] ?? 0) + data.value
          break
        }
        case 'magic': {
          unlockedSpells.push(data)
          for (const b of data.attributeBonuses)
            attributes[b.attribute] = (attributes[b.attribute] ?? 0) + b.value
          for (const b of data.statBonuses)
            statBonuses = { ...statBonuses, [b.stat]: ((statBonuses[b.stat as keyof DerivedStats] ?? 0) as number) + b.value }
          break
        }
        case 'combatAbility':
          unlockedAttacks.push(data); break
        case 'stat':
          statBonuses = { ...statBonuses, [data.stat]: ((statBonuses[data.stat as keyof DerivedStats] ?? 0) as number) + data.value }
          break
        case 'weaponBonus':  weaponBonuses.push(data);  break
        case 'spellModifier': spellModifiers.push(data); break
        case 'defenseBonus': defenseBonuses.push(data); break
        case 'skillBonus':
          if (data.skillId) skillBonuses[data.skillId] = (skillBonuses[data.skillId] ?? 0) + data.value
          break
        default: break
      }
    }

    // Item attribute bonuses (equipped weapons/armors only)
    const boostedAttributes: Attributes = { ...attributes }
    const activeItems = (character.inventory ?? []).filter((it) =>
      it.type === 'weapon' || it.type === 'armor' ? it.equipped === true && !it.broken : it.quantity > 0
    )
    for (const item of activeItems)
      for (const ef of item.effects)
        if (ef.type === 'attributeBonus' && ef.attribute && ef.value != null)
          boostedAttributes[ef.attribute] = (boostedAttributes[ef.attribute] ?? 0) + ef.value

    // Derived stats
    const derivedStats: DerivedStats = { ...calculateDerivedStats(boostedAttributes, defaultGameConfig) }
    for (const [key, val] of Object.entries(statBonuses))
      if (val != null) derivedStats[key as keyof DerivedStats] += val as number
    for (const item of activeItems)
      for (const ef of item.effects)
        if (ef.type === 'statBonus' && ef.stat && ef.value != null)
          derivedStats[ef.stat] = (derivedStats[ef.stat] ?? 0) + ef.value

    const reflexosMastery = (character.skills?.['reflexos'] ?? 0) as number
    if (reflexosMastery > 0) derivedStats.esquiva += reflexosMastery * 5

    return {
      attributes,
      attributeModifiers: calculateAttributeModifiers(boostedAttributes, defaultGameConfig),
      derivedStats,
      unlockedSpells,
      unlockedAttacks,
      weaponBonuses,
      spellModifiers,
      defenseBonuses,
      skillBonuses,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    character.acquiredNodeIds,
    character.nodeConfigs,
    character.inventory,
    character.skills,
    treeNodes,
  ])
}
