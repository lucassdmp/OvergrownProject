import { ELEMENTS_MAP } from '../data/elements'
import { MAGIC_TYPES_MAP } from '../data/magicTypes'
import {
  COMBAT_CATEGORY_LABELS,
  SPELL_LEVEL_LABELS,
  type CombatCategory,
  type CombatSkill,
  type CharacterAttack,
  type CustomSpell,
  type ElementId,
  type MagicTypeId,
  type Spell,
  type SpellLevel,
  type SpellLevelEntry,
} from '../types/game'

const BOOK_SPELL_FILES = import.meta.glob('/Livro/Contents/magia/*.tex', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const BOOK_MELEE_FILES = import.meta.glob('/Livro/Contents/12-melee.tex', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const BOOK_RANGED_FILES = import.meta.glob('/Livro/Contents/13-ranged.tex', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const MELEE_START_MARKER = '{startmelee}'
const MELEE_END_MARKER = '{endmelee}'
const RANGED_START_MARKER = '{startranged}'
const RANGED_END_MARKER = '{endranged}'

const SPELL_LEVEL_MAP: Record<string, SpellLevel> = {
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  div: 'divino',
  divino: 'divino',
}

function getGlobValues(glob: Record<string, string>) {
  return Object.keys(glob)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => glob[key])
}

function extractBraceBlock(source: string, startIndex: number) {
  if (source[startIndex] !== '{') return null

  let depth = 0
  let value = ''

  for (let i = startIndex; i < source.length; i += 1) {
    const char = source[i]

    if (char === '{') {
      depth += 1
      if (depth > 1) value += char
      continue
    }

    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return { value, endIndex: i + 1 }
      }
      value += char
      continue
    }

    value += char
  }

  return null
}

function normalizeText(value: string) {
  return value.replace(/\r/g, '').trim()
}

function stripLatex(value: string): string {
  return value
    .replace(/\\link\{[^}]*\}\{([^}]*)\}/g, '$1')
    .replace(/\\textbf\{([^}]*)\}/g, '$1')
    .replace(/\\textit\{([^}]*)\}/g, '$1')
    .replace(/\\emph\{([^}]*)\}/g, '$1')
    .replace(/\\footnotesize\b/g, '')
    .replace(/\\par\b/g, ' ')
    .replace(/\\\\(?!\s*\\hline)/g, ' ')
    .replace(/\\\$/g, '$')
    .replace(/\\times\b/g, '×')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\{|\}/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function normalizeLookupKey(value: string) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function slugifyId(value: string) {
  const normalized = normalizeLookupKey(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || 'item'
}

function extractMarkedSection(raw: string, startMarker: string, endMarker: string) {
  const lower = raw.toLowerCase()
  const startIndex = lower.indexOf(startMarker.toLowerCase())
  if (startIndex === -1) return raw

  const contentStart = startIndex + startMarker.length
  const endIndex = lower.indexOf(endMarker.toLowerCase(), contentStart)
  if (endIndex === -1) return raw.slice(contentStart)
  return raw.slice(contentStart, endIndex)
}

export interface BookSpell {
  id: string
  name: string
  minLevel: string
  description: string
  levels: SpellLevelEntry[]
  specialDescriptions: Record<string, string>
  category: string
  elements: ElementId[]
  types: MagicTypeId[]
  notes?: string
}

function parseBookSpellCards(raw: string): BookSpell[] {
  const spells: BookSpell[] = []
  let cursor = 0

  while (cursor < raw.length) {
    const start = raw.indexOf('\\spellCard', cursor)
    if (start === -1) break

    let index = start + '\\spellCard'.length
    const args: string[] = []

    try {
      while (args.length < 8 && index < raw.length) {
        while (/\s/.test(raw[index] ?? '')) index += 1
        const block = extractBraceBlock(raw, index)
        if (!block) throw new Error('Bloco de magia do Overleaf inválido.')
        args.push(block.value)
        index = block.endIndex
      }

      if (args.length < 8) {
        throw new Error('Quantidade de argumentos insuficiente em \\spellCard.')
      }

      const [nameRaw, elementsRaw, minLevelRaw, descriptionRaw, levelsRaw, notesRaw, categoryRaw, typesRaw] = args
      const name = normalizeText(nameRaw)

      const elements = [...elementsRaw.matchAll(/\\elementTag\{([^}]+)\}/g)]
        .map((match) => normalizeText(match[1]))
        .map((label) => {
          const normalized = normalizeLookupKey(label)
          return Object.values(ELEMENTS_MAP).find((el) => {
            return normalizeLookupKey(el.label) === normalized || normalizeLookupKey(el.id) === normalized
          })?.id
        })
        .filter((id): id is ElementId => Boolean(id))

      const types = [...typesRaw.matchAll(/\\typeTag\{([^}]+)\}/g)]
        .map((match) => normalizeText(match[1]))
        .map((label) => {
          const normalized = normalizeLookupKey(label)
          return Object.values(MAGIC_TYPES_MAP).find((mt) => {
            return normalizeLookupKey(mt.label) === normalized || normalizeLookupKey(mt.id) === normalized
          })?.id
        })
        .filter((id): id is MagicTypeId => Boolean(id))

      const levels = levelsRaw
        .split('\\\\')
        .map((line) => line.replace(/\\hline/g, '').trim())
        .filter(Boolean)
        .map((line) => line.split('&').map((cell) => normalizeText(cell)))
        .filter((cells) => cells.length >= 4)
        .map((cells) => {
          const level = SPELL_LEVEL_MAP[cells[0].toLowerCase()]
          if (level == null) return null

          return {
            level,
            cost: cells[1],
            scaling: cells[2],
            special: cells.slice(3).join(' & ') || null,
          }
        })
        .filter((entry): entry is SpellLevelEntry => Boolean(entry))

      spells.push({
        id: slugifyId(name),
        name,
        minLevel: normalizeText(minLevelRaw),
        description: stripLatex(normalizeText(descriptionRaw)),
        notes: stripLatex(normalizeText(notesRaw)) || undefined,
        category: normalizeText(categoryRaw),
        elements,
        types,
        levels,
        specialDescriptions: {},
      })
      cursor = index
    } catch (err) {
      console.warn('[bookImport] Spell parse error', err)
      cursor = start + 1
    }
  }

  return spells
}

let cachedBookSpells: BookSpell[] | null = null

export function getBookSpells(): BookSpell[] {
  if (cachedBookSpells) return cachedBookSpells

  const spells: BookSpell[] = []
  for (const raw of getGlobValues(BOOK_SPELL_FILES)) {
    spells.push(...parseBookSpellCards(raw))
  }

  cachedBookSpells = spells
  return spells
}

export function bookSpellToCustomSpell(spell: BookSpell): CustomSpell {
  const notes: string[] = []
  if (spell.minLevel) notes.push(`Nível mínimo: ${spell.minLevel}`)
  if (spell.notes) notes.push(spell.notes)

  return {
    id: crypto.randomUUID(),
    name: spell.name,
    elements: [...spell.elements],
    description: spell.description,
    levels: spell.levels.map((entry) => ({ ...entry })),
    specialDescriptions: { ...spell.specialDescriptions },
    category: spell.category,
    types: [...spell.types],
    notes: notes.filter(Boolean).join('\n') || undefined,
  }
}

export function getBookCustomSpells(): CustomSpell[] {
  return getBookSpells().map((spell) => bookSpellToCustomSpell(spell))
}

export function parseOverleafSpellCards(raw: string): CustomSpell[] {
  return parseBookSpellCards(raw).map((spell) => bookSpellToCustomSpell(spell))
}

export function spellToCustomSpell(spell: Spell): CustomSpell {
  const notes: string[] = []
  const minLevelLabel = SPELL_LEVEL_LABELS[spell.minLevel]
  notes.push(`Nível mínimo: ${minLevelLabel}`)
  if (spell.notes) notes.push(spell.notes)

  return {
    id: crypto.randomUUID(),
    name: spell.name,
    elements: [...spell.elements],
    description: spell.description,
    levels: spell.levels.map((entry) => ({ ...entry })),
    specialDescriptions: { ...spell.specialDescriptions },
    category: spell.category,
    types: [...spell.types],
    notes: notes.filter(Boolean).join('\n') || undefined,
  }
}

export function combatSkillToAttack(skill: CombatSkill, categoryOverride?: CombatCategory): CharacterAttack {
  return {
    id: crypto.randomUUID(),
    name: skill.name,
    cost: skill.cost,
    description: skill.description,
    category: categoryOverride ?? skill.category,
    requirement: skill.requirement,
    action: skill.action,
    purpose: skill.purpose,
  }
}

function sliceCombatSection(raw: string, category: CombatCategory) {
  if (category === 'melee') {
    return extractMarkedSection(raw, MELEE_START_MARKER, MELEE_END_MARKER)
  }
  if (category === 'ranged') {
    return extractMarkedSection(raw, RANGED_START_MARKER, RANGED_END_MARKER)
  }
  return raw
}

function parseCombatSkillCards(raw: string, category: CombatCategory): CombatSkill[] {
  const skills: CombatSkill[] = []
  const sectionRaw = sliceCombatSection(raw, category)
  let cursor = 0

  while (cursor < sectionRaw.length) {
    const fullStart = sectionRaw.indexOf('\\combatSkillFull', cursor)
    const legacyStart = sectionRaw.indexOf('\\combatSkill{', cursor)
    const candidates = [fullStart, legacyStart].filter((value) => value >= 0)
    if (candidates.length === 0) break
    const start = Math.min(...candidates)
    const isFull = start === fullStart
    const macro = isFull ? '\\combatSkillFull' : '\\combatSkill'
    let index = start + macro.length
    const args: string[] = []
    const expectedArgs = isFull ? 6 : 3

    while (args.length < expectedArgs && index < sectionRaw.length) {
      while (/\s/.test(sectionRaw[index] ?? '')) index += 1
      const block = extractBraceBlock(sectionRaw, index)
      if (!block) throw new Error('Bloco de habilidade inválido no formato \\combatSkill.')
      args.push(block.value)
      index = block.endIndex
    }

    if (args.length < expectedArgs) {
      throw new Error(`Quantidade de argumentos insuficiente em ${macro}.`)
    }

    const [nameRaw, costRaw] = args
    const name = normalizeText(nameRaw)
    const requirementRaw = isFull ? args[2] : undefined
    const actionRaw = isFull ? args[3] : undefined
    const purposeRaw = isFull ? args[4] : undefined
    const effectRaw = isFull ? args[5] : args[2]

    skills.push({
      id: slugifyId(name),
      name,
      cost: normalizeText(costRaw),
      description: stripLatex(normalizeText(effectRaw)),
      category,
      requirement: requirementRaw ? stripLatex(normalizeText(requirementRaw)) : undefined,
      action: actionRaw ? stripLatex(normalizeText(actionRaw)) : undefined,
      purpose: purposeRaw ? stripLatex(normalizeText(purposeRaw)) : undefined,
      effect: stripLatex(normalizeText(effectRaw)),
    })

    cursor = index
  }

  return skills
}

let cachedBookCombatSkills: CombatSkill[] | null = null

export function getBookCombatSkills(): CombatSkill[] {
  if (cachedBookCombatSkills) return cachedBookCombatSkills

  const skills: CombatSkill[] = []
  const meleeRaw = getGlobValues(BOOK_MELEE_FILES)[0] ?? ''
  const rangedRaw = getGlobValues(BOOK_RANGED_FILES)[0] ?? ''

  if (meleeRaw) skills.push(...parseCombatSkillCards(meleeRaw, 'melee'))
  if (rangedRaw) skills.push(...parseCombatSkillCards(rangedRaw, 'ranged'))

  cachedBookCombatSkills = skills
  return skills
}

export function getBookCombatAttacks(): CharacterAttack[] {
  return getBookCombatSkills().map((skill) => combatSkillToAttack(skill))
}

export function parseCombatSkills(raw: string, category: CombatCategory): CharacterAttack[] {
  const skills = parseCombatSkillCards(raw, category)
  if (skills.length === 0) {
    throw new Error(`Nenhuma habilidade encontrada em ${COMBAT_CATEGORY_LABELS[category]}.`)
  }

  return skills.map((skill) => combatSkillToAttack(skill))
}
