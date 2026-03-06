import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type {
  Character,
  Attributes,
  CustomSpell,
  CharacterAttack,
  InventoryItem,
} from '../../../types/game'
import { calculateDerivedStats, calculateEffectiveDerivedStats, defaultGameConfig, type GameConfig } from '../../../config/gameConfig'

// ── Constants ─────────────────────────────────────────────────────────────────

export const BASE_ATTRIBUTE_POINTS = 10
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
  might: 1,
  grace: 1,
  wisdom: 1,
  sense: 1,
  fortitude: 1,
}

const DEFAULT_CHARACTER: Character = {
  id: crypto.randomUUID(),
  name: 'Novo Personagem',
  playerName: '',
  race: '',
  level: 1,
  divinity: 1,
  attributes: DEFAULT_ATTRIBUTES,
  acquiredTalents: [],
  customSpells: [],
  characterAttacks: [],
  inventory: [],
  currentResources: {
    vida: calculateDerivedStats(DEFAULT_ATTRIBUTES).vida,
    iep: calculateDerivedStats(DEFAULT_ATTRIBUTES).iep,
    pc: calculateDerivedStats(DEFAULT_ATTRIBUTES).pc,
  },
}

// ── Store shape ───────────────────────────────────────────────────────────────

interface CharacterState {
  character: Character
  gameConfig: GameConfig

  setCharacterName: (name: string) => void
  setPlayerName: (name: string) => void
  setRace: (race: string) => void
  setLevel: (level: number) => void
  setDivinity: (divinity: number) => void
  setAttribute: (attr: keyof Attributes, value: number) => void

  setCurrentVida: (value: number) => void
  setCurrentIep: (value: number) => void
  setCurrentPc: (value: number) => void
  restoreAllResources: () => void

  acquireTalent: (talentId: string) => void
  removeTalent: (talentId: string) => void

  addSpell: (spell: CustomSpell) => void
  removeSpell: (id: string) => void
  updateSpell: (spell: CustomSpell) => void

  addAttack: (attack: CharacterAttack) => void
  removeAttack: (id: string) => void

  addItem: (item: InventoryItem) => void
  removeItem: (id: string) => void
  updateItemQuantity: (id: string, delta: number) => void
  useItem: (id: string) => void
  useItemWithValues: (id: string, values: { vida?: number; iep?: number }) => void

  loadCharacter: (character: Character) => void
  resetCharacter: () => void
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useCharacterStore = create<CharacterState>()(
  devtools(
    persist(
      (set, get) => ({
        character: DEFAULT_CHARACTER,
        gameConfig: defaultGameConfig,

        setCharacterName: (name) =>
          set((s) => ({ character: { ...s.character, name } }), false, 'setCharacterName'),

        setPlayerName: (playerName) =>
          set((s) => ({ character: { ...s.character, playerName } }), false, 'setPlayerName'),

        setRace: (race) =>
          set((s) => ({ character: { ...s.character, race } }), false, 'setRace'),

        setLevel: (level) =>
          set((s) => ({ character: { ...s.character, level } }), false, 'setLevel'),

        setDivinity: (divinity) =>
          set((s) => ({ character: { ...s.character, divinity: Math.max(0, divinity) } }), false, 'setDivinity'),

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

        updateItemQuantity: (id, delta) =>
          set((s) => ({
            character: {
              ...s.character,
              inventory: (s.character.inventory ?? []).map((it) =>
                it.id === id ? { ...it, quantity: Math.max(0, it.quantity + delta) } : it,
              ),
            },
          }), false, 'updateItemQuantity'),

        useItem: (id) => {
          const { character, gameConfig } = get()
          const item = (character.inventory ?? []).find((it) => it.id === id)
          if (!item || item.quantity <= 0) return
          const derived = calculateEffectiveDerivedStats(character, gameConfig)
          let { vida, iep, pc } = character.currentResources
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

        loadCharacter: (character) =>
          set(() => ({ character }), false, 'loadCharacter'),

        resetCharacter: () =>
          set(() => ({
            character: { ...DEFAULT_CHARACTER, id: crypto.randomUUID() },
          }), false, 'resetCharacter'),
      }),
      {
        name: 'overgrown-character',
        // Ensure old persisted characters missing new array fields don't break
        merge: (persisted, current) => {
          const ps = persisted as Partial<typeof current>
          if (!ps) return current
          return {
            ...current,
            ...ps,
            character: {
              ...DEFAULT_CHARACTER,
              ...(ps.character ?? {}),
              customSpells: ps.character?.customSpells ?? [],
              characterAttacks: ps.character?.characterAttacks ?? [],
              inventory: ps.character?.inventory ?? [],
              acquiredTalents: ps.character?.acquiredTalents ?? [],
              currentResources: ps.character?.currentResources ?? current.character.currentResources,
            },
          }
        },
      },
    ),
    { name: 'CharacterStore' },
  ),
)
