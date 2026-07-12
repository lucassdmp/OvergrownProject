import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type {
  Character,
  Attributes,
  CustomSpell,
  CharacterAttack,
  InventoryItem,
  MasteryLevel,
} from '../../../types/game'
import { calculateDerivedStats, calculateEffectiveDerivedStats, defaultGameConfig, type GameConfig } from '../../../config/gameConfig'
import { conflictingEquipmentIds } from '../../../lib/equipmentRules'

// ── Constants ─────────────────────────────────────────────────────────────────

export const BASE_ATTRIBUTE_POINTS = 5
export const POINTS_PER_DIVINITY = 5

export function totalAttributePoints(divinity: number) {
  return BASE_ATTRIBUTE_POINTS + divinity * POINTS_PER_DIVINITY
}

export function spentAttributePoints(attrs: Attributes) {
  return attrs.might + attrs.grace + attrs.wisdom + attrs.sense + attrs.fortitude
}

export function remainingAttributePoints(attrs: Attributes, divinity: number) {
  return totalAttributePoints(divinity) - spentAttributePoints(attrs)
}

// ── Default character ─────────────────────────────────────────────────────────

const DEFAULT_ATTRIBUTES: Attributes = {
  might: 0,
  grace: 0,
  wisdom: 0,
  sense: 0,
  fortitude: 0,
}

const DEFAULT_MONEY = { platina: 0, ouro: 0, prata: 0, bronze: 0 }

/** Accepts the old single-number `money` format and the new per-currency object. */
function normalizeMoney(money: unknown): Character['money'] {
  if (typeof money === 'number') {
    return { ...DEFAULT_MONEY, ouro: money }
  }
  if (money && typeof money === 'object') {
    return { ...DEFAULT_MONEY, ...(money as Partial<Character['money']>) }
  }
  return { ...DEFAULT_MONEY }
}

const DEFAULT_CHARACTER: Character = {
  id: crypto.randomUUID(),
  name: 'Novo Personagem',
  playerName: '',
  race: '',
  level: 0,
  divinity: 0,
  attributes: DEFAULT_ATTRIBUTES,
  acquiredTalents: [],
  customSpells: [],
  characterAttacks: [],
  inventory: [],
  skills: {},
  notes: '',
  avatarPosition: '50% 50%',
  avatarScale: 1,
  money: { ...DEFAULT_MONEY },
  currentResources: {
    vida: calculateDerivedStats(DEFAULT_ATTRIBUTES).vida,
    iep: calculateDerivedStats(DEFAULT_ATTRIBUTES).iep,
    pc: calculateDerivedStats(DEFAULT_ATTRIBUTES).pc,
  },
  temporaryResources: { vida: 0, iep: 0 },
  shortRestsUsed: 0,
}

// ── Store shape ───────────────────────────────────────────────────────────────

interface CharacterState {
  characters: Record<string, Character>
  character: Character
  gameConfig: GameConfig

  createNewCharacter: () => void
  switchCharacter: (id: string) => void
  deleteCharacter: (id: string) => void

  setCharacterName: (name: string) => void
  setPlayerName: (name: string) => void
  setAvatarBase64: (base64: string) => void
  setAvatarPosition: (position: string) => void
  setAvatarScale: (scale: number) => void
  setRace: (race: string) => void
  setLevel: (level: number) => void
  setDivinity: (divinity: number) => void
  setAttribute: (attr: keyof Attributes, value: number) => void

  setMoney: (currency: keyof Character['money'], amount: number) => void
  setCurrentVida: (value: number) => void
  setCurrentIep: (value: number) => void
  setCurrentPc: (value: number) => void
  setNotes: (notes: string) => void
  restoreAllResources: () => void
  applyShortRest: (recovery: { vida: number; iep: number; pc: number }) => void
  applyFullRest: (temporary: { vida: number; iep: number }) => void

  acquireTalent: (talentId: string) => void
  removeTalent: (talentId: string) => void

  addSpell: (spell: CustomSpell) => void
  removeSpell: (id: string) => void
  updateSpell: (spell: CustomSpell) => void

  addAttack: (attack: CharacterAttack) => void
  removeAttack: (id: string) => void
  updateAttack: (attack: CharacterAttack) => void

  addItem: (item: InventoryItem) => void
  removeItem: (id: string) => void
  updateItem: (item: InventoryItem) => void
  updateItemQuantity: (id: string, delta: number) => void
  toggleEquipped: (id: string) => void
  toggleBroken: (id: string) => void
  useItem: (id: string) => void
  useItemWithValues: (id: string, values: { vida?: number; iep?: number }) => void

  importSpells: (spells: CustomSpell[]) => void
  importAttacks: (attacks: CharacterAttack[]) => void

  setSkillMastery: (skillId: string, mastery: MasteryLevel) => void
  setOrigin: (originId: string) => void

  loadCharacter: (character: Partial<Character>) => void
  resetCharacter: () => void
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useCharacterStore = create<CharacterState>()(
  devtools(
    persist(
      (rawSet, get) => {
        // Intercept set to sync the active character into the characters registry
        const set: typeof rawSet = (updater, replace, action) => {
          rawSet((state) => {
            const nextState = typeof updater === 'function' ? updater(state) : updater
            if (nextState && nextState.character) {
              const newChar = nextState.character
              
              // If the action explicitly updates 'characters' (like deleteCharacter does),
              // use the new characters map as the base, otherwise use current state's map
              const baseCharacters = nextState.characters !== undefined 
                ? nextState.characters 
                : (state.characters || {})

              return {
                ...nextState,
                characters: {
                  ...baseCharacters,
                  [newChar.id]: newChar,
                },
              } as Partial<CharacterState>
            }
            return nextState as Partial<CharacterState>
          }, replace as false, action as string)
        }

        return {
        characters: { [DEFAULT_CHARACTER.id]: DEFAULT_CHARACTER },
        character: DEFAULT_CHARACTER,
        gameConfig: defaultGameConfig,

        createNewCharacter: () => {
          const newChar = { ...DEFAULT_CHARACTER, id: crypto.randomUUID() }
          set((s) => ({
            character: newChar,
            characters: { ...(s.characters || {}), [newChar.id]: newChar },
          }), false, 'createNewCharacter')
        },

        switchCharacter: (id) => {
          set((s) => {
            const char = (s.characters || {})[id]
            return char ? { character: char } : {}
          }, false, 'switchCharacter')
        },

        deleteCharacter: (id) => {
          set((s) => {
            const chars = { ...(s.characters || {}) }
            delete chars[id]
            const remainingIds = Object.keys(chars)
            // If deleting the active char, pick the first available or create a new one
            let nextChar = s.character
            if (s.character.id === id) {
              if (remainingIds.length > 0) {
                nextChar = chars[remainingIds[0]]
              } else {
                nextChar = { ...DEFAULT_CHARACTER, id: crypto.randomUUID() }
                chars[nextChar.id] = nextChar
              }
            }
            return {
              characters: chars,
              character: nextChar,
            }
          }, false, 'deleteCharacter')
        },

        setCharacterName: (name) =>
          set((s) => ({ character: { ...s.character, name } }), false, 'setCharacterName'),

        setPlayerName: (playerName) =>
          set((s) => ({ character: { ...s.character, playerName } }), false, 'setPlayerName'),

        setAvatarBase64: (avatarBase64) =>
          set((s) => ({ character: { ...s.character, avatarBase64 } }), false, 'setAvatarBase64'),

        setAvatarPosition: (avatarPosition) =>
          set((s) => ({ character: { ...s.character, avatarPosition } }), false, 'setAvatarPosition'),

        setAvatarScale: (avatarScale) =>
          set((s) => ({ character: { ...s.character, avatarScale } }), false, 'setAvatarScale'),

        setRace: (race) =>
          set((s) => ({ character: { ...s.character, race } }), false, 'setRace'),

        setLevel: (level) =>
          set((s) => {
            const normalized = Math.max(0, Math.min(100, Math.floor(level)))
            return { character: { ...s.character, level: normalized, divinity: normalized } }
          }, false, 'setLevel'),

        setDivinity: (divinity) =>
          set((s) => {
            const normalized = Math.max(0, Math.min(100, Math.floor(divinity)))
            return { character: { ...s.character, divinity: normalized, level: normalized } }
          }, false, 'setDivinity'),

        setAttribute: (attr, value) =>
          set((s) => {
            const newAttrs = { ...s.character.attributes, [attr]: Math.max(0, value) }
            const newChar = { ...s.character, attributes: newAttrs }
            const derived = calculateEffectiveDerivedStats(newChar, s.gameConfig)
            return {
              character: {
                ...newChar,
                currentResources: {
                  vida: Math.min(s.character.currentResources.vida, derived.vida),
                  iep: Math.min(s.character.currentResources.iep, derived.iep),
                  pc: Math.min(s.character.currentResources.pc, derived.pc),
                },
              },
            }
          }, false, 'setAttribute'),

        setCurrentVida: (value) =>
          set((s) => ({
            character: { ...s.character, currentResources: { ...s.character.currentResources, vida: value } },
          }), false, 'setCurrentVida'),

        setCurrentIep: (value) =>
          set((s) => ({
            character: { ...s.character, currentResources: { ...s.character.currentResources, iep: value } },
          }), false, 'setCurrentIep'),

        setCurrentPc: (value) =>
          set((s) => ({
            character: { ...s.character, currentResources: { ...s.character.currentResources, pc: value } },
          }), false, 'setCurrentPc'),

        setMoney: (currency, amount) =>
          set((s) => ({
            character: { ...s.character, money: { ...s.character.money, [currency]: Math.max(0, amount) } },
          }), false, 'setMoney'),

        setNotes: (notes) =>
          set((s) => ({
            character: { ...s.character, notes },
          }), false, 'setNotes'),

        restoreAllResources: () =>
          set((s) => {
            const derived = calculateEffectiveDerivedStats(s.character, s.gameConfig)
            return {
              character: {
                ...s.character,
                currentResources: { vida: derived.vida, iep: derived.iep, pc: derived.pc },
              },
            }
          }, false, 'restoreAllResources'),

        applyShortRest: (recovery) =>
          set((s) => {
            if (s.character.shortRestsUsed >= 2) return {}
            const derived = calculateEffectiveDerivedStats(s.character, s.gameConfig)
            return {
              character: {
                ...s.character,
                shortRestsUsed: s.character.shortRestsUsed + 1,
                currentResources: {
                  vida: Math.min(derived.vida, s.character.currentResources.vida + Math.max(0, recovery.vida)),
                  iep: Math.min(derived.iep, s.character.currentResources.iep + Math.max(0, recovery.iep)),
                  pc: Math.min(derived.pc, s.character.currentResources.pc + Math.max(0, recovery.pc)),
                },
              },
            }
          }, false, 'applyShortRest'),

        applyFullRest: (temporary) =>
          set((s) => {
            const derived = calculateEffectiveDerivedStats(s.character, s.gameConfig)
            return {
              character: {
                ...s.character,
                shortRestsUsed: 0,
                currentResources: { vida: derived.vida, iep: derived.iep, pc: derived.pc },
                temporaryResources: {
                  vida: Math.max(0, temporary.vida),
                  iep: Math.max(0, temporary.iep),
                },
              },
            }
          }, false, 'applyFullRest'),

        acquireTalent: (talentId) =>
          set((s) => ({
            character: {
              ...s.character,
              acquiredTalents: s.character.acquiredTalents.includes(talentId)
                ? s.character.acquiredTalents
                : [...s.character.acquiredTalents, talentId],
            },
          }), false, 'acquireTalent'),

        removeTalent: (talentId) =>
          set((s) => ({
            character: {
              ...s.character,
              acquiredTalents: s.character.acquiredTalents.filter((id) => id !== talentId),
            },
          }), false, 'removeTalent'),

        addSpell: (spell) =>
          set((s) => ({
            character: { ...s.character, customSpells: [...(s.character.customSpells ?? []), spell] },
          }), false, 'addSpell'),

        removeSpell: (id) =>
          set((s) => ({
            character: {
              ...s.character,
              customSpells: (s.character.customSpells ?? []).filter((sp) => sp.id !== id),
            },
          }), false, 'removeSpell'),

        updateSpell: (spell) =>
          set((s) => ({
            character: {
              ...s.character,
              customSpells: (s.character.customSpells ?? []).map((sp) => (sp.id === spell.id ? spell : sp)),
            },
          }), false, 'updateSpell'),

        addAttack: (attack) =>
          set((s) => ({
            character: { ...s.character, characterAttacks: [...(s.character.characterAttacks ?? []), attack] },
          }), false, 'addAttack'),

        removeAttack: (id) =>
          set((s) => ({
            character: {
              ...s.character,
              characterAttacks: (s.character.characterAttacks ?? []).filter((a) => a.id !== id),
            },
          }), false, 'removeAttack'),

        updateAttack: (attack) =>
          set((s) => ({
            character: {
              ...s.character,
              characterAttacks: (s.character.characterAttacks ?? []).map((a) => (a.id === attack.id ? attack : a)),
            },
          }), false, 'updateAttack'),

        addItem: (item) =>
          set((s) => ({
            character: { ...s.character, inventory: [...(s.character.inventory ?? []), item] },
          }), false, 'addItem'),

        removeItem: (id) =>
          set((s) => ({
            character: {
              ...s.character,
              inventory: (s.character.inventory ?? []).filter((it) => it.id !== id),
            },
          }), false, 'removeItem'),

        updateItem: (item) =>
          set((s) => ({
            character: {
              ...s.character,
              inventory: (s.character.inventory ?? []).map((it) => (it.id === item.id ? item : it)),
            },
          }), false, 'updateItem'),

        updateItemQuantity: (id, delta) =>
          set((s) => ({
            character: {
              ...s.character,
              inventory: (s.character.inventory ?? []).map((it) =>
                it.id === id ? { ...it, quantity: Math.max(0, it.quantity + delta) } : it,
              ),
            },
          }), false, 'updateItemQuantity'),

        toggleEquipped: (id) =>
          set((s) => {
            const target = (s.character.inventory ?? []).find((item) => item.id === id)
            if (!target) return {}
            const equipping = !target.equipped
            const conflicts = equipping ? new Set(conflictingEquipmentIds(s.character.inventory ?? [], target)) : new Set<string>()
            return {
              character: {
                ...s.character,
                inventory: (s.character.inventory ?? []).map((item) => {
                  if (item.id === id) return { ...item, equipped: equipping }
                  if (conflicts.has(item.id)) return { ...item, equipped: false }
                  return item
                }),
              },
            }
          }, false, 'toggleEquipped'),

        toggleBroken: (id) =>
          set((s) => ({
            character: {
              ...s.character,
              inventory: (s.character.inventory ?? []).map((it) =>
                it.id === id ? { ...it, broken: !it.broken } : it,
              ),
            },
          }), false, 'toggleBroken'),

        useItem: (id) => {
          const { character, gameConfig } = get()
          const item = (character.inventory ?? []).find((it) => it.id === id)
          if (!item || item.quantity <= 0) return
          const derived = calculateEffectiveDerivedStats(character, gameConfig)
          let { vida, iep } = character.currentResources
          const { pc } = character.currentResources
          for (const effect of item.effects) {
            if (effect.type === 'heal' && effect.value != null)
              vida = Math.min(vida + effect.value, derived.vida)
            if (effect.type === 'restoreIep' && effect.value != null)
              iep = Math.min(iep + effect.value, derived.iep)
          }
          set((s) => ({
            character: {
              ...s.character,
              currentResources: { vida, iep, pc },
              inventory: (s.character.inventory ?? []).map((it) =>
                it.id === id ? { ...it, quantity: it.quantity - 1 } : it,
              ),
            },
          }), false, 'useItem')
        },

        useItemWithValues: (id, values) => {
          const { character, gameConfig } = get()
          const item = (character.inventory ?? []).find((it) => it.id === id)
          if (!item || item.quantity <= 0) return
          const derived = calculateEffectiveDerivedStats(character, gameConfig)
          const vida = values.vida != null
            ? Math.min(character.currentResources.vida + values.vida, derived.vida)
            : character.currentResources.vida
          const iep = values.iep != null
            ? Math.min(character.currentResources.iep + values.iep, derived.iep)
            : character.currentResources.iep
          set((s) => ({
            character: {
              ...s.character,
              currentResources: { ...s.character.currentResources, vida, iep },
              inventory: (s.character.inventory ?? []).map((it) =>
                it.id === id ? { ...it, quantity: it.quantity - 1 } : it,
              ),
            },
          }), false, 'useItemWithValues')
        },

        importSpells: (spells) =>
          set((s) => ({
            character: {
              ...s.character,
              customSpells: [
                ...(s.character.customSpells ?? []),
                ...spells.map((sp) => ({ ...sp, id: crypto.randomUUID() })),
              ],
            },
          }), false, 'importSpells'),

        importAttacks: (attacks) =>
          set((s) => ({
            character: {
              ...s.character,
              characterAttacks: [
                ...(s.character.characterAttacks ?? []),
                ...attacks.map((a) => ({ ...a, id: crypto.randomUUID() })),
              ],
            },
          }), false, 'importAttacks'),

        setSkillMastery: (skillId, mastery) =>
          set((s) => ({
            character: {
              ...s.character,
              skills: { ...(s.character.skills ?? {}), [skillId]: mastery },
            },
          }), false, 'setSkillMastery'),

        setOrigin: (originId) =>
          set((s) => ({
            character: { ...s.character, origin: originId || undefined },
          }), false, 'setOrigin'),

        loadCharacter: (loadedCharacter) =>
          set(() => ({
            character: {
              ...DEFAULT_CHARACTER,
              ...loadedCharacter,
              // Ensure array/object fields are at least empty if missing in loaded file
              customSpells: loadedCharacter.customSpells ?? [],
              characterAttacks: loadedCharacter.characterAttacks ?? [],
              inventory: loadedCharacter.inventory ?? [],
              acquiredTalents: loadedCharacter.acquiredTalents ?? [],
              skills: loadedCharacter.skills ?? {},
              attributes: { ...DEFAULT_CHARACTER.attributes, ...(loadedCharacter.attributes ?? {}) },
              currentResources: { ...DEFAULT_CHARACTER.currentResources, ...(loadedCharacter.currentResources ?? {}) },
              temporaryResources: { ...DEFAULT_CHARACTER.temporaryResources, ...(loadedCharacter.temporaryResources ?? {}) },
              shortRestsUsed: Math.max(0, Math.min(2, loadedCharacter.shortRestsUsed ?? 0)),
              avatarBase64: loadedCharacter.avatarBase64,
              avatarPosition: loadedCharacter.avatarPosition ?? DEFAULT_CHARACTER.avatarPosition,
              avatarScale: loadedCharacter.avatarScale ?? DEFAULT_CHARACTER.avatarScale,
              money: normalizeMoney(loadedCharacter.money),
            },
          }), false, 'loadCharacter'),

        resetCharacter: () =>
          set(() => ({
            character: { ...DEFAULT_CHARACTER, id: crypto.randomUUID() },
          }), false, 'resetCharacter'),
      }
    },
    {
      name: 'overgrown-character',
        version: 2,
        // Ensure old persisted characters missing new array fields don't break
        merge: (persisted, current) => {
          const ps = persisted as Partial<typeof current>
          if (!ps) return current
          
          const mergedCharacter = {
            ...DEFAULT_CHARACTER,
            ...(ps.character ?? {}),
            customSpells: ps.character?.customSpells ?? [],
            characterAttacks: ps.character?.characterAttacks ?? [],
            inventory: ps.character?.inventory ?? [],
            acquiredTalents: ps.character?.acquiredTalents ?? [],
            skills: ps.character?.skills ?? {},
            origin: ps.character?.origin,
            notes: ps.character?.notes ?? '',
            currentResources: ps.character?.currentResources ?? current.character.currentResources,
            temporaryResources: {
              ...DEFAULT_CHARACTER.temporaryResources,
              ...(ps.character?.temporaryResources ?? {}),
            },
            shortRestsUsed: Math.max(0, Math.min(2, ps.character?.shortRestsUsed ?? 0)),
            level: Math.max(0, Math.min(100, ps.character?.divinity ?? ps.character?.level ?? 0)),
            divinity: Math.max(0, Math.min(100, ps.character?.divinity ?? ps.character?.level ?? 0)),
            avatarBase64: ps.character?.avatarBase64,
            avatarPosition: ps.character?.avatarPosition ?? '50% 50%',
            avatarScale: ps.character?.avatarScale ?? 1.0,
            money: normalizeMoney(ps.character?.money),
          }

          const normalizePersistedCharacter = (saved: Partial<Character>): Character => {
            const divinity = Math.max(0, Math.min(100, saved.divinity ?? saved.level ?? 0))
            return {
              ...DEFAULT_CHARACTER,
              ...saved,
              level: divinity,
              divinity,
              customSpells: saved.customSpells ?? [],
              characterAttacks: saved.characterAttacks ?? [],
              inventory: saved.inventory ?? [],
              acquiredTalents: saved.acquiredTalents ?? [],
              skills: saved.skills ?? {},
              attributes: { ...DEFAULT_CHARACTER.attributes, ...(saved.attributes ?? {}) },
              currentResources: { ...DEFAULT_CHARACTER.currentResources, ...(saved.currentResources ?? {}) },
              temporaryResources: { ...DEFAULT_CHARACTER.temporaryResources, ...(saved.temporaryResources ?? {}) },
              shortRestsUsed: Math.max(0, Math.min(2, saved.shortRestsUsed ?? 0)),
              avatarPosition: saved.avatarPosition ?? DEFAULT_CHARACTER.avatarPosition,
              avatarScale: saved.avatarScale ?? DEFAULT_CHARACTER.avatarScale,
              money: normalizeMoney(saved.money),
            }
          }

          const mergedCharacters = Object.fromEntries(
            Object.entries(ps.characters ?? {}).map(([id, saved]) => [id, normalizePersistedCharacter(saved)]),
          )
          mergedCharacters[mergedCharacter.id] = normalizePersistedCharacter(mergedCharacter)
          
          return {
            ...current,
            ...ps,
            gameConfig: current.gameConfig,
            character: mergedCharacter,
            characters: mergedCharacters,
          }
        },
      },
    ),
    { name: 'CharacterStore' },
  ),
)
