/* eslint-disable no-console -- executable migration contract test */
import assert from 'node:assert/strict'

import { MELEE_SKILLS } from '../src/data/combatSkills'
import { DEFAULT_TREE, migrateCharacterTalentNodes } from '../src/features/talentTree/defaultTree'
import type { Character } from '../src/types/game'
import type { TalentTree } from '../src/types/talentTree'

const skill = MELEE_SKILLS[0]
const previousTree: TalentTree = {
  id: DEFAULT_TREE.id,
  version: 9,
  name: 'Legada',
  description: '',
  nodes: [
    { id: 'mago-start', x: 0, y: 0, data: { type: 'player', name: 'Mago', description: '' } },
    {
      id: 'guerreiro-habilidade-antiga',
      x: 1,
      y: 0,
      data: {
        type: 'combatAbility',
        skillId: skill.id,
        skillName: skill.name,
        skillDescription: skill.description,
        skillCost: skill.cost,
      },
    },
  ],
  edges: [{ id: 'old', from: 'mago-start', to: 'guerreiro-habilidade-antiga' }],
}

const character = {
  id: 'migration-test',
  acquiredNodeIds: ['mago-start', 'guerreiro-habilidade-antiga'],
  nodeConfigs: {},
} as Character

const migrated = migrateCharacterTalentNodes(character, previousTree, DEFAULT_TREE)
assert.ok(migrated.acquiredNodeIds.includes('wisdom-start'), 'Mago precisa migrar para Wisdom')
const migratedSkill = DEFAULT_TREE.nodes.find(
  (node) => node.data.type === 'combatAbility' && node.data.skillId === skill.id,
)
assert.ok(migratedSkill, 'Habilidade precisa existir na árvore nova')
assert.ok(
  migrated.acquiredNodeIds.includes(migratedSkill.id),
  'Habilidade adquirida precisa migrar por skillId',
)
assert.equal(migrated.acquiredNodeIds.length, 2, 'Migração não pode duplicar aquisições')

console.log('✓ Migração preservou origem Mago→Wisdom e habilidade adquirida por skillId.')
