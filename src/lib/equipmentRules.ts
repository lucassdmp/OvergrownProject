import type { Attributes, InventoryItem } from '../types/game'

export interface EquipmentDefense {
  blockValue: number
  invalidItemIds: Set<string>
  activeItemIds: Set<string>
}

export function meetsArmorRequirement(item: InventoryItem, attributes: Attributes) {
  const requirement = item.armorDetails?.requirement
  return !requirement || attributes[requirement.attribute] >= requirement.value
}

export function calculateEquipmentDefense(inventory: InventoryItem[], attributes: Attributes): EquipmentDefense {
  const equipped = inventory.filter((item) => item.equipped && !item.broken)
  const invalidItemIds = new Set<string>()
  const activeItemIds = new Set<string>()
  let armorBlock = 0
  let shieldBlock = 0
  let weaponBlock = 0
  const occupiedSlots = new Set<string>()

  for (const item of equipped) {
    const details = item.armorDetails
    if (!details) continue
    if (!meetsArmorRequirement(item, attributes)) {
      invalidItemIds.add(item.id)
      continue
    }
    const slot = details.slot
    if (slot && occupiedSlots.has(slot)) continue
    if (slot) occupiedSlots.add(slot)
    activeItemIds.add(item.id)
    armorBlock += details.blockValue ?? 0
    if (slot === 'shield') shieldBlock = Math.max(shieldBlock, details.blockBonus ?? 0)
    else weaponBlock = Math.max(weaponBlock, details.blockBonus ?? 0)
  }

  return { blockValue: armorBlock + shieldBlock + weaponBlock, invalidItemIds, activeItemIds }
}

export function conflictingEquipmentIds(inventory: InventoryItem[], target: InventoryItem) {
  const slot = target.armorDetails?.slot
  if (!slot) return []
  return inventory
    .filter((item) => item.id !== target.id && item.equipped && item.armorDetails?.slot === slot)
    .map((item) => item.id)
}
