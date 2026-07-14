import type { AttributeName, Attributes } from '../../types/game'

export type CombatActionKind = 'weapon' | 'spell' | 'technique'
export type CombatResource = 'iep' | 'pc' | null
export type DefensePolicy = 'optimal' | 'dodge' | 'block' | 'none'
export type CombatSkill = 'luta' | 'pontaria' | 'arcanismo'

export interface DamageTerm {
  count: number
  sides: number
  multiplier: number
}

export interface DamageModel {
  terms: DamageTerm[]
  flat: number
  source: string
}

export interface SimAction {
  id: string
  name: string
  kind: CombatActionKind
  attackAttribute: AttributeName
  combatSkill: CombatSkill
  resource: CombatResource
  cost: number
  damage: DamageModel
  threat: number
  criticalMultiplier: number
  strikes: number
  firstStrikeAddsFlatOnly: boolean
  extraStrikesCanCrit: boolean
  extraStrikesTriggerOnHit: boolean
  accuracyPenalty?: number
  restoreIepOnLivingHit?: number
  notes: string[]
}

export interface SimCombatant {
  id: string
  name: string
  sourceLabel: string
  attributes: Attributes
  maxHp: number
  maxIep: number
  maxPc: number
  resistance: number
  dodge: number
  blockValue: number
  damageReduction: number
  defensePolicy: DefensePolicy
  combatSkillBonuses: Record<CombatSkill, number>
  actions: SimAction[]
  warnings: string[]
}

export interface SimulationConfig {
  runs: number
  maxRounds: number
  seed: number
  criticalRule: 'double-base'
}

export interface ActionUsage {
  id: string
  name: string
  uses: number
  attacks: number
  hits: number
  criticals: number
  damage: number
  resourceSpent: number
}

export interface SideAggregate {
  id: string
  name: string
  wins: number
  totalDamage: number
  totalTurns: number
  attacks: number
  hits: number
  criticals: number
  iepSpent: number
  iepRestored: number
  pcSpent: number
  overkill: number
  remainingHpOnWins: number
  actionUsage: Record<string, ActionUsage>
  runDamage: number[]
}

export interface CombatLogEntry {
  round: number
  actor: string
  action: string
  attackRoll: number
  defense: string
  hit: boolean
  critical: boolean
  rawDamage: number
  blocked: number
  finalDamage: number
  targetHp: number
  resourceText?: string
}

export interface SimulationResult {
  config: SimulationConfig
  createdAt: string
  runs: number
  draws: number
  averageRounds: number
  rounds: number[]
  sideA: SideAggregate
  sideB: SideAggregate
  sampleLog: CombatLogEntry[]
  warnings: string[]
}

export interface BalanceFinding {
  tone: 'positive' | 'warning' | 'negative' | 'neutral'
  title: string
  detail: string
}

export interface ResultComparison {
  winRateDeltaA: number
  dprDeltaA: number
  dprDeltaB: number
  roundsDelta: number
  findings: BalanceFinding[]
}

export interface GenericProfileConfig {
  name: string
  divinity: number
  focus: 'weapon' | 'spell'
  optionId: string
  defenseStyle: 'balanced' | 'evasion' | 'block'
  armorId: string
}
