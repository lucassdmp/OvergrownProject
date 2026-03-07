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
 * Point cost of a given mastery level for a single skill:
 *  – Origin skills get the first Mastery I for free (cost = mastery - 1)
 *  – All other skills pay 1 point per mastery level (I=1, II=2, III=3, IV=4)
 */
export function getSkillCost(mastery: MasteryLevel, isOriginSkill: boolean): number {
  if (mastery === 0) return 0
  return isOriginSkill ? Math.max(0, mastery - 1) : mastery
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
