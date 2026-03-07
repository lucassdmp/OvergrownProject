import { useMemo } from 'react'
import { useCharacterStore } from '../store/characterStore'
import { calculateEffectiveDerivedStats } from '../../../config/gameConfig'
import type { DerivedStats } from '../../../types/game'

/**
 * Returns the active character along with all derived stats.
 * The derived stats are memoised and only recomputed when attributes or
 * the game config change.
 */
export function useCharacter() {
  const character = useCharacterStore((s) => s.character)
  const gameConfig = useCharacterStore((s) => s.gameConfig)

  const derivedStats: DerivedStats = useMemo(
    () => calculateEffectiveDerivedStats(character, gameConfig),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      character.attributes.might,
      character.attributes.grace,
      character.attributes.wisdom,
      character.attributes.sense,
      character.attributes.fortitude,
      character.inventory,
      character.skills,
      gameConfig,
    ],
  )

  return { character, derivedStats }
}

/**
 * Returns only the derived stats – useful in components that don't
 * need the full character object.
 */
export function useDerivedStats(): DerivedStats {
  const { derivedStats } = useCharacter()
  return derivedStats
}
