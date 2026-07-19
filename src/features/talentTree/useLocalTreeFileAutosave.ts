import { useCallback, useEffect, useRef, useState } from 'react'
import type { TalentTree } from '../../types/talentTree'
import { serializeTree, useTalentTreeStore } from './store/talentTreeStore'

const LOCAL_SAVE_ENDPOINT = '/__overgrown/talent-tree'
const AUTOSAVE_DELAY_MS = 600

export type LocalTreeSaveStatus =
  | 'waiting'
  | 'pending'
  | 'saving'
  | 'saved'
  | 'error'
  | 'local-only'

interface LocalTreeAutosaveResult {
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

/** Persiste alterações em src/data/defaultTalentTree.json pelo Vite local. */
export function useLocalTreeFileAutosave(tree: TalentTree): LocalTreeAutosaveResult {
  const [status, setStatus] = useState<LocalTreeSaveStatus>(
    import.meta.env.DEV ? 'waiting' : 'local-only',
  )
  const [error, setError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const timerRef = useRef<number | null>(null)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const lastSavedTreeRef = useRef<string | null>(null)
  const baselineReadyRef = useRef(false)
  const mountedRef = useRef(true)

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
    if (!baselineReadyRef.current) return Promise.resolve()

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
        setStatus(
          serializeTree(useTalentTreeStore.getState().tree) === serialized ? 'saved' : 'pending',
        )
      })
      .catch((saveError: unknown) => {
        if (!mountedRef.current) return
        setError(saveError instanceof Error ? saveError.message : 'Falha ao salvar a árvore.')
        setStatus('error')
      })
    saveQueueRef.current = operation
    return operation
  }, [])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    if (!baselineReadyRef.current) {
      // O store nasce vazio e recebe o JSON oficial em um efeito irmão. O
      // primeiro estado real é a base, não uma alteração a ser regravada.
      if (tree.nodes.length === 0) return
      baselineReadyRef.current = true
      lastSavedTreeRef.current = serializeTree(tree)
      queueMicrotask(() => {
        if (mountedRef.current) setStatus('saved')
      })
      return
    }
    queueMicrotask(() => {
      if (mountedRef.current) setStatus('pending')
    })
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
  }, [enqueueSave, tree])

  useEffect(() => {
    if (!import.meta.env.DEV) return

    const flushBeforeUnload = () => {
      if (!baselineReadyRef.current) return
      const serialized = serializeTree(useTalentTreeStore.getState().tree)
      if (serialized === lastSavedTreeRef.current) return
      navigator.sendBeacon(
        LOCAL_SAVE_ENDPOINT,
        new Blob([serialized], { type: 'application/json; charset=utf-8' }),
      )
    }
    window.addEventListener('beforeunload', flushBeforeUnload)
    return () => window.removeEventListener('beforeunload', flushBeforeUnload)
  }, [])

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      void enqueueSave(false)
    },
    [enqueueSave],
  )

  return { status, error, lastSavedAt }
}
