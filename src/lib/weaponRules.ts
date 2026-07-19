import type { AttributeName, InventoryItem, WeaponAttributeScaling } from '../types/game'

export type WeaponAttackMode = 'melee' | 'ranged' | 'magic'

function inferredMode(item: InventoryItem): WeaponAttackMode {
  if (item.weaponDetails?.combatSkill === 'arcanismo' || item.weaponTags?.includes('magica'))
    return 'magic'
  if (item.weaponDetails?.combatSkill === 'pontaria' || item.weaponTags?.includes('distancia'))
    return 'ranged'
  return 'melee'
}

/**
 * Central resolver for weapon attribute scaling. Physical ranged attacks always
 * use Sense. Explicit melee/magic modes preserve the weapon's authored scaling,
 * which supports hybrid weapons such as a thrown spear or melee staff.
 */
export function resolveWeaponScaling(
  item: InventoryItem,
  mode: WeaponAttackMode = inferredMode(item),
): WeaponAttributeScaling[] {
  if (mode === 'ranged') return [{ attribute: 'sense', multiplier: 1 }]
  const authored = item.weaponDetails?.scaling ?? []
  if (authored.length) return authored
  return [{ attribute: mode === 'magic' ? 'wisdom' : 'might', multiplier: 1 }]
}

export function resolveWeaponPrimaryAttribute(
  item: InventoryItem,
  mode?: WeaponAttackMode,
): AttributeName {
  return resolveWeaponScaling(item, mode)[0]?.attribute ?? 'might'
}

export function calculateWeaponAttributeModifier(
  item: InventoryItem,
  modifiers: Record<AttributeName, number>,
  mode?: WeaponAttackMode,
) {
  return resolveWeaponScaling(item, mode).reduce(
    (total, scaling) => total + modifiers[scaling.attribute] * scaling.multiplier,
    0,
  )
}

export function weaponRuleSummary(item: InventoryItem, mode?: WeaponAttackMode) {
  const scaling = resolveWeaponScaling(item, mode)
    .map((entry) => `${entry.multiplier === 1 ? '' : `${entry.multiplier}× `}${entry.attribute}`)
    .join(' + ')
  const skill =
    (mode ?? inferredMode(item)) === 'ranged'
      ? 'Pontaria'
      : (mode ?? inferredMode(item)) === 'magic'
        ? 'Arcanismo'
        : 'Luta'
  return `${skill} · MOD ${scaling}`
}
