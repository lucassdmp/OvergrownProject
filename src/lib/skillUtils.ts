// ─────────────────────────────────────────────────────────────────────────────
// OverGrown – Skill System Utilities
// ─────────────────────────────────────────────────────────────────────────────

import type { Character, MasteryLevel } from '../types/game'

// ── Mastery cap based on divinity ─────────────────────────────────────────────

/**
 * Returns the highest Mastery level the character is allowed to have,
 * gated by their Divinity level:
 *  I–II : any divinity
 *  III  : divinity ≥ 20
 *  IV   : divinity ≥ 40
 */
export function getMasteryCapForDivinity(divinity: number): MasteryLevel {
  if (divinity >= 40) return 4
  if (divinity >= 20) return 3
  return 2
}

// ── Skill point budget ────────────────────────────────────────────────────────

/**
 * Total skill points available:
 *   5 base  +  floor(divinity / 5) × 2
 *
 * Divinity 1 → 5 pts (no milestone)
 * Divinity 5 → 7 pts  (1st milestone)
 * Divinity 10 → 9 pts (2nd milestone) …
 */
export function getSkillBudget(divinity: number): number {
  return 5 + Math.floor(divinity / 5) * 2
}

/**
 * Point cost of a given mastery level for a single skill (cumulative total):
 *  – Acquiring Mastery I costs 1 pt; each subsequent upgrade (I→II, II→III, III→IV) costs 2 pts
 *  – Total: I=1, II=3, III=5, IV=7
 *  – Origin skills get Mastery I for free; upgrades still cost 2 pts each
 *  – Origin total: I=0, II=2, III=4, IV=6
 */
export function getSkillCost(mastery: MasteryLevel, isOriginSkill: boolean): number {
  if (mastery === 0) return 0
  if (isOriginSkill) return Math.max(0, mastery - 1) * 2
  // I costs 1; each level above I costs an additional 2
  return 1 + (mastery - 1) * 2
}

/**
 * Sum of all points currently spent across every trained skill.
 * Pass the origin skill id so its free I is not counted.
 */
export function getSkillPointsSpent(
  skills: Record<string, MasteryLevel>,
  originSkillId: string | null,
): number {
  let spent = 0
  for (const [skillId, mastery] of Object.entries(skills)) {
    if (!mastery) continue
    spent += getSkillCost(mastery, skillId === originSkillId)
  }
  return spent
}

// ── Item-based skill effects ──────────────────────────────────────────────────

/**
 * Scans all active items (equipped weapons/armor, or items with quantity > 0)
 * and collects:
 *  – bonuses  : flat test bonus per skill id (from skillBonus effects)
 *  – unlocked : skill ids granted at Mastery I minimum (from skillUnlock effects)
 */
export function getItemSkillEffects(character: Character): {
  bonuses: Record<string, number>
  unlocked: Set<string>
} {
  const bonuses: Record<string, number> = {}
  const unlocked = new Set<string>()

  const activeItems = (character.inventory ?? []).filter((it) =>
    it.type === 'weapon' || it.type === 'armor' ? it.equipped === true : it.quantity > 0,
  )

  for (const item of activeItems) {
    for (const ef of item.effects) {
      if (ef.type === 'skillBonus' && ef.skillId && ef.value != null) {
        bonuses[ef.skillId] = (bonuses[ef.skillId] ?? 0) + ef.value
      }
      if (ef.type === 'skillUnlock' && ef.skillId) {
        unlocked.add(ef.skillId)
      }
    }
  }

  return { bonuses, unlocked }
}
