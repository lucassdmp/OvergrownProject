import type { CharacterV2 } from '../../../types/gameV2'
import type { TalentTree } from '../../../types/talentTree'

export interface CharacterV2File {
  format: 'overgrown-character-v2'
  version: 1
  character: CharacterV2
  talentTree: TalentTree
}

export function createCharacterV2File(
  character: CharacterV2,
  talentTree: TalentTree,
): CharacterV2File {
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

export function serializeCharacterV2File(character: CharacterV2, talentTree: TalentTree): string {
  return JSON.stringify(createCharacterV2File(character, talentTree), null, 2)
}

export function isCharacterV2File(value: unknown): value is CharacterV2File {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<CharacterV2File>
  return (
    candidate.format === 'overgrown-character-v2' &&
    candidate.version === 1 &&
    isLegacyCharacterV2(candidate.character) &&
    isTalentTree(candidate.talentTree)
  )
}

export function isLegacyCharacterV2(value: unknown): value is CharacterV2 {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<CharacterV2>
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
