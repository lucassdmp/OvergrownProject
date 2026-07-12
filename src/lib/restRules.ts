export type MealQuality = 'none' | 'basica' | 'simples' | 'mediana' | 'avancada' | 'mestre' | 'suprema'

export interface MealDefinition {
  id: MealQuality
  label: string
  difficulty?: number
  shortDie?: number
  fullDice?: { count: number; die: number }
}

export const MEAL_QUALITIES: MealDefinition[] = [
  { id: 'none', label: 'Sem refeição' },
  { id: 'basica', label: 'Básica', difficulty: 10, shortDie: 4, fullDice: { count: 1, die: 6 } },
  { id: 'simples', label: 'Simples', difficulty: 15, shortDie: 6, fullDice: { count: 1, die: 8 } },
  { id: 'mediana', label: 'Mediana', difficulty: 20, shortDie: 8, fullDice: { count: 1, die: 10 } },
  { id: 'avancada', label: 'Avançada', difficulty: 25, shortDie: 10, fullDice: { count: 1, die: 12 } },
  { id: 'mestre', label: 'Mestre', difficulty: 30, shortDie: 12, fullDice: { count: 1, die: 20 } },
  { id: 'suprema', label: 'Suprema', difficulty: 35, shortDie: 20, fullDice: { count: 2, die: 20 } },
]

export function rollDie(sides: number, random: () => number = Math.random) {
  return Math.floor(random() * sides) + 1
}

export function rollDice(count: number, sides: number, random: () => number = Math.random) {
  return Array.from({ length: Math.max(0, count) }, () => rollDie(sides, random))
}

export function sumRolls(rolls: number[]) {
  return rolls.reduce((sum, value) => sum + value, 0)
}

export function getMeal(id: MealQuality) {
  return MEAL_QUALITIES.find((meal) => meal.id === id) ?? MEAL_QUALITIES[0]
}
