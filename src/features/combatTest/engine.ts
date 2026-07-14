import { calculateAttributeModifiers, calculateEffectiveDerivedStats } from '../../config/gameConfig'
import { ARMOR_PRESETS, WEAPON_PRESETS, type EquipmentPreset } from '../../data/equipment'
import { getBookSpells, type BookSpell } from '../../lib/bookImport'
import { calculateEquipmentDefense } from '../../lib/equipmentRules'
import {
  MASTERY_BONUS,
  type AttributeName,
  type Attributes,
  type Character,
  type CustomSpell,
  type InventoryItem,
  type MasteryLevel,
  type SpellLevel,
} from '../../types/game'
import type {
  BalanceFinding,
  CombatSkill,
  CombatLogEntry,
  DamageModel,
  DefensePolicy,
  GenericProfileConfig,
  ResultComparison,
  SideAggregate,
  SimAction,
  SimCombatant,
  SimulationConfig,
  SimulationResult,
} from './types'

const ATTR_CODES: Record<string, AttributeName> = {
  MIG: 'might',
  GRA: 'grace',
  WIS: 'wisdom',
  SEN: 'sense',
  FOR: 'fortitude',
}

const ZERO_ATTRIBUTES: Attributes = { might: 0, grace: 0, wisdom: 0, sense: 0, fortitude: 0 }

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value))
}

function slug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function createRng(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function rollDie(sides: number, rng: () => number) {
  return Math.floor(rng() * sides) + 1
}

function dicePool(attribute: number) {
  if (attribute <= 0) return 0
  return clamp(Math.ceil(attribute / 5), 1, 5)
}

function rollAttribute(attribute: number, rng: () => number) {
  if (attribute <= 0) {
    const dice = [rollDie(20, rng), rollDie(20, rng)]
    return { natural: Math.min(...dice), dice }
  }
  const dice = Array.from({ length: dicePool(attribute) }, () => rollDie(20, rng))
  return { natural: Math.max(...dice), dice }
}

function averageMaxD20(pool: number) {
  if (pool <= 0) return 7.175
  let total = 0
  for (let value = 1; value <= 20; value += 1) {
    total += 1 - ((value - 1) / 20) ** pool
  }
  return total
}

function successChance(attribute: number, bonus: number, target: number, threat: number) {
  if (attribute <= 0) {
    let successes = 0
    for (let first = 1; first <= 20; first += 1) {
      for (let second = 1; second <= 20; second += 1) {
        const natural = Math.min(first, second)
        if (natural !== 1 && (natural >= threat || natural + bonus >= target)) successes += 1
      }
    }
    return successes / 400
  }
  const pool = dicePool(attribute)
  const needed = clamp(target - bonus, 2, 21)
  const successThreshold = Math.min(needed, threat)
  return 1 - ((successThreshold - 1) / 20) ** pool
}

function criticalChance(attribute: number, threat: number) {
  if (attribute <= 0) return ((21 - threat) / 20) ** 2
  return 1 - ((threat - 1) / 20) ** dicePool(attribute)
}

export function parseDamageModel(expression: string, attributes: Attributes): DamageModel | null {
  const source = expression.split('/')[0].replace(/×/g, '*').replace(/\s+/g, ' ').trim()
  const terms = [...source.matchAll(/(\d+)\s*D(\d+)(?:\s*\*\s*(MIG|GRA|WIS|SEN|FOR))?/gi)].map((match) => ({
    count: Number(match[1]),
    sides: Number(match[2]),
    multiplier: match[3] ? attributes[ATTR_CODES[match[3].toUpperCase()]] : 1,
  }))

  let flat = 0
  for (const match of source.matchAll(/MOD\s+de\s+(MIG|GRA|WIS|SEN|FOR)/gi)) {
    const attribute = ATTR_CODES[match[1].toUpperCase()]
    flat += calculateAttributeModifiers(attributes)[attribute]
  }
  const withoutMod = source.replace(/MOD\s+de\s+(MIG|GRA|WIS|SEN|FOR)/gi, '')
  for (const match of withoutMod.matchAll(/(?:^|\+)\s*(MIG|GRA|WIS|SEN|FOR)(?=\s|$|\))/gi)) {
    flat += attributes[ATTR_CODES[match[1].toUpperCase()]]
  }
  if (terms.length === 0 && flat === 0) return null
  return { terms, flat, source: expression }
}

function averageDamage(model: DamageModel, includeFlat = true) {
  return model.terms.reduce((sum, term) => sum + term.count * ((term.sides + 1) / 2) * term.multiplier, 0)
    + (includeFlat ? model.flat : 0)
}

function rollDamage(model: DamageModel, rng: () => number, includeFlat = true, multiplier = 1) {
  let total = 0
  for (const term of model.terms) {
    for (let index = 0; index < term.count; index += 1) total += rollDie(term.sides, rng) * term.multiplier
  }
  return total * multiplier + (includeFlat ? model.flat : 0)
}

function parseCost(value: string) {
  return Number(value.match(/\d+/)?.[0] ?? 0)
}

function spellLevelAllowed(level: SpellLevel, divinity: number) {
  if (level === 'divino') return divinity >= 100
  return level <= clamp(Math.floor(divinity / 10), 0, 9)
}

function spellLooksOffensive(spell: Pick<CustomSpell, 'category' | 'types'>) {
  const category = spell.category.toLowerCase()
  if (category.includes('dano') || category.includes('ataque')) return true
  return !spell.types.some((type) => ['cura', 'buff', 'utilidade', 'defesa'].includes(type))
}

function spellActions(spells: CustomSpell[], attributes: Attributes, divinity: number) {
  const actions: SimAction[] = []
  for (const spell of spells) {
    if (!spellLooksOffensive(spell)) continue
    for (const level of spell.levels) {
      if (!spellLevelAllowed(level.level, divinity)) continue
      const damage = parseDamageModel(level.scaling, attributes)
      if (!damage || damage.terms.length === 0) continue
      actions.push({
        id: `spell-${slug(spell.name)}-${level.level}`,
        name: `${spell.name}, nível ${level.level === 'divino' ? 'Divino' : level.level}`,
        kind: 'spell',
        attackAttribute: 'wisdom',
        combatSkill: 'arcanismo',
        resource: 'iep',
        cost: parseCost(level.cost),
        damage,
        threat: 20,
        criticalMultiplier: 2,
        strikes: 1,
        firstStrikeAddsFlatOnly: true,
        extraStrikesCanCrit: true,
        extraStrikesTriggerOnHit: true,
        notes: ['Área tratada como um alvo no duelo.', 'Efeitos de controle e terreno não foram convertidos em dano.'],
      })
    }
  }
  return actions
}

function weaponToAction(item: Pick<InventoryItem, 'id' | 'name' | 'description' | 'weaponDetails'>, attributes: Attributes): SimAction | null {
  const details = item.weaponDetails
  if (!details || details.damage.length === 0) return null
  const primary = details.scaling[0]?.attribute ?? 'might'
  const modifiers = calculateAttributeModifiers(attributes)
  const damage: DamageModel = {
    source: item.description,
    terms: details.damage.map((die) => ({ count: die.count, sides: die.die, multiplier: 1 })),
    flat: details.scaling.reduce((sum, scaling) => sum + modifiers[scaling.attribute] * scaling.multiplier, 0),
  }
  const isPair = /gême[ao]s/i.test(item.name)
  const isKnuckles = item.name.toLowerCase().includes('soqueira')
  const strikes = isKnuckles ? 1 + Math.floor(modifiers.grace / 5) : isPair ? 2 : 1
  const isWand = item.name.toLowerCase().includes('varinha')
  const catalogCombatSkill = WEAPON_PRESETS.find((preset) => preset.name === item.name)?.weaponDetails?.combatSkill
  const requirements = parseRequirementText(item.description)
  const missesRequirement = Object.entries(requirements)
    .some(([attribute, value]) => attributes[attribute as AttributeName] < value)
  return {
    id: `weapon-${item.id || slug(item.name)}`,
    name: item.name,
    kind: 'weapon',
    attackAttribute: primary,
    combatSkill: details.combatSkill ?? catalogCombatSkill ?? (primary === 'wisdom' ? 'arcanismo' : primary === 'grace' ? 'pontaria' : 'luta'),
    resource: null,
    cost: 0,
    damage,
    threat: details.critical?.rangeMin ?? 20,
    criticalMultiplier: details.critical?.multiplier ?? 2,
    strikes,
    firstStrikeAddsFlatOnly: true,
    extraStrikesCanCrit: !isKnuckles,
    extraStrikesTriggerOnHit: !isKnuckles,
    accuracyPenalty: missesRequirement ? -10 : 0,
    restoreIepOnLivingHit: isWand ? 4 : undefined,
    notes: [
      ...(isKnuckles ? [`${strikes - 1} ataques extras de Soqueiras, apenas 1D6.`] : []),
      ...(isPair ? ['Perfil de Empunhadura Dupla, MOD somente no primeiro ataque.'] : []),
      ...(isWand ? ['Recuperação da Varinha limitada a uma ativação por alvo por rodada.'] : []),
      ...(missesRequirement ? ['Requisitos não atendidos: −10 em todas as rolagens com a arma.'] : []),
    ],
  }
}

function techniqueActions(character: Character) {
  return character.characterAttacks.flatMap<SimAction>((attack) => {
    if (!attack.damage) return []
    const damage = parseDamageModel(attack.damage, character.attributes)
    if (!damage) return []
    return [{
      id: `technique-${attack.id}`,
      name: attack.name,
      kind: 'technique',
      attackAttribute: attack.category === 'ranged' ? 'grace' : 'might',
      combatSkill: attack.category === 'ranged' ? 'pontaria' : 'luta',
      resource: 'pc',
      cost: parseCost(attack.cost),
      damage,
      threat: 20,
      criticalMultiplier: 2,
      strikes: 1,
      firstStrikeAddsFlatOnly: true,
      extraStrikesCanCrit: true,
      extraStrikesTriggerOnHit: true,
      notes: ['Somente o campo estruturado de dano foi simulado.'],
    }]
  })
}

function unarmedAction(attributes: Attributes): SimAction {
  return {
    id: 'unarmed', name: 'Ataque desarmado', kind: 'weapon', attackAttribute: 'might', combatSkill: 'luta', resource: null, cost: 0,
    damage: { terms: [{ count: 1, sides: 4, multiplier: 1 }], flat: calculateAttributeModifiers(attributes).might, source: '1D4 + MOD de MIG' },
    threat: 20, criticalMultiplier: 2, strikes: 1, firstStrikeAddsFlatOnly: true, extraStrikesCanCrit: true,
    extraStrikesTriggerOnHit: true, notes: ['Fallback quando nenhuma arma válida foi encontrada.'],
  }
}

export function maximumCombatMastery(divinity: number): MasteryLevel {
  if (divinity >= 40) return 4
  if (divinity >= 30) return 3
  if (divinity >= 20) return 2
  return 1
}

function maximumCombatSkillBonuses(divinity: number): Record<CombatSkill, number> {
  const bonus = MASTERY_BONUS[maximumCombatMastery(divinity)]
  return { luta: bonus, pontaria: bonus, arcanismo: bonus }
}

function parseRequirementText(description: string) {
  const requirementText = description.match(/Requisito:\s*([^.]*)\./i)?.[1] ?? ''
  const requirements: Partial<Record<AttributeName, number>> = {}
  for (const match of requirementText.matchAll(/(MIG|GRA|WIS|SEN|FOR)\s*(\d+)/gi)) {
    requirements[ATTR_CODES[match[1].toUpperCase()]] = Number(match[2])
  }
  return requirements
}

export function buildSavedCombatant(character: Character, policy: DefensePolicy = 'optimal'): SimCombatant {
  const derived = calculateEffectiveDerivedStats(character)
  const defense = calculateEquipmentDefense(character.inventory, character.attributes)
  const weapons = character.inventory
    .filter((item) => item.type === 'weapon' && item.equipped && !item.broken)
    .map((item) => weaponToAction(item, character.attributes))
    .filter((action): action is SimAction => Boolean(action))
  const actions = [...weapons, ...spellActions(character.customSpells, character.attributes, character.divinity), ...techniqueActions(character)]
  if (actions.length === 0) actions.push(unarmedAction(character.attributes))
  const warnings: string[] = []
  if (character.characterAttacks.some((attack) => !attack.damage)) warnings.push('Habilidades sem campo estruturado de dano foram ignoradas.')
  if (character.customSpells.length > 0 && !actions.some((action) => action.kind === 'spell')) warnings.push('Nenhuma magia ofensiva com dano legível estava disponível no nível simulado.')
  return {
    id: character.id,
    name: character.name || 'Ficha sem nome',
    sourceLabel: 'Ficha V0',
    attributes: { ...character.attributes },
    maxHp: derived.vida,
    maxIep: derived.iep,
    maxPc: derived.pc,
    resistance: derived.resistencia,
    dodge: derived.esquiva,
    blockValue: defense.blockValue,
    damageReduction: 0,
    defensePolicy: policy,
    combatSkillBonuses: maximumCombatSkillBonuses(character.divinity),
    actions,
    warnings,
  }
}

function parsePresetRequirements(preset: EquipmentPreset) {
  return parseRequirementText(preset.description)
}

function armorRequirements(armor?: EquipmentPreset) {
  const requirement = armor?.armorDetails?.requirement
  return requirement ? { [requirement.attribute]: requirement.value } as Partial<Record<AttributeName, number>> : {}
}

function focusedAttributes(config: GenericProfileConfig, weapon?: EquipmentPreset, armor?: EquipmentPreset) {
  const total = 5 * (clamp(config.divinity, 0, 100) + 1)
  const attributes: Attributes = { ...ZERO_ATTRIBUTES }
  const requirements: Partial<Record<AttributeName, number>> = {
    ...(weapon ? parsePresetRequirements(weapon) : { wisdom: 3, sense: 2 }),
  }
  for (const [attribute, value] of Object.entries(armorRequirements(armor)) as [AttributeName, number][]) {
    requirements[attribute] = Math.max(requirements[attribute] ?? 0, value)
  }
  let spent = 0
  for (const [attribute, value] of Object.entries(requirements) as [AttributeName, number][]) {
    const allocation = Math.min(value, total - spent)
    attributes[attribute] = allocation
    spent += allocation
  }
  const primary = config.focus === 'spell' ? 'wisdom' : weapon?.weaponDetails?.scaling[0]?.attribute ?? 'might'
  const priorities: AttributeName[] = config.defenseStyle === 'evasion'
    ? [primary, 'grace', 'grace', primary, 'fortitude', 'sense']
    : config.defenseStyle === 'block'
      ? [primary, 'fortitude', 'might', 'fortitude', primary, 'sense']
      : [primary, 'fortitude', 'grace', primary, 'fortitude', 'sense']
  let priorityIndex = 0
  while (spent < total) {
    const attribute = priorities[priorityIndex % priorities.length]
    attributes[attribute] += 1
    spent += 1
    priorityIndex += 1
  }
  return attributes
}

function bookSpellToCustom(spell: BookSpell): CustomSpell {
  return {
    id: spell.id,
    name: spell.name,
    elements: spell.elements,
    description: spell.description,
    levels: spell.levels,
    specialDescriptions: spell.specialDescriptions,
    category: spell.category,
    types: spell.types,
    notes: spell.notes,
  }
}

export function buildGenericCombatant(config: GenericProfileConfig, policy: DefensePolicy = 'optimal'): SimCombatant {
  const weapon = WEAPON_PRESETS.find((entry) => slug(entry.name) === config.optionId)
  const spell = getBookSpells().find((entry) => entry.id === config.optionId)
  const armor = ARMOR_PRESETS.find((entry) => slug(entry.name) === config.armorId)
  const attributes = focusedAttributes(config, weapon, armor)
  const armorRequirement = armor?.armorDetails?.requirement
  const armorIsValid = !armorRequirement || attributes[armorRequirement.attribute] >= armorRequirement.value
  const armorDodgeModifier = armorIsValid && armor
    ? armor.effects.filter((effect) => effect.type === 'statBonus' && effect.stat === 'esquiva').reduce((sum, effect) => sum + (effect.value ?? 0), 0)
    : 0
  const derived = {
    maxHp: 10 + 5 * attributes.fortitude,
    maxIep: 10 + 5 * attributes.wisdom,
    maxPc: 2 + attributes.might + attributes.grace,
    resistance: 5 + Math.floor(attributes.fortitude / 8),
    dodge: 5 + Math.floor(attributes.grace / 7) + armorDodgeModifier,
  }
  const actions: SimAction[] = []
  if (config.focus === 'weapon' && weapon) {
    const action = weaponToAction({ ...weapon, id: slug(weapon.name) }, attributes)
    if (action) actions.push(action)
  }
  if (config.focus === 'spell' && spell) actions.push(...spellActions([bookSpellToCustom(spell)], attributes, config.divinity))
  if (actions.length === 0) actions.push(unarmedAction(attributes))
  const requirementWarnings: string[] = []
  if (weapon) {
    const missing = Object.entries(parsePresetRequirements(weapon))
      .filter(([attribute, value]) => attributes[attribute as AttributeName] < value)
    if (missing.length > 0) requirementWarnings.push('O orçamento automático não cumpriu todos os requisitos da arma; a penalidade de -10 foi aplicada à precisão esperada.')
  }
  if (armor && !armorIsValid) requirementWarnings.push(`${armor.name} está equipada, mas não concede VB nem efeitos positivos porque o requisito não foi atendido.`)
  if (armor?.description.includes('RD')) requirementWarnings.push('A RD específica da armadura não foi aplicada porque o simulador ainda não classifica o tipo de dano de cada ataque.')
  const blockValue = armorIsValid ? (armor?.armorDetails?.blockValue ?? 0) : 0
  return {
    id: `generic-${slug(config.name)}-${config.focus}-${config.optionId}`,
    name: config.name,
    sourceLabel: `Genérico ${config.focus === 'weapon' ? 'marcial' : 'mágico'}, DIV ${config.divinity}`,
    attributes,
    ...derived,
    blockValue,
    damageReduction: 0,
    defensePolicy: policy,
    combatSkillBonuses: maximumCombatSkillBonuses(config.divinity),
    actions,
    warnings: requirementWarnings,
  }
}

function inventoryItemFromPreset(preset: EquipmentPreset): InventoryItem {
  return {
    ...preset,
    id: crypto.randomUUID(),
    quantity: 1,
    equipped: true,
    broken: false,
    effects: preset.effects.map((effect) => ({ ...effect })),
    weaponDetails: preset.weaponDetails ? {
      ...preset.weaponDetails,
      damage: preset.weaponDetails.damage.map((die) => ({ ...die })),
      scaling: preset.weaponDetails.scaling.map((scaling) => ({ ...scaling })),
      critical: preset.weaponDetails.critical ? { ...preset.weaponDetails.critical } : undefined,
    } : undefined,
    armorDetails: preset.armorDetails ? { ...preset.armorDetails, requirement: preset.armorDetails.requirement ? { ...preset.armorDetails.requirement } : undefined } : undefined,
  }
}

export function createCharacterFromGeneric(config: GenericProfileConfig, profile: SimCombatant): Character {
  const weapon = WEAPON_PRESETS.find((entry) => slug(entry.name) === config.optionId)
  const armor = ARMOR_PRESETS.find((entry) => slug(entry.name) === config.armorId)
  const spell = getBookSpells().find((entry) => entry.id === config.optionId)
  const combatSkill = config.focus === 'spell' ? 'arcanismo' : weapon?.weaponDetails?.combatSkill ?? 'luta'
  const combatMastery = maximumCombatMastery(config.divinity)
  const inventory = [config.focus === 'weapon' ? weapon : undefined, armor]
    .filter((item): item is EquipmentPreset => Boolean(item))
    .map(inventoryItemFromPreset)
  return {
    id: crypto.randomUUID(),
    name: config.name || 'Combatente genérico',
    playerName: '',
    race: '',
    level: clamp(Math.floor(config.divinity), 0, 100),
    divinity: clamp(Math.floor(config.divinity), 0, 100),
    attributes: { ...profile.attributes },
    acquiredTalents: [],
    customSpells: config.focus === 'spell' && spell ? [bookSpellToCustom(spell)] : [],
    characterAttacks: [],
    inventory,
    skills: { [combatSkill]: combatMastery },
    currentResources: { vida: profile.maxHp, iep: profile.maxIep, pc: profile.maxPc },
    temporaryResources: { vida: 0, iep: 0 },
    shortRestsUsed: 0,
    money: { platina: 0, ouro: 0, prata: 0, bronze: 0 },
    notes: `Perfil criado pelo Laboratório de Combate. Foco: ${config.focus === 'weapon' ? 'arma' : 'magia'}. Defesa: ${config.defenseStyle}.`,
    avatarPosition: '50% 50%',
    avatarScale: 1,
  }
}

interface RuntimeSide {
  profile: SimCombatant
  hp: number
  iep: number
  pc: number
  reaction: boolean
  damage: number
}

function actionAffordable(action: SimAction, side: RuntimeSide) {
  if (action.resource === 'iep') return side.iep >= action.cost
  if (action.resource === 'pc') return side.pc >= action.cost
  return true
}

function expectedActionDamage(action: SimAction, actor: SimCombatant, target: SimCombatant, targetHasReaction: boolean) {
  const attribute = actor.attributes[action.attackAttribute]
  const bonus = actor.combatSkillBonuses[action.combatSkill] + (action.accuracyPenalty ?? 0)
  const normalTarget = target.resistance
  const dodgeTarget = Math.max(target.resistance, target.dodge)
  const base = averageDamage(action.damage)
  const extraBase = averageDamage(action.damage, false)
  const critical = criticalChance(attribute, action.threat)
  const expectedStrike = (index: number, defense: number) => {
    const hit = successChance(attribute, bonus, defense, action.threat)
    const strikeBase = index === 0 || !action.firstStrikeAddsFlatOnly ? base : extraBase
    const critBonus = index === 0 || action.extraStrikesCanCrit ? critical * (action.criticalMultiplier - 1) * extraBase : 0
    return hit * strikeBase + critBonus
  }
  const withoutReaction = Array.from({ length: action.strikes }, (_, index) => expectedStrike(index, normalTarget)).reduce((a, b) => a + b, 0)
  if (!targetHasReaction || target.defensePolicy === 'none') return Math.max(0, withoutReaction - target.damageReduction * action.strikes)
  const withDodge = Array.from({ length: action.strikes }, (_, index) => expectedStrike(index, index === 0 ? dodgeTarget : normalTarget)).reduce((a, b) => a + b, 0)
  const firstStrike = expectedStrike(0, normalTarget)
  const remainingStrikes = Array.from({ length: Math.max(0, action.strikes - 1) }, (_, index) => expectedStrike(index + 1, normalTarget)).reduce((a, b) => a + b, 0)
  const withBlock = Math.max(0, Math.max(0, firstStrike - target.blockValue) + remainingStrikes - target.damageReduction * action.strikes)
  if (target.defensePolicy === 'dodge') return withDodge
  if (target.defensePolicy === 'block') return withBlock
  return Math.min(withDodge, withBlock)
}

function chooseAction(side: RuntimeSide, target: RuntimeSide) {
  const candidates = side.profile.actions.filter((action) => actionAffordable(action, side))
  return candidates.sort((left, right) =>
    expectedActionDamage(right, side.profile, target.profile, target.reaction)
    - expectedActionDamage(left, side.profile, target.profile, target.reaction))[0] ?? unarmedAction(side.profile.attributes)
}

function chooseDefense(action: SimAction, actor: SimCombatant, target: SimCombatant) {
  if (target.defensePolicy !== 'optimal') return target.defensePolicy
  const noReactionTarget = { ...target, defensePolicy: 'none' as const }
  const dodgeTarget = { ...target, defensePolicy: 'dodge' as const }
  const blockTarget = { ...target, defensePolicy: 'block' as const }
  const dodgeDamage = expectedActionDamage(action, actor, dodgeTarget, true)
  const blockDamage = expectedActionDamage(action, actor, blockTarget, true)
  const noReactionDamage = expectedActionDamage(action, actor, noReactionTarget, false)
  if (target.blockValue <= 0 && target.dodge <= target.resistance) return 'none'
  if (Math.min(dodgeDamage, blockDamage) >= noReactionDamage) return 'none'
  return dodgeDamage <= blockDamage ? 'dodge' : 'block'
}

function spendActionResource(action: SimAction, side: RuntimeSide, aggregate: SideAggregate) {
  if (action.resource === 'iep') {
    side.iep -= action.cost
    aggregate.iepSpent += action.cost
  } else if (action.resource === 'pc') {
    side.pc -= action.cost
    aggregate.pcSpent += action.cost
  }
}

function getActionUsage(aggregate: SideAggregate, action: SimAction) {
  aggregate.actionUsage[action.id] ??= { id: action.id, name: action.name, uses: 0, attacks: 0, hits: 0, criticals: 0, damage: 0, resourceSpent: 0 }
  return aggregate.actionUsage[action.id]
}

function executeTurn(
  round: number,
  actor: RuntimeSide,
  target: RuntimeSide,
  aggregate: SideAggregate,
  rng: () => number,
  log?: CombatLogEntry[],
) {
  const action = chooseAction(actor, target)
  spendActionResource(action, actor, aggregate)
  const usage = getActionUsage(aggregate, action)
  usage.uses += 1
  usage.resourceSpent += action.cost
  aggregate.totalTurns += 1
  const defense = target.reaction ? chooseDefense(action, actor.profile, target.profile) : 'none'
  if (defense !== 'none') target.reaction = false
  for (let strike = 0; strike < action.strikes && target.hp > 0; strike += 1) {
    aggregate.attacks += 1
    usage.attacks += 1
    const attribute = actor.profile.attributes[action.attackAttribute]
    const roll = rollAttribute(attribute, rng)
    const bonus = actor.profile.combatSkillBonuses[action.combatSkill] + (action.accuracyPenalty ?? 0)
    const critical = roll.natural >= action.threat && (strike === 0 || action.extraStrikesCanCrit)
    const defenseTarget = defense === 'dodge' && strike === 0 && !critical ? Math.max(target.profile.resistance, target.profile.dodge) : target.profile.resistance
    const hit = critical || (roll.natural !== 1 && roll.natural + bonus >= defenseTarget)
    let rawDamage = 0
    let blocked = 0
    let finalDamage = 0
    if (hit) {
      aggregate.hits += 1
      usage.hits += 1
      if (critical) {
        aggregate.criticals += 1
        usage.criticals += 1
      }
      rawDamage = rollDamage(action.damage, rng, strike === 0 || !action.firstStrikeAddsFlatOnly, critical ? action.criticalMultiplier : 1)
      blocked = defense === 'block' && strike === 0 ? Math.min(target.profile.blockValue, rawDamage) : 0
      finalDamage = Math.max(0, rawDamage - blocked - target.profile.damageReduction)
      target.hp -= finalDamage
      actor.damage += finalDamage
      aggregate.totalDamage += finalDamage
      usage.damage += finalDamage
      if (action.restoreIepOnLivingHit && finalDamage > 0) {
        const restored = Math.min(rollDie(action.restoreIepOnLivingHit, rng), actor.profile.maxIep - actor.iep)
        actor.iep += restored
        aggregate.iepRestored += restored
      }
    }
    log?.push({
      round,
      actor: actor.profile.name,
      action: strike > 0 ? `${action.name}, ataque ${strike + 1}` : action.name,
      attackRoll: roll.natural + bonus,
      defense: defense === 'none' ? `Resistência ${defenseTarget}` : `${defense === 'dodge' ? 'Esquiva' : 'Bloqueio'} ${defense === 'dodge' ? defenseTarget : target.profile.blockValue}`,
      hit,
      critical,
      rawDamage,
      blocked,
      finalDamage,
      targetHp: Math.max(0, target.hp),
      resourceText: action.resource ? `${action.cost} ${action.resource.toUpperCase()}` : undefined,
    })
  }
}

function initiative(profile: SimCombatant, rng: () => number) {
  return rollAttribute(profile.attributes.grace, rng).natural
}

function createAggregate(profile: SimCombatant): SideAggregate {
  return {
    id: profile.id, name: profile.name, wins: 0, totalDamage: 0, totalTurns: 0, attacks: 0, hits: 0, criticals: 0,
    iepSpent: 0, iepRestored: 0, pcSpent: 0, overkill: 0, remainingHpOnWins: 0, actionUsage: {}, runDamage: [],
  }
}

export function runSimulation(profileA: SimCombatant, profileB: SimCombatant, requested: SimulationConfig): SimulationResult {
  const config = { ...requested, runs: clamp(Math.round(requested.runs), 100, 10_000), maxRounds: clamp(Math.round(requested.maxRounds), 1, 50) }
  const rng = createRng(config.seed)
  const sideA = createAggregate(profileA)
  const sideB = createAggregate(profileB)
  const rounds: number[] = []
  let draws = 0
  let totalRounds = 0
  let sampleLog: CombatLogEntry[] = []

  for (let run = 0; run < config.runs; run += 1) {
    const a: RuntimeSide = { profile: profileA, hp: profileA.maxHp, iep: profileA.maxIep, pc: profileA.maxPc, reaction: true, damage: 0 }
    const b: RuntimeSide = { profile: profileB, hp: profileB.maxHp, iep: profileB.maxIep, pc: profileB.maxPc, reaction: true, damage: 0 }
    const log = run === 0 ? [] as CombatLogEntry[] : undefined
    const initiativeA = initiative(profileA, rng)
    const initiativeB = initiative(profileB, rng)
    const order = initiativeA > initiativeB || (initiativeA === initiativeB && profileA.attributes.grace >= profileB.attributes.grace) ? [a, b] : [b, a]
    let completedRound = config.maxRounds
    for (let round = 1; round <= config.maxRounds; round += 1) {
      a.reaction = true
      b.reaction = true
      for (const actor of order) {
        const target = actor === a ? b : a
        if (actor.hp <= 0 || target.hp <= 0) continue
        executeTurn(round, actor, target, actor === a ? sideA : sideB, rng, log)
      }
      if (a.hp <= 0 || b.hp <= 0) {
        completedRound = round
        break
      }
    }
    rounds.push(completedRound)
    totalRounds += completedRound
    sideA.runDamage.push(a.damage)
    sideB.runDamage.push(b.damage)
    if (a.hp > 0 && b.hp <= 0) {
      sideA.wins += 1
      sideA.remainingHpOnWins += a.hp
      sideA.overkill += Math.max(0, -b.hp)
    } else if (b.hp > 0 && a.hp <= 0) {
      sideB.wins += 1
      sideB.remainingHpOnWins += b.hp
      sideB.overkill += Math.max(0, -a.hp)
    } else {
      draws += 1
    }
    if (log) sampleLog = log
  }

  const warnings = [
    'Acerto: maior d20 da reserva + Luta, Pontaria ou Arcanismo. O uso da Resistência como valor-alvo ainda é provisório.',
    'Toda ficha usa automaticamente a maior Maestria de combate liberada pela DIV: +5 em DIV 0, +10 em DIV 20, +15 em DIV 30 e +20 em DIV 40.',
    'Crítico dobra somente os dados base; MOD e valores fixos não dobram.',
    'A defesa automática escolhe entre uma Esquiva ou um Bloqueio por rodada.',
    'Controle, terreno, cura, múltiplos alvos, concentração e propriedades não estruturadas não entram no dano.',
    ...profileA.warnings.map((warning) => `${profileA.name}: ${warning}`),
    ...profileB.warnings.map((warning) => `${profileB.name}: ${warning}`),
  ]
  return { config, createdAt: new Date().toISOString(), runs: config.runs, draws, averageRounds: totalRounds / config.runs, rounds, sideA, sideB, sampleLog, warnings }
}

export function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * percentileValue))]
}

export function sideMetrics(side: SideAggregate, result: SimulationResult) {
  const winRate = side.wins / result.runs
  const dpr = side.totalDamage / Math.max(1, side.totalTurns)
  const hitRate = side.hits / Math.max(1, side.attacks)
  const critRate = side.criticals / Math.max(1, side.attacks)
  const standardError = Math.sqrt((winRate * (1 - winRate)) / result.runs)
  return {
    winRate,
    winRateLow: Math.max(0, winRate - 1.96 * standardError),
    winRateHigh: Math.min(1, winRate + 1.96 * standardError),
    dpr,
    hitRate,
    critRate,
    averageDamage: side.totalDamage / result.runs,
    averageRemainingHp: side.remainingHpOnWins / Math.max(1, side.wins),
    p10Damage: percentile(side.runDamage, 0.1),
    medianDamage: percentile(side.runDamage, 0.5),
    p90Damage: percentile(side.runDamage, 0.9),
  }
}

export function analyzeResult(result: SimulationResult): BalanceFinding[] {
  const a = sideMetrics(result.sideA, result)
  const b = sideMetrics(result.sideB, result)
  const winGap = Math.abs(a.winRate - b.winRate)
  const dprGap = Math.abs(a.dpr - b.dpr) / Math.max(0.01, Math.min(a.dpr, b.dpr))
  const findings: BalanceFinding[] = []
  if (winGap <= 0.1) findings.push({ tone: 'positive', title: 'Confronto competitivo', detail: 'A diferença de vitórias ficou em até 10 pontos percentuais.' })
  else if (winGap <= 0.3) findings.push({ tone: 'warning', title: 'Vantagem perceptível', detail: 'A diferença de vitórias exige conferir alcance, custo e função antes de aceitar.' })
  else findings.push({ tone: 'negative', title: 'Dominância provável', detail: 'Um perfil venceu mais de 65% dos confrontos resolvidos.' })
  if (dprGap > 0.25) findings.push({ tone: 'negative', title: 'Eficiência ofensiva acima do alerta', detail: `A diferença de dano por turno foi ${(dprGap * 100).toFixed(1)}%, acima do limite provisório de 25%.` })
  else if (dprGap > 0.15) findings.push({ tone: 'warning', title: 'Diferença ofensiva exige nicho', detail: `A diferença de dano por turno foi ${(dprGap * 100).toFixed(1)}%.` })
  else findings.push({ tone: 'positive', title: 'Dano por turno próximo', detail: 'A diferença ofensiva ficou dentro de 15%.' })
  if (result.averageRounds < 2) findings.push({ tone: 'negative', title: 'Explosão letal', detail: 'A luta média termina antes de duas rodadas; iniciativa tende a decidir o resultado.' })
  if (result.averageRounds > result.config.maxRounds * 0.8 || result.draws / result.runs > 0.15) findings.push({ tone: 'warning', title: 'Atrito excessivo', detail: 'Muitas lutas chegaram perto do limite ou terminaram empatadas.' })
  if (a.critRate > 0.55 || b.critRate > 0.55) findings.push({ tone: 'warning', title: 'Crítico muito frequente', detail: 'Pelo menos um perfil superou 55% de críticos por ataque.' })
  if (findings.length === 0) findings.push({ tone: 'neutral', title: 'Sem alerta automático', detail: 'A interpretação final ainda depende das premissas e do propósito das opções.' })
  return findings
}

export function compareResults(baseline: SimulationResult, current: SimulationResult): ResultComparison {
  const baselineA = sideMetrics(baseline.sideA, baseline)
  const baselineB = sideMetrics(baseline.sideB, baseline)
  const currentA = sideMetrics(current.sideA, current)
  const currentB = sideMetrics(current.sideB, current)
  const winRateDeltaA = currentA.winRate - baselineA.winRate
  const dprDeltaA = currentA.dpr - baselineA.dpr
  const dprDeltaB = currentB.dpr - baselineB.dpr
  const roundsDelta = current.averageRounds - baseline.averageRounds
  const findings: BalanceFinding[] = []
  const movedTowardHalf = Math.abs(currentA.winRate - 0.5) < Math.abs(baselineA.winRate - 0.5)
  findings.push({
    tone: movedTowardHalf ? 'positive' : 'negative',
    title: movedTowardHalf ? 'Mudança aproximou o confronto' : 'Mudança ampliou a dominância',
    detail: `A taxa de vitória do lado A mudou ${(winRateDeltaA * 100).toFixed(1)} pontos percentuais.`,
  })
  if (Math.abs(roundsDelta) > 1) findings.push({ tone: 'warning', title: 'Duração alterada', detail: `A duração média mudou ${roundsDelta.toFixed(2)} rodadas.` })
  return { winRateDeltaA, dprDeltaA, dprDeltaB, roundsDelta, findings }
}

export const COMBAT_TEST_WEAPONS = WEAPON_PRESETS.map((weapon) => ({ id: slug(weapon.name), label: weapon.name }))
export const COMBAT_TEST_ARMORS = [
  { id: '', label: 'Sem armadura' },
  ...ARMOR_PRESETS.map((armor) => ({ id: slug(armor.name), label: `${armor.name}, VB ${armor.armorDetails?.blockValue ?? 0}` })),
]
export const COMBAT_TEST_SPELLS = getBookSpells()
  .filter((spell) => spellLooksOffensive(bookSpellToCustom(spell)) && spell.levels.some((level) => /\d+D\d+/i.test(level.scaling)))
  .map((spell) => ({ id: spell.id, label: spell.name }))

export function averageInitiative(profile: SimCombatant) {
  return averageMaxD20(dicePool(profile.attributes.grace))
}
