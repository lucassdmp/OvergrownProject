import type { Character } from '../../../types/game'

const DATABASE_NAME = 'overgrown-firebase-character-cache'
const DATABASE_VERSION = 1
const CHARACTER_STORE = 'characters'
const MAX_CACHED_CHARACTERS_PER_USER = 5
const CHARACTER_CACHE_TTL_MS = 5 * 60_000
const SUMMARY_CACHE_TTL_MS = 60_000
const SUMMARY_KEY_PREFIX = 'overgrown-firebase-character-summaries:'

export interface CachedFirebaseCharacter {
  character: Character
  updatedAtMs: number
  avatarHash?: string
  avatarContentType?: string
  avatarLoaded?: boolean
}

export interface CachedFirebaseCharacterSummary {
  id: string
  name: string
  divinity: number
  hasDivinity: boolean
}

interface StoredCharacter extends CachedFirebaseCharacter {
  key: string
  uid: string
  characterId: string
  cachedAt: number
  lastAccessedAt: number
}

interface StoredSummaries {
  cachedAt: number
  summaries: CachedFirebaseCharacterSummary[]
}

let databasePromise: Promise<IDBDatabase> | null = null

function characterKey(uid: string, characterId: string) {
  return `${uid}:${characterId}`
}

function summaryKey(uid: string) {
  return `${SUMMARY_KEY_PREFIX}${uid}`
}

function openCacheDatabase(): Promise<IDBDatabase> | null {
  if (typeof indexedDB === 'undefined') return null
  if (databasePromise) return databasePromise

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(CHARACTER_STORE)) {
        database.createObjectStore(CHARACTER_STORE, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('O cache local está bloqueado por outra aba.'))
  }).catch((error) => {
    databasePromise = null
    throw error
  })

  return databasePromise
}

async function requestFromStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const databaseRequest = openCacheDatabase()
  if (!databaseRequest) throw new Error('IndexedDB não está disponível.')
  const database = await databaseRequest

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(CHARACTER_STORE, mode)
    const request = operation(transaction.objectStore(CHARACTER_STORE))
    let result: T
    request.onsuccess = () => {
      result = request.result
    }
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => resolve(result)
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

async function deleteStoredCharacter(key: string) {
  await requestFromStore('readwrite', (store) => store.delete(key))
}

async function trimUserCache(uid: string) {
  const records = await requestFromStore<StoredCharacter[]>('readonly', (store) => store.getAll())
  const overflow = records
    .filter((record) => record.uid === uid)
    .sort((left, right) => right.lastAccessedAt - left.lastAccessedAt)
    .slice(MAX_CACHED_CHARACTERS_PER_USER)

  await Promise.all(overflow.map((record) => deleteStoredCharacter(record.key)))
}

export async function getCachedFirebaseCharacter(
  uid: string,
  characterId: string,
): Promise<CachedFirebaseCharacter | null> {
  try {
    const key = characterKey(uid, characterId)
    const stored = await requestFromStore<StoredCharacter | undefined>('readonly', (store) =>
      store.get(key),
    )
    if (!stored) return null

    const now = Date.now()
    if (now - stored.cachedAt > CHARACTER_CACHE_TTL_MS) {
      await deleteStoredCharacter(key)
      return null
    }

    await requestFromStore('readwrite', (store) => store.put({ ...stored, lastAccessedAt: now }))
    return {
      character: stored.character,
      updatedAtMs: stored.updatedAtMs,
      avatarHash: stored.avatarHash,
      avatarContentType: stored.avatarContentType,
      avatarLoaded: stored.avatarLoaded,
    }
  } catch {
    return null
  }
}

export async function setCachedFirebaseCharacter(
  uid: string,
  remote: CachedFirebaseCharacter,
): Promise<void> {
  try {
    const now = Date.now()
    const stored: StoredCharacter = {
      ...remote,
      key: characterKey(uid, remote.character.id),
      uid,
      characterId: remote.character.id,
      cachedAt: now,
      lastAccessedAt: now,
    }
    await requestFromStore('readwrite', (store) => store.put(stored))
    await trimUserCache(uid)
  } catch {
    // Cache failures must never block a Firestore read or write.
  }
}

export async function deleteCachedFirebaseCharacter(
  uid: string,
  characterId: string,
): Promise<void> {
  try {
    await deleteStoredCharacter(characterKey(uid, characterId))
  } catch {
    // Cache failures must never block deletion from Firestore.
  }
}

export function getCachedFirebaseCharacterSummaries(
  uid: string,
): CachedFirebaseCharacterSummary[] | null {
  try {
    const raw = window.sessionStorage.getItem(summaryKey(uid))
    if (!raw) return null
    const stored = JSON.parse(raw) as StoredSummaries
    if (!Array.isArray(stored.summaries) || Date.now() - stored.cachedAt > SUMMARY_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(summaryKey(uid))
      return null
    }
    return stored.summaries
  } catch {
    return null
  }
}

export function setCachedFirebaseCharacterSummaries(
  uid: string,
  summaries: CachedFirebaseCharacterSummary[],
) {
  try {
    const stored: StoredSummaries = { cachedAt: Date.now(), summaries }
    window.sessionStorage.setItem(summaryKey(uid), JSON.stringify(stored))
  } catch {
    // sessionStorage can be unavailable in private or restricted contexts.
  }
}

export async function clearFirebaseCharacterCaches(uid: string): Promise<void> {
  try {
    window.sessionStorage.removeItem(summaryKey(uid))
  } catch {
    // Continue clearing IndexedDB when sessionStorage is unavailable.
  }

  try {
    const records = await requestFromStore<StoredCharacter[]>('readonly', (store) => store.getAll())
    await Promise.all(
      records
        .filter((record) => record.uid === uid)
        .map((record) => deleteStoredCharacter(record.key)),
    )
  } catch {
    // Logging out must not fail because local cache cleanup failed.
  }
}
