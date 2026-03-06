// ─────────────────────────────────────────────────────────────────────────────
// OverGrown – Spell Data
// Transcribed from the rulebook. Add new spells as the system grows.
// ─────────────────────────────────────────────────────────────────────────────

import type { Spell } from '../types/game'

export const SPELLS: Spell[] = [
  // ── Encharcar ──────────────────────────────────────────────────────────────
  {
    id: 'encharcar',
    name: 'Encharcar',
    elements: ['agua'],
    minLevel: 0,
    description:
      'O usuário condensa a umidade do ar em uma esfera de água pura, que explode no contato, deixando os alvos completamente encharcados.',
    levels: [
      { level: 0,      cost: '2 IEP',   scaling: '1m Raio',   special: null },
      { level: 1,      cost: '4 IEP',   scaling: '2m Raio',   special: null },
      { level: 2,      cost: '6 IEP',   scaling: '3m Raio',   special: 'Invocação Livre' },
      { level: 3,      cost: '8 IEP',   scaling: '4m Raio',   special: null },
      { level: 4,      cost: '10 IEP',  scaling: '5m Raio',   special: 'Purificação Mística' },
      { level: 5,      cost: '12 IEP',  scaling: '6m Raio',   special: null },
      { level: 6,      cost: '14 IEP',  scaling: '7m Raio',   special: null },
      { level: 7,      cost: '16 IEP',  scaling: '8m Raio',   special: null },
      { level: 8,      cost: '18 IEP',  scaling: '9m Raio',   special: null },
      { level: 9,      cost: '20 IEP',  scaling: '10m Raio',  special: null },
      { level: 'divino', cost: '22 IEP', scaling: '20m Raio', special: 'Dilúvio' },
    ],
    specialDescriptions: {
      'Invocação Livre': 'Conjura a até 9m.',
      'Purificação Mística': 'Extingue chamas mágicas.',
      'Dilúvio': 'Transforma o terreno em alagado.',
    },
    category: 'Alcance',
    types: ['aoe', 'debuff'],
    notes: 'Aplica Encharcado. Aumenta o raio por nível.',
  },

  // ── Estalactite ────────────────────────────────────────────────────────────
  {
    id: 'estalactite',
    name: 'Estalactite',
    elements: ['agua', 'ar'],
    minLevel: 0,
    description:
      'O usuário forma um projétil de gelo aguçado a partir de IEP congelado, que voa em alta velocidade para perfurar o alvo.',
    levels: [
      { level: 0,      cost: '6 IEP',   scaling: '2D8 + WIS',           special: null },
      { level: 1,      cost: '10 IEP',  scaling: '2D10 + WIS',          special: null },
      { level: 2,      cost: '14 IEP',  scaling: '3D10 + WIS',          special: null },
      { level: 3,      cost: '18 IEP',  scaling: '3D12 + WIS',          special: 'Penetração Mágica Básica' },
      { level: 4,      cost: '22 IEP',  scaling: '4D12 + WIS',          special: null },
      { level: 5,      cost: '30 IEP',  scaling: '5D12 + WIS',          special: 'Penetração Mágica Avançada' },
      { level: 6,      cost: '38 IEP',  scaling: '6D12 + WIS',          special: null },
      { level: 7,      cost: '46 IEP',  scaling: '6D12 + 3D6 + WIS',   special: null },
      { level: 8,      cost: '54 IEP',  scaling: '6D12 + 5D6 + WIS',   special: null },
      { level: 9,      cost: '62 IEP',  scaling: '6D12 + 7D6 + WIS',   special: null },
      { level: 'divino', cost: '70 IEP', scaling: '6D12 + 9D6 + (1D20 × WIS)', special: 'Penetração Total' },
    ],
    specialDescriptions: {
      'Penetração Mágica Básica': 'Ignora 5 de Resistência Mágica.',
      'Penetração Mágica Avançada': 'Ignora 10 de Resistência Mágica.',
      'Penetração Total': 'Ignora toda Resistência a Água.',
    },
    category: 'Ataque',
    types: ['projetil', 'single'],
    notes: 'Aumenta o dano por nível.',
  },

  // ── Onda Curativa ──────────────────────────────────────────────────────────
  {
    id: 'onda-curativa',
    name: 'Onda Curativa',
    elements: ['agua'],
    minLevel: 0,
    description:
      'O usuário invoca uma onda de energia aquática curativa, que banha o alvo em uma luz revitalizante e limpa impurezas.',
    levels: [
      { level: 0,      cost: '6 IEP',   scaling: '2D6 + WIS',          special: null },
      { level: 1,      cost: '12 IEP',  scaling: '3D6 + WIS',          special: null },
      { level: 2,      cost: '18 IEP',  scaling: '3D6 + WIS',          special: null },
      { level: 3,      cost: '24 IEP',  scaling: '4D6 + WIS',          special: null },
      { level: 4,      cost: '36 IEP',  scaling: '4D6 + WIS',          special: null },
      { level: 5,      cost: '48 IEP',  scaling: '5D8 + WIS',          special: null },
      { level: 6,      cost: '60 IEP',  scaling: '5D8 + WIS',          special: null },
      { level: 7,      cost: '72 IEP',  scaling: '6D8 + WIS',          special: null },
      { level: 8,      cost: '84 IEP',  scaling: '6D8 + WIS',          special: null },
      { level: 9,      cost: '96 IEP',  scaling: '7D10 + WIS',         special: null },
      { level: 'divino', cost: '108 IEP', scaling: '8D10 + (1D10 × WIS)', special: null },
    ],
    /** Per-level cleanse values are embedded in the scaling column for this spell */
    specialDescriptions: {
      'Nível Divino': '1D10 multiplicador de Wisdom.',
    },
    category: 'Cura',
    types: ['cura', 'single'],
    notes: 'Aumenta a cura por nível. Cada nível também melhora a remoção de efeitos negativos.',
  },
]

/** Lookup map for O(1) access by id */
export const SPELLS_MAP: Record<string, Spell> = Object.fromEntries(
  SPELLS.map((spell) => [spell.id, spell]),
)
