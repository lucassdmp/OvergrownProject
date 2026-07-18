import type { Character } from '../../../types/game'
import type { TalentTree } from '../../../types/talentTree'

export interface CharacterFile {
  format: 'overgrown-character-v2'
  version: 1
  character: Character
  talentTree: TalentTree
}

export function createCharacterFile(
  character: Character,
  talentTree: TalentTree,
): CharacterFile {
  return {
    format: 'overgrown-character-v2',
    version: 1,
    character: { ...character, connectedTreeId: talentTree.id },
    talentTree: {
      ...talentTree,
      nodes: [...talentTree.nodes].sort((a, b) => a.id.localeCompare(b.id)),
      edges: [...talentTree.edges].sort((a, b) => a.id.localeCompare(b.id)),
    },
  }
}

export function serializeCharacterFile(character: Character, talentTree: TalentTree): string {
  return JSON.stringify(createCharacterFile(character, talentTree), null, 2)
}

export function isCharacterFile(value: unknown): value is CharacterFile {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<CharacterFile>
  return (
    candidate.format === 'overgrown-character-v2' &&
    candidate.version === 1 &&
    isCharacterData(candidate.character) &&
    isTalentTree(candidate.talentTree)
  )
}

export function isCharacterData(value: unknown): value is Character {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<Character>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    Array.isArray(candidate.acquiredNodeIds)
  )
}

export function isTalentTree(value: unknown): value is TalentTree {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<TalentTree>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    Array.isArray(candidate.nodes) &&
    Array.isArray(candidate.edges)
  )
}
