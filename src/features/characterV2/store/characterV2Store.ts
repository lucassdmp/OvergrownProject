// ─────────────────────────────────────────────────────────────────────────────
// OverGrown V2 – Character Store
// Attributes, spells, and attacks all come from the talent tree.
// This store tracks only what the player controls directly.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { MasteryLevel } from '../../../types/game'
import type { CharacterV2, InventoryItemV2 } from '../../../types/gameV2'

// ── Default character ─────────────────────────────────────────────────────────

const DEFAULT_MONEY = { platina: 0, ouro: 0, prata: 0, bronze: 0 }

const DEFAULT_CHARACTER_V2: CharacterV2 = {
  id: crypto.randomUUID(),
  name: 'Novo Personagem',
  race: '',
  origin: undefined,
  divinity: 1,
  avatarBase64: undefined,
  avatarPosition: '50% 50%',
  avatarScale: 1,
  connectedTreeId: undefined,
  acquiredNodeIds: [],
  skills: {},
  inventory: [],
  notes: '',
  money: { ...DEFAULT_MONEY },
  currentResources: { vida: 10, iep: 10, pc: 2 },
}

// ── Store shape ───────────────────────────────────────────────────────────────

interface CharacterV2State {
  characters: Record<string, CharacterV2>
  character: CharacterV2

  createNewCharacter: () => void
  switchCharacter: (id: string) => void
  deleteCharacter: (id: string) => void

  setCharacterName: (name: string) => void
  setRace: (race: string) => void
  setDivinity: (divinity: number) => void
  setOrigin: (originId: string) => void
  setAvatarBase64: (base64: string) => void
  setAvatarPosition: (position: string) => void
  setAvatarScale: (scale: number) => void

  setConnectedTreeId: (treeId: string | undefined) => void
  acquireNode: (nodeId: string) => void
  removeNode: (nodeId: string) => void
  setAcquiredNodes: (nodeIds: string[]) => void

  setMoney: (currency: keyof CharacterV2['money'], amount: number) => void
  setCurrentVida: (value: number) => void
  setCurrentIep: (value: number) => void
  setCurrentPc: (value: number) => void
  restoreAllResources: (maxVida: number, maxIep: number, maxPc: number) => void
  setNotes: (notes: string) => void

  setSkillMastery: (skillId: string, mastery: MasteryLevel) => void

  addItem: (item: InventoryItemV2) => void
  removeItem: (id: string) => void
  updateItem: (item: InventoryItemV2) => void
  updateItemQuantity: (id: string, delta: number) => void
  toggleEquipped: (id: string) => void
  toggleBroken: (id: string) => void
  useItem: (id: string, values: { vida?: number; iep?: number }) => void

  loadCharacter: (character: Partial<CharacterV2>) => void
  resetCharacter: () => void
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useCharacterV2Store = create<CharacterV2State>()(
  devtools(
    persist(
      (rawSet, get) => {
        const set: typeof rawSet = (updater, replace, action) => {
          rawSet((state) => {
            const nextState = typeof updater === 'function' ? updater(state) : updater
            if (nextState && nextState.character) {
              const newChar = nextState.character
              const baseCharacters =
                nextState.characters !== undefined ? nextState.characters : state.characters || {}
              return {
                ...nextState,
                characters: { ...baseCharacters, [newChar.id]: newChar },
              } as Partial<CharacterV2State>
            }
            return nextState as Partial<CharacterV2State>
          }, replace as false, action as never)
        }

        return {
          characters: { [DEFAULT_CHARACTER_V2.id]: DEFAULT_CHARACTER_V2 },
          character: DEFAULT_CHARACTER_V2,

          createNewCharacter: () => {
            const newChar: CharacterV2 = { ...DEFAULT_CHARACTER_V2, id: crypto.randomUUID() }
            set(
              (s) => ({ character: newChar, characters: { ...(s.characters || {}), [newChar.id]: newChar } }),
              false,
              'createNewCharacter',
            )
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
              let nextChar = s.character
              if (s.character.id === id) {
                if (remainingIds.length > 0) {
                  nextChar = chars[remainingIds[0]]
                } else {
                  nextChar = { ...DEFAULT_CHARACTER_V2, id: crypto.randomUUID() }
                  chars[nextChar.id] = nextChar
                }
              }
              return { characters: chars, character: nextChar }
            }, false, 'deleteCharacter')
          },

          setCharacterName: (name) =>
            set((s) => ({ character: { ...s.character, name } }), false, 'setCharacterName'),

          setRace: (race) =>
            set((s) => ({ character: { ...s.character, race } }), false, 'setRace'),

          setDivinity: (divinity) =>
            set((s) => ({ character: { ...s.character, divinity: Math.max(1, divinity) } }), false, 'setDivinity'),

          setOrigin: (originId) =>
            set((s) => ({ character: { ...s.character, origin: originId || undefined } }), false, 'setOrigin'),

          setAvatarBase64: (avatarBase64) =>
            set((s) => ({ character: { ...s.character, avatarBase64 } }), false, 'setAvatarBase64'),

          setAvatarPosition: (avatarPosition) =>
            set((s) => ({ character: { ...s.character, avatarPosition } }), false, 'setAvatarPosition'),

          setAvatarScale: (avatarScale) =>
            set((s) => ({ character: { ...s.character, avatarScale } }), false, 'setAvatarScale'),

          setConnectedTreeId: (connectedTreeId) =>
            set((s) => ({ character: { ...s.character, connectedTreeId } }), false, 'setConnectedTreeId'),

          acquireNode: (nodeId) =>
            set((s) => ({
              character: {
                ...s.character,
                acquiredNodeIds: s.character.acquiredNodeIds.includes(nodeId)
                  ? s.character.acquiredNodeIds
                  : [...s.character.acquiredNodeIds, nodeId],
              },
            }), false, 'acquireNode'),

          removeNode: (nodeId) =>
            set((s) => ({
              character: {
                ...s.character,
                acquiredNodeIds: s.character.acquiredNodeIds.filter((id) => id !== nodeId),
              },
            }), false, 'removeNode'),

          setAcquiredNodes: (nodeIds) =>
            set((s) => ({ character: { ...s.character, acquiredNodeIds: nodeIds } }), false, 'setAcquiredNodes'),

          setMoney: (currency, amount) =>
            set((s) => ({
              character: { ...s.character, money: { ...s.character.money, [currency]: Math.max(0, amount) } },
            }), false, 'setMoney'),

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

          restoreAllResources: (maxVida, maxIep, maxPc) =>
            set((s) => ({
              character: { ...s.character, currentResources: { vida: maxVida, iep: maxIep, pc: maxPc } },
            }), false, 'restoreAllResources'),

          setNotes: (notes) =>
            set((s) => ({ character: { ...s.character, notes } }), false, 'setNotes'),

          setSkillMastery: (skillId, mastery) =>
            set((s) => ({
              character: { ...s.character, skills: { ...(s.character.skills ?? {}), [skillId]: mastery } },
            }), false, 'setSkillMastery'),

          addItem: (item) =>
            set((s) => ({
              character: { ...s.character, inventory: [...(s.character.inventory ?? []), item] },
            }), false, 'addItem'),

          removeItem: (id) =>
            set((s) => ({
              character: { ...s.character, inventory: (s.character.inventory ?? []).filter((it) => it.id !== id) },
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
            set((s) => ({
              character: {
                ...s.character,
                inventory: (s.character.inventory ?? []).map((it) =>
                  it.id === id ? { ...it, equipped: !it.equipped } : it,
                ),
              },
            }), false, 'toggleEquipped'),

          toggleBroken: (id) =>
            set((s) => ({
              character: {
                ...s.character,
                inventory: (s.character.inventory ?? []).map((it) =>
                  it.id === id ? { ...it, broken: !it.broken } : it,
                ),
              },
            }), false, 'toggleBroken'),

          useItem: (id, values) => {
            const { character } = get()
            const item = (character.inventory ?? []).find((it) => it.id === id)
            if (!item || item.quantity <= 0) return
            const newVida = values.vida != null
              ? character.currentResources.vida + values.vida
              : character.currentResources.vida
            const newIep = values.iep != null
              ? character.currentResources.iep + values.iep
              : character.currentResources.iep
            set((s) => ({
              character: {
                ...s.character,
                currentResources: { ...s.character.currentResources, vida: newVida, iep: newIep },
                inventory: (s.character.inventory ?? []).map((it) =>
                  it.id === id ? { ...it, quantity: it.quantity - 1 } : it,
                ),
              },
            }), false, 'useItem')
          },

          loadCharacter: (loaded) =>
            set(() => ({
              character: {
                ...DEFAULT_CHARACTER_V2,
                ...loaded,
                acquiredNodeIds: loaded.acquiredNodeIds ?? [],
                skills: loaded.skills ?? {},
                inventory: loaded.inventory ?? [],
                money: loaded.money ?? { ...DEFAULT_MONEY },
                currentResources: loaded.currentResources ?? DEFAULT_CHARACTER_V2.currentResources,
                avatarBase64: loaded.avatarBase64,
                avatarPosition: loaded.avatarPosition ?? '50% 50%',
                avatarScale: loaded.avatarScale ?? 1,
              },
            }), false, 'loadCharacter'),

          resetCharacter: () =>
            set(() => ({ character: { ...DEFAULT_CHARACTER_V2, id: crypto.randomUUID() } }), false, 'resetCharacter'),
        }
      },
      {
        name: 'overgrown-character-v2',
        merge: (persisted, current) => {
          const ps = persisted as Partial<typeof current>
          if (!ps) return current
          const mergedCharacter: CharacterV2 = {
            ...DEFAULT_CHARACTER_V2,
            ...(ps.character ?? {}),
            acquiredNodeIds: ps.character?.acquiredNodeIds ?? [],
            skills: ps.character?.skills ?? {},
            inventory: ps.character?.inventory ?? [],
            notes: ps.character?.notes ?? '',
            money: ps.character?.money ?? { ...DEFAULT_MONEY },
            currentResources: ps.character?.currentResources ?? DEFAULT_CHARACTER_V2.currentResources,
            avatarBase64: ps.character?.avatarBase64,
            avatarPosition: ps.character?.avatarPosition ?? '50% 50%',
            avatarScale: ps.character?.avatarScale ?? 1,
          }
          let mergedCharacters = ps.characters || {}
          if (Object.keys(mergedCharacters).length === 0) {
            mergedCharacters = { [mergedCharacter.id]: mergedCharacter }
          }
          return { ...current, ...ps, character: mergedCharacter, characters: mergedCharacters }
        },
      },
    ),
    { name: 'CharacterV2Store' },
  ),
)
