import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'
import type { Character } from '../../../types/game'
import { getFirebaseServices } from '../../../services/firebase'
import { firebaseErrorMessage, useFirebaseSession } from '../../auth/firebaseSessionContext'
import { useCharacterStore } from '../store/characterStore'

const SAVE_INTERVAL_MS = 30_000

export interface RemoteCharacter {
  character: Character
  updatedAtMs: number
}

interface RemoteCharacterDocument {
  character?: Character
  updatedAt?: Timestamp | null
}

function cleanCharacter(character: Character): Character {
  return JSON.parse(JSON.stringify(character)) as Character
}

export function useFirebaseCharacters() {
  const { user, canSaveCharacters } = useFirebaseSession()
  const character = useCharacterStore((state) => state.character)
  const [remoteCharacters, setRemoteCharacters] = useState<RemoteCharacter[]>([])
  const [localCooldowns, setLocalCooldowns] = useState<Record<string, number>>({})
  const [now, setNow] = useState(Date.now())
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !canSaveCharacters) {
      setRemoteCharacters([])
      return
    }

    const services = getFirebaseServices()
    if (!services) return

    return onSnapshot(
      collection(services.firestore, 'users', user.uid, 'characters'),
      (snapshot) => {
        const next = snapshot.docs
          .map((characterDocument): RemoteCharacter | null => {
            const data = characterDocument.data() as RemoteCharacterDocument
            if (!data.character) return null
            return {
              character: data.character,
              updatedAtMs: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : 0,
            }
          })
          .filter((entry): entry is RemoteCharacter => entry !== null)
          .sort((a, b) => b.updatedAtMs - a.updatedAtMs)
        setRemoteCharacters(next)
        setError(null)
      },
      (snapshotError) => setError(firebaseErrorMessage(snapshotError)),
    )
  }, [canSaveCharacters, user])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  const activeRemote = remoteCharacters.find((entry) => entry.character.id === character.id)
  const nextAllowedAt = Math.max(
    localCooldowns[character.id] ?? 0,
    activeRemote?.updatedAtMs ? activeRemote.updatedAtMs + SAVE_INTERVAL_MS : 0,
  )
  const remainingSeconds = Math.max(0, Math.ceil((nextAllowedAt - now) / 1_000))

  const saveCharacter = useCallback(async () => {
    const services = getFirebaseServices()
    if (!services || !user || !canSaveCharacters) {
      setError('Sua conta não possui permissão para salvar fichas no Firebase.')
      return
    }

    const current = useCharacterStore.getState().character
    const currentRemote = remoteCharacters.find((entry) => entry.character.id === current.id)
    const allowedAt = Math.max(
      localCooldowns[current.id] ?? 0,
      currentRemote?.updatedAtMs ? currentRemote.updatedAtMs + SAVE_INTERVAL_MS : 0,
    )
    if (allowedAt > Date.now()) return

    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await setDoc(doc(services.firestore, 'users', user.uid, 'characters', current.id), {
        character: cleanCharacter(current),
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      })
      setLocalCooldowns((cooldowns) => ({
        ...cooldowns,
        [current.id]: Date.now() + SAVE_INTERVAL_MS,
      }))
      setNow(Date.now())
      setMessage('Ficha salva no Firebase.')
    } catch (saveError) {
      setError(firebaseErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }, [canSaveCharacters, localCooldowns, remoteCharacters, user])

  const loadRemoteCharacter = useCallback(
    (characterId: string) => {
      const remote = remoteCharacters.find((entry) => entry.character.id === characterId)
      if (!remote) return
      useCharacterStore.getState().loadCharacter(cleanCharacter(remote.character))
      setMessage(`Ficha “${remote.character.name || 'Sem nome'}” carregada.`)
      setError(null)
    },
    [remoteCharacters],
  )

  return useMemo(
    () => ({
      remoteCharacters,
      saving,
      remainingSeconds,
      message,
      error,
      saveCharacter,
      loadRemoteCharacter,
    }),
    [
      error,
      loadRemoteCharacter,
      message,
      remainingSeconds,
      remoteCharacters,
      saveCharacter,
      saving,
    ],
  )
}
