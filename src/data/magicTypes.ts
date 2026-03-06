// ─────────────────────────────────────────────────────────────────────────────
// OverGrown – Magic Type Definitions
// Each type has its own colour for tag rendering.
// Add new types here freely – no other file needs to change.
// ─────────────────────────────────────────────────────────────────────────────

import type { MagicType } from '../types/game'

export const MAGIC_TYPES: MagicType[] = [
  {
    id: 'aoe',
    label: 'AOE',
    color: '#F97316',    // orange-500
    textColor: '#ffffff',
  },
  {
    id: 'projetil',
    label: 'Projétil',
    color: '#6366F1',    // indigo-500
    textColor: '#ffffff',
  },
  {
    id: 'debuff',
    label: 'Debuff',
    color: '#DC2626',    // red-600
    textColor: '#ffffff',
  },
  {
    id: 'cura',
    label: 'Cura',
    color: '#10B981',    // emerald-500
    textColor: '#ffffff',
  },
  {
    id: 'single',
    label: 'Single Target',
    color: '#0EA5E9',    // sky-500
    textColor: '#ffffff',
  },
  {
    id: 'buff',
    label: 'Buff',
    color: '#F59E0B',    // amber-500
    textColor: '#1a1a1a',
  },
  {
    id: 'invocacao',
    label: 'Invocação',
    color: '#8B5CF6',    // violet-500
    textColor: '#ffffff',
  },
  {
    id: 'transformacao',
    label: 'Transformação',
    color: '#14B8A6',    // teal-500
    textColor: '#ffffff',
  },
]

/** Lookup map for O(1) access by id */
export const MAGIC_TYPES_MAP: Record<string, MagicType> = Object.fromEntries(
  MAGIC_TYPES.map((mt) => [mt.id, mt]),
)
