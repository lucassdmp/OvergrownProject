/* eslint-disable no-console -- executable contract test */
import assert from 'node:assert/strict'

import { calculateAttributeModifiers } from '../src/config/gameConfig'
import {
  calculateWeaponAttributeModifier,
  resolveWeaponPrimaryAttribute,
  resolveWeaponScaling,
} from '../src/lib/weaponRules'
import type { InventoryItem, WeaponAttributeScaling, WeaponTag } from '../src/types/game'

function weapon(
  name: string,
  tags: WeaponTag[],
  scaling: WeaponAttributeScaling[],
  combatSkill: NonNullable<InventoryItem['weaponDetails']>['combatSkill'],
): InventoryItem {
  return {
    id: name,
    name,
    description: '',
    quantity: 1,
    type: 'weapon',
    effects: [],
    weaponTags: tags,
    weaponDetails: { damage: [{ count: 1, die: 8 }], scaling, combatSkill },
  }
}

const modifiers = calculateAttributeModifiers({
  might: 10,
  grace: 15,
  wisdom: 20,
  sense: 25,
  fortitude: 5,
})

for (const item of [
  weapon('Arco', ['arco', 'distancia'], [{ attribute: 'grace', multiplier: 1 }], 'pontaria'),
  weapon('Besta', ['besta', 'distancia'], [{ attribute: 'grace', multiplier: 1 }], 'pontaria'),
  weapon(
    'Rifle',
    ['arma-de-fogo', 'distancia'],
    [{ attribute: 'grace', multiplier: 1 }],
    'pontaria',
  ),
  weapon('Pistola', ['pistola', 'distancia'], [{ attribute: 'might', multiplier: 1 }], 'pontaria'),
]) {
  assert.equal(resolveWeaponPrimaryAttribute(item), 'sense', `${item.name} precisa usar Sense`)
  assert.equal(calculateWeaponAttributeModifier(item, modifiers), modifiers.sense)
}

const sword = weapon(
  'Espada',
  ['espada-uma-mao', 'corpo-a-corpo'],
  [{ attribute: 'might', multiplier: 1 }],
  'luta',
)
assert.equal(resolveWeaponPrimaryAttribute(sword), 'might')

const staff = weapon(
  'Cajado',
  ['cajado', 'distancia', 'corpo-a-corpo', 'magica'],
  [{ attribute: 'wisdom', multiplier: 1 }],
  'arcanismo',
)
assert.equal(resolveWeaponPrimaryAttribute(staff), 'wisdom', 'Cajado mágico preserva Wisdom')
assert.equal(
  resolveWeaponPrimaryAttribute(staff, 'ranged'),
  'sense',
  'Modo físico à distância usa Sense',
)
assert.equal(
  resolveWeaponPrimaryAttribute(staff, 'melee'),
  'wisdom',
  'Modo melee híbrido preserva escala autoral',
)

const spear = weapon(
  'Lança',
  ['lanca', 'corpo-a-corpo'],
  [{ attribute: 'might', multiplier: 1 }],
  'luta',
)
assert.deepEqual(resolveWeaponScaling(spear, 'ranged'), [{ attribute: 'sense', multiplier: 1 }])
assert.equal(resolveWeaponPrimaryAttribute(spear, 'melee'), 'might')

console.log(
  '✓ Arcos, bestas, rifles, pistolas, melee, híbridas e mágicas validaram o resolver central de Sense.',
)
