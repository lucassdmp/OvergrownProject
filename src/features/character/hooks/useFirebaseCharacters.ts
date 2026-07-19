import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  deleteField,
  doc,
  getDoc,
  getDocs,
  collection,
  serverTimestamp,
  Timestamp,
  writeBatch,
  type DocumentSnapshot,
  type Firestore,
} from 'firebase/firestore'
import type { Character } from '../../../types/game'
import { getFirebaseServices } from '../../../services/firebase'
import { firebaseErrorMessage, useFirebaseSession } from '../../auth/firebaseSessionContext'
import { useCharacterStore } from '../store/characterStore'

const SAVE_INTERVAL_MS = 30_000

type CloudCharacter = Omit<Character, 'avatarBase64'>

const PATCHABLE_CHARACTER_FIELDS: Array<keyof CloudCharacter> = [
  'name',
  'race',
  'origin',
  'divinity',
  'avatarPosition',
  'avatarScale',
  'connectedTreeId',
  'acquiredNodeIds',
  'nodeConfigs',
  'skills',
  'inventory',
  'notes',
  'money',
  'currentResources',
]

export interface CharacterSummary {
  id: string
  name: string
  divinity: number
  hasDivinity: boolean
}

interface RemoteCharacter {
  character: Character
  updatedAtMs: number
  avatarHash?: string
  avatarContentType?: string
}

interface RemoteCharacterDocument {
  character?: Character
  updatedAt?: Timestamp | null
  avatarHash?: string
  avatarContentType?: string
}

interface AvatarDocument {
  dataUrl?: string
}

function cleanValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function cloudCharacter(character: Character): CloudCharacter {
  const withoutAvatar = { ...character }
  delete withoutAvatar.avatarBase64
  return cleanValue(withoutAvatar)
}

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function characterReference(firestore: Firestore, uid: string, characterId: string) {
  return doc(firestore, 'users', uid, 'characters', characterId)
}

function summaryReference(firestore: Firestore, uid: string, characterId: string) {
  return doc(firestore, 'users', uid, 'characterSummaries', characterId)
}

function avatarReference(firestore: Firestore, uid: string, characterId: string) {
  return doc(firestore, 'users', uid, 'characters', characterId, 'characterAssets', 'avatar')
}

function avatarContentType(dataUrl: string) {
  return dataUrl.match(/^data:([^;,]+)[;,]/)?.[1] || 'image/jpeg'
}

async function avatarHash(dataUrl: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataUrl))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function remoteFromSnapshot(snapshot: DocumentSnapshot): RemoteCharacter | null {
  if (!snapshot.exists()) return null
  const data = snapshot.data() as RemoteCharacterDocument
  if (!data.character) return null
  return {
    character: data.character,
    updatedAtMs: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : 0,
    avatarHash: data.avatarHash,
    avatarContentType: data.avatarContentType,
  }
}

export function useFirebaseCharacters() {
  const { user, canSaveCharacters } = useFirebaseSession()
  const character = useCharacterStore((state) => state.character)
  const [summaries, setSummaries] = useState<CharacterSummary[]>([])
  const [remoteCache, setRemoteCache] = useState<Record<string, RemoteCharacter | null>>({})
  const [localCooldowns, setLocalCooldowns] = useState<Record<string, number>>({})
  const [now, setNow] = useState(Date.now())
  const [loadingSummaries, setLoadingSummaries] = useState(false)
  const [loadingCharacterId, setLoadingCharacterId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshSummaries = useCallback(async () => {
    const services = getFirebaseServices()
    if (!services || !user || !canSaveCharacters) {
      setSummaries([])
      return
    }

    setLoadingSummaries(true)
    setError(null)
    try {
      const snapshot = await getDocs(
        collection(services.firestore, 'users', user.uid, 'characterSummaries'),
      )
      setSummaries(
        snapshot.docs
          .map((summaryDocument) => {
            const data = summaryDocument.data()
            return {
              id: summaryDocument.id,
              name: String(data.name || 'Sem nome'),
              divinity: Number(data.divinity || 0),
              hasDivinity: typeof data.divinity === 'number',
            }
          })
          .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')),
      )
    } catch (summaryError) {
      setError(firebaseErrorMessage(summaryError))
    } finally {
      setLoadingSummaries(false)
    }
  }, [canSaveCharacters, user])

  useEffect(() => {
    setRemoteCache({})
    void refreshSummaries()
  }, [refreshSummaries])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  const activeRemote = remoteCache[character.id]
  const nextAllowedAt = Math.max(
    localCooldowns[character.id] ?? 0,
    activeRemote?.updatedAtMs ? activeRemote.updatedAtMs + SAVE_INTERVAL_MS : 0,
  )
  const remainingSeconds = Math.max(0, Math.ceil((nextAllowedAt - now) / 1_000))

  const fetchRemoteCharacter = useCallback(
    async (characterId: string): Promise<RemoteCharacter | null> => {
      const services = getFirebaseServices()
      if (!services || !user || !canSaveCharacters) return null
      const snapshot = await getDoc(characterReference(services.firestore, user.uid, characterId))
      const remote = remoteFromSnapshot(snapshot)
      setRemoteCache((cache) => ({ ...cache, [characterId]: remote }))
      return remote
    },
    [canSaveCharacters, user],
  )

  const saveCharacter = useCallback(async () => {
    const services = getFirebaseServices()
    if (!services || !user || !canSaveCharacters) {
      setError('Sua conta não possui permissão para salvar fichas no Firebase.')
      return
    }

    const current = cleanValue(useCharacterStore.getState().character)
    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const listedRemotely = summaries.some((summary) => summary.id === current.id)
      const currentRemote =
        remoteCache[current.id] === undefined
          ? listedRemotely
            ? await fetchRemoteCharacter(current.id)
            : null
          : remoteCache[current.id]
      const allowedAt = Math.max(
        localCooldowns[current.id] ?? 0,
        currentRemote?.updatedAtMs ? currentRemote.updatedAtMs + SAVE_INTERVAL_MS : 0,
      )
      if (allowedAt > Date.now()) {
        setNow(Date.now())
        return
      }

      const currentCloudCharacter = cloudCharacter(current)
      const updates: Record<string, unknown> = {}
      let nextAvatarHash: string | undefined
      let nextAvatarContentType: string | undefined
      let avatarChanged = false
      let avatarRemoved = false

      if (currentRemote) {
        const remoteCloudCharacter = cloudCharacter(currentRemote.character)
        for (const field of PATCHABLE_CHARACTER_FIELDS) {
          if (sameValue(currentCloudCharacter[field], remoteCloudCharacter[field])) continue
          updates[`character.${field}`] =
            currentCloudCharacter[field] === undefined
              ? deleteField()
              : cleanValue(currentCloudCharacter[field])
        }
        if (currentRemote.character.avatarBase64 !== undefined) {
          updates['character.avatarBase64'] = deleteField()
        }
      }

      if (current.avatarBase64) {
        nextAvatarHash = await avatarHash(current.avatarBase64)
        nextAvatarContentType = avatarContentType(current.avatarBase64)
        avatarChanged = !currentRemote || currentRemote.avatarHash !== nextAvatarHash
        if (avatarChanged) {
          updates.avatarHash = nextAvatarHash
          updates.avatarContentType = nextAvatarContentType
        }
      } else if (currentRemote?.avatarHash || currentRemote?.character.avatarBase64) {
        avatarRemoved = true
        updates.avatarHash = deleteField()
        updates.avatarContentType = deleteField()
      }

      const currentSummary = summaries.find((summary) => summary.id === current.id)
      const summaryChanged =
        !currentSummary ||
        !currentSummary.hasDivinity ||
        currentSummary.name !== current.name ||
        currentSummary.divinity !== current.divinity
      if (currentRemote && Object.keys(updates).length === 0 && !summaryChanged) {
        setMessage('Nenhuma alteração para salvar.')
        return
      }

      const batch = writeBatch(services.firestore)
      const remoteTimestamp = Date.now()
      if (!currentRemote) {
        batch.set(characterReference(services.firestore, user.uid, current.id), {
          character: currentCloudCharacter,
          ...(nextAvatarHash
            ? { avatarHash: nextAvatarHash, avatarContentType: nextAvatarContentType }
            : {}),
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        })
      } else {
        updates.updatedAt = serverTimestamp()
        updates.updatedBy = user.uid
        batch.update(characterReference(services.firestore, user.uid, current.id), updates)
      }

      if (summaryChanged) {
        batch.set(summaryReference(services.firestore, user.uid, current.id), {
          name: current.name || 'Sem nome',
          divinity: current.divinity,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        })
      }

      const assetReference = avatarReference(services.firestore, user.uid, current.id)
      if (avatarChanged && current.avatarBase64 && nextAvatarHash && nextAvatarContentType) {
        batch.set(assetReference, {
          dataUrl: current.avatarBase64,
          hash: nextAvatarHash,
          contentType: nextAvatarContentType,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        })
      } else if (avatarRemoved) {
        batch.delete(assetReference)
      }

      await batch.commit()
      const cachedCharacter = {
        ...currentCloudCharacter,
      } as Character
      const nextRemote: RemoteCharacter = {
        character: cachedCharacter,
        updatedAtMs: remoteTimestamp,
        avatarHash: avatarRemoved ? undefined : (nextAvatarHash ?? currentRemote?.avatarHash),
        avatarContentType: avatarRemoved
          ? undefined
          : (nextAvatarContentType ?? currentRemote?.avatarContentType),
      }
      setRemoteCache((cache) => ({ ...cache, [current.id]: nextRemote }))
      if (summaryChanged) {
        setSummaries((currentSummaries) =>
          [
            ...currentSummaries.filter((summary) => summary.id !== current.id),
            {
              id: current.id,
              name: current.name || 'Sem nome',
              divinity: current.divinity,
              hasDivinity: true,
            },
          ].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')),
        )
      }
      setLocalCooldowns((cooldowns) => ({
        ...cooldowns,
        [current.id]: remoteTimestamp + SAVE_INTERVAL_MS,
      }))
      setNow(remoteTimestamp)
      setMessage('Ficha salva no Firebase.')
    } catch (saveError) {
      setError(firebaseErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }, [canSaveCharacters, fetchRemoteCharacter, localCooldowns, remoteCache, summaries, user])

  const loadRemoteCharacter = useCallback(
    async (characterId: string) => {
      const services = getFirebaseServices()
      if (!services || !user || !canSaveCharacters) return

      setLoadingCharacterId(characterId)
      setError(null)
      setMessage(null)
      try {
        // Deliberately fetch the selected full document only now. The list
        // request above contains summaries, never complete character sheets.
        const remote = await fetchRemoteCharacter(characterId)
        if (!remote) throw new Error('A ficha selecionada não existe mais.')

        let avatarBase64 = remote.character.avatarBase64
        if (remote.avatarHash) {
          const avatarSnapshot = await getDoc(
            avatarReference(services.firestore, user.uid, characterId),
          )
          const avatarData = avatarSnapshot.data() as AvatarDocument | undefined
          avatarBase64 = avatarData?.dataUrl
        }
        useCharacterStore.getState().loadCharacter(
          cleanValue({
            ...remote.character,
            avatarBase64,
          }),
        )
        setMessage(`Ficha “${remote.character.name || 'Sem nome'}” carregada.`)
      } catch (loadError) {
        setError(firebaseErrorMessage(loadError))
      } finally {
        setLoadingCharacterId(null)
      }
    },
    [canSaveCharacters, fetchRemoteCharacter, user],
  )

  const deleteCharacter = useCallback(
    async (characterId: string) => {
      const services = getFirebaseServices()
      const isRemote = summaries.some((summary) => summary.id === characterId)
      if (!isRemote) {
        useCharacterStore.getState().deleteCharacter(characterId)
        return
      }
      if (!services || !user || !canSaveCharacters) {
        setError('Sua conta não possui permissão para excluir fichas do Firebase.')
        return
      }

      setSaving(true)
      setError(null)
      setMessage(null)
      try {
        const remote =
          remoteCache[characterId] === undefined
            ? await fetchRemoteCharacter(characterId)
            : remoteCache[characterId]
        const allowedAt = remote?.updatedAtMs ? remote.updatedAtMs + SAVE_INTERVAL_MS : 0
        if (allowedAt > Date.now()) {
          setNow(Date.now())
          throw new Error('Aguarde o cooldown terminar antes de excluir esta ficha.')
        }

        const batch = writeBatch(services.firestore)
        batch.delete(avatarReference(services.firestore, user.uid, characterId))
        batch.delete(characterReference(services.firestore, user.uid, characterId))
        batch.delete(summaryReference(services.firestore, user.uid, characterId))
        await batch.commit()

        setSummaries((current) => current.filter((summary) => summary.id !== characterId))
        setRemoteCache((cache) => {
          const next = { ...cache }
          delete next[characterId]
          return next
        })
        useCharacterStore.getState().deleteCharacter(characterId)
        setMessage('Ficha excluída do Firebase.')
      } catch (deleteError) {
        setError(firebaseErrorMessage(deleteError))
      } finally {
        setSaving(false)
      }
    },
    [canSaveCharacters, fetchRemoteCharacter, remoteCache, summaries, user],
  )

  return useMemo(
    () => ({
      summaries,
      loadingSummaries,
      loadingCharacterId,
      saving,
      remainingSeconds,
      message,
      error,
      refreshSummaries,
      saveCharacter,
      loadRemoteCharacter,
      deleteCharacter,
    }),
    [
      error,
      deleteCharacter,
      loadRemoteCharacter,
      loadingCharacterId,
      loadingSummaries,
      message,
      refreshSummaries,
      remainingSeconds,
      saveCharacter,
      saving,
      summaries,
    ],
  )
}
