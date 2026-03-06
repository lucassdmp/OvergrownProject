// ─────────────────────────────────────────────────────────────────────────────
// OverGrown – Element Definitions
// Add new entries here as the system expands; the types in game.ts grow with it.
// ─────────────────────────────────────────────────────────────────────────────

import type { Element } from '../types/game'

export const ELEMENTS: Element[] = [
  {
    id: 'agua',
    label: 'Água',
    color: '#3B82F6',    // blue-500
    textColor: '#ffffff',
  },
  {
    id: 'ar',
    label: 'Ar',
    color: '#BAE6FD',    // sky-200
    textColor: '#0c4a6e',
  },
  {
    id: 'espacial',
    label: 'Espacial',
    color: '#7C3AED',    // violet-600
    textColor: '#ffffff',
  },
  {
    id: 'fogo',
    label: 'Fogo',
    color: '#EF4444',    // red-500
    textColor: '#ffffff',
  },
  {
    id: 'luz',
    label: 'Luz',
    color: '#FDE68A',    // amber-200
    textColor: '#78350f',
  },
  {
    id: 'mental',
    label: 'Mental',
    color: '#A855F7',    // purple-500
    textColor: '#ffffff',
  },
  {
    id: 'natureza',
    label: 'Natureza',
    color: '#22C55E',    // green-500
    textColor: '#ffffff',
  },
  {
    id: 'pedra',
    label: 'Pedra',
    color: '#78716C',    // stone-500
    textColor: '#ffffff',
  },
  {
    id: 'raio',
    label: 'Raio',
    color: '#EAB308',    // yellow-500
    textColor: '#1a1a1a',
  },
  {
    id: 'sombras',
    label: 'Sombras',
    color: '#1E1B4B',    // indigo-950
    textColor: '#c7d2fe',
  },
  {
    id: 'tempo',
    label: 'Tempo',
    color: '#06B6D4',    // cyan-500
    textColor: '#ffffff',
  },
]

/** Lookup map for O(1) access by id */
export const ELEMENTS_MAP: Record<string, Element> = Object.fromEntries(
  ELEMENTS.map((el) => [el.id, el]),
)
