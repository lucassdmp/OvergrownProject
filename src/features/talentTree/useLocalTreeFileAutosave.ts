import { useCallback, useEffect, useRef, useState } from 'react'
import type { TalentTree } from '../../types/talentTree'
import { serializeTree, useTalentTreeStore } from './store/talentTreeStore'

const LOCAL_SAVE_ENDPOINT = '/__overgrown/talent-tree'
const AUTOSAVE_DELAY_MS = 500

export type LocalTreeSaveStatus =
  | 'waiting'
  | 'pending'
  | 'saving'
  | 'saved'
  | 'error'
  | 'local-only'

interface LocalTreeAutosaveResult {
  saveNow: () => Promise<void>
  status: LocalTreeSaveStatus
  error: string | null
  lastSavedAt: Date | null
}

async function writeTreeToProject(serializedTree: string): Promise<Date> {
  const response = await fetch(LOCAL_SAVE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: serializedTree,
  })
  const result = (await response.json().catch(() => null)) as {
    ok?: boolean
    error?: string
    savedAt?: string
  } | null
  if (!response.ok || !result?.ok) {
    throw new Error(result?.error || `Falha ao salvar a árvore (${response.status}).`)
  }
  return result.savedAt ? new Date(result.savedAt) : new Date()
}

/**
 * Persists every builder change into src/data/defaultTalentTree.json.
 * The endpoint exists only in the local Vite development server.
 */
export function useLocalTreeFileAutosave(tree: TalentTree): LocalTreeAutosaveResult {
  const [hydrated, setHydrated] = useState(() => useTalentTreeStore.persist.hasHydrated())
  const [status, setStatus] = useState<LocalTreeSaveStatus>(
    import.meta.env.DEV ? 'waiting' : 'local-only',
  )
  const [error, setError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const timerRef = useRef<number | null>(null)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const lastSavedTreeRef = useRef<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    if (useTalentTreeStore.persist.hasHydrated()) return
    return useTalentTreeStore.persist.onFinishHydration(() => setHydrated(true))
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  const enqueueSave = useCallback((force: boolean) => {
    if (!import.meta.env.DEV) {
      setStatus('local-only')
      return Promise.resolve()
    }
    const serialized = serializeTree(useTalentTreeStore.getState().tree)
    if (!force && serialized === lastSavedTreeRef.current) {
      setStatus('saved')
      return Promise.resolve()
    }

    setStatus('saving')
    setError(null)
    const operation = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const savedAt = await writeTreeToProject(serialized)
        lastSavedTreeRef.current = serialized
        if (!mountedRef.current) return
        setLastSavedAt(savedAt)
        setStatus('saved')
      })
      .catch((saveError: unknown) => {
        if (!mountedRef.current) return
        setError(saveError instanceof Error ? saveError.message : 'Falha ao salvar a árvore.')
        setStatus('error')
      })
    saveQueueRef.current = operation
    return operation
  }, [])

  const saveNow = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    return enqueueSave(true)
  }, [enqueueSave])

  useEffect(() => {
    if (!hydrated || !import.meta.env.DEV) return
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      void enqueueSave(false)
    }, AUTOSAVE_DELAY_MS)
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [enqueueSave, hydrated, tree])

  return { saveNow, status, error, lastSavedAt }
}
