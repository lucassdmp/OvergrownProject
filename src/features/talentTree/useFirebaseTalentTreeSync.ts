import { useCallback, useEffect, useRef, useState } from 'react'
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type DocumentData,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore'
import type { TalentTree, TalentTreeEdge, TalentTreeNode } from '../../types/talentTree'
import {
  firebaseTreeId,
  getFirebaseServices,
  isFirebaseConfigured,
  requireFirebaseUser,
} from '../../services/firebase'
import { useTalentTreeStore } from './store/talentTreeStore'
import {
  getCachedPublishedTalentTree,
  loadPublishedTalentTree,
  parsePublishedManifest,
  publishedManifestReference,
  publishTalentTree,
  type PublishedTalentTreeManifest,
} from './publishedTalentTree'

export type FirebaseTreeSyncStatus =
  | 'disabled'
  | 'connecting'
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'error'

interface FirebaseTreeSyncResult {
  saveNow: () => Promise<void>
  status: FirebaseTreeSyncStatus
  error: string | null
  lastSavedAt: Date | null
}

type TreeMetadata = Omit<TalentTree, 'nodes' | 'edges'>

interface RemoteTreeState {
  metadata: TreeMetadata | null
  nodes: Map<string, TalentTreeNode>
  edges: Map<string, TalentTreeEdge>
  metadataReady: boolean
  nodesReady: boolean
  edgesReady: boolean
}

interface ValueChange<T> {
  before: T | undefined
  after: T | undefined
}

interface PendingTreeChanges {
  metadata: ValueChange<TreeMetadata> | null
  nodes: Map<string, ValueChange<TalentTreeNode>>
  edges: Map<string, ValueChange<TalentTreeEdge>>
}

const BATCH_SIZE = 400
const AUTOSAVE_DEBOUNCE_MS = 700

const NODE_FIELDS: Array<keyof TalentTreeNode> = [
  'id',
  'x',
  'y',
  'data',
  'imageBase64',
  'imagePosition',
  'imageScale',
  'cost',
  'tier',
  'legacyIds',
  'prerequisiteNodeIds',
]
const EDGE_FIELDS: Array<keyof TalentTreeEdge> = ['id', 'from', 'to']
const METADATA_FIELDS: Array<keyof TreeMetadata> = ['id', 'name', 'description', 'version']

function emptyPendingChanges(): PendingTreeChanges {
  return { metadata: null, nodes: new Map(), edges: new Map() }
}

function hasPendingChanges(changes: PendingTreeChanges) {
  return changes.metadata !== null || changes.nodes.size > 0 || changes.edges.size > 0
}

function cleanFirestoreValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function comparable(value: unknown): string {
  if (value === undefined) return '__undefined__'
  return JSON.stringify(cleanFirestoreValue(value))
}

function sameValue(left: unknown, right: unknown) {
  return comparable(left) === comparable(right)
}

function stripSyncFields(data: DocumentData) {
  const value = { ...data }
  delete value.updatedAt
  delete value.updatedBy
  return value
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Falha desconhecida ao sincronizar com o Firebase.'
}

function treeMetadata(tree: TalentTree): TreeMetadata {
  return {
    id: tree.id,
    name: tree.name,
    description: tree.description,
    version: tree.version,
  }
}

function treeReferences(firestore: Firestore) {
  const tree = doc(firestore, 'talentTrees', firebaseTreeId)
  return {
    tree,
    nodes: collection(tree, 'nodes'),
    edges: collection(tree, 'edges'),
  }
}

function queueValueChange<T>(
  changes: Map<string, ValueChange<T>>,
  id: string,
  before: T | undefined,
  after: T | undefined,
) {
  const existing = changes.get(id)
  const original = existing ? existing.before : before
  if (sameValue(original, after)) {
    changes.delete(id)
    return
  }
  changes.set(id, { before: original, after })
}

function queueTreeDifference(pending: PendingTreeChanges, previous: TalentTree, next: TalentTree) {
  const previousMetadata = treeMetadata(previous)
  const nextMetadata = treeMetadata(next)
  if (!sameValue(previousMetadata, nextMetadata)) {
    const original = pending.metadata ? pending.metadata.before : previousMetadata
    pending.metadata = sameValue(original, nextMetadata)
      ? null
      : { before: original, after: nextMetadata }
  }

  const previousNodes = new Map(previous.nodes.map((node) => [node.id, node]))
  const nextNodes = new Map(next.nodes.map((node) => [node.id, node]))
  for (const id of new Set([...previousNodes.keys(), ...nextNodes.keys()])) {
    const before = previousNodes.get(id)
    const after = nextNodes.get(id)
    if (!sameValue(before, after)) queueValueChange(pending.nodes, id, before, after)
  }

  const previousEdges = new Map(previous.edges.map((edge) => [edge.id, edge]))
  const nextEdges = new Map(next.edges.map((edge) => [edge.id, edge]))
  for (const id of new Set([...previousEdges.keys(), ...nextEdges.keys()])) {
    const before = previousEdges.get(id)
    const after = nextEdges.get(id)
    if (!sameValue(before, after)) queueValueChange(pending.edges, id, before, after)
  }
}

function onlyNodePositionsChanged(previous: TalentTree, next: TalentTree) {
  if (!sameValue(treeMetadata(previous), treeMetadata(next))) return false
  if (!sameValue(previous.edges, next.edges)) return false

  const previousNodes = new Map(previous.nodes.map((node) => [node.id, node]))
  const nextNodes = new Map(next.nodes.map((node) => [node.id, node]))
  if (previousNodes.size !== nextNodes.size) return false

  let moved = false
  for (const [id, nextNode] of nextNodes) {
    const previousNode = previousNodes.get(id)
    if (!previousNode) return false
    if (previousNode.x === nextNode.x && previousNode.y === nextNode.y) continue
    moved = true
    const { x: previousX, y: previousY, ...previousRest } = previousNode
    const { x: nextX, y: nextY, ...nextRest } = nextNode
    void previousX
    void previousY
    void nextX
    void nextY
    if (!sameValue(previousRest, nextRest)) return false
  }
  return moved
}

function structureChanged(previous: TalentTree, next: TalentTree) {
  if (previous.nodes.length !== next.nodes.length || previous.edges.length !== next.edges.length) {
    return true
  }
  const previousNodeIds = new Set(previous.nodes.map((node) => node.id))
  const previousEdgeIds = new Set(previous.edges.map((edge) => edge.id))
  return (
    next.nodes.some((node) => !previousNodeIds.has(node.id)) ||
    next.edges.some((edge) => !previousEdgeIds.has(edge.id))
  )
}

function onlySelectedNodeContentChanged(
  previous: TalentTree,
  next: TalentTree,
  selectedNodeId: string | null,
) {
  if (!selectedNodeId) return false
  if (!sameValue(treeMetadata(previous), treeMetadata(next))) return false
  if (!sameValue(previous.edges, next.edges)) return false

  const previousNodes = new Map(previous.nodes.map((node) => [node.id, node]))
  const nextNodes = new Map(next.nodes.map((node) => [node.id, node]))
  if (previousNodes.size !== nextNodes.size) return false

  let changed = false
  for (const [id, nextNode] of nextNodes) {
    const previousNode = previousNodes.get(id)
    if (!previousNode) return false
    if (sameValue(previousNode, nextNode)) continue
    if (id !== selectedNodeId) return false
    if (previousNode.x !== nextNode.x || previousNode.y !== nextNode.y) return false
    changed = true
  }
  return changed
}

function changedFields<T extends object>(before: T, after: T, fields: Array<keyof T>) {
  const patch: Record<string, unknown> = {}
  for (const field of fields) {
    if (sameValue(before[field], after[field])) continue
    const value = after[field]
    patch[String(field)] = value === undefined ? deleteField() : cleanFirestoreValue(value)
  }
  return patch
}

function mergeFailedChanges(target: PendingTreeChanges, failed: PendingTreeChanges) {
  if (failed.metadata) {
    const latest = target.metadata?.after ?? failed.metadata.after
    target.metadata = sameValue(failed.metadata.before, latest)
      ? null
      : { before: failed.metadata.before, after: latest }
  }
  for (const [id, change] of failed.nodes) {
    const pendingChange = target.nodes.get(id)
    const latest = pendingChange ? pendingChange.after : change.after
    if (sameValue(change.before, latest)) target.nodes.delete(id)
    else target.nodes.set(id, { before: change.before, after: latest })
  }
  for (const [id, change] of failed.edges) {
    const pendingChange = target.edges.get(id)
    const latest = pendingChange ? pendingChange.after : change.after
    if (sameValue(change.before, latest)) target.edges.delete(id)
    else target.edges.set(id, { before: change.before, after: latest })
  }
}

function applyTreeChanges(tree: TalentTree, changes: PendingTreeChanges): TalentTree {
  const metadata = changes.metadata?.after ?? treeMetadata(tree)
  const nodes = new Map(tree.nodes.map((node) => [node.id, node]))
  const edges = new Map(tree.edges.map((edge) => [edge.id, edge]))
  for (const [id, change] of changes.nodes) {
    if (change.after) nodes.set(id, change.after)
    else nodes.delete(id)
  }
  for (const [id, change] of changes.edges) {
    if (change.after) edges.set(id, change.after)
    else edges.delete(id)
  }
  return { ...metadata, nodes: [...nodes.values()], edges: [...edges.values()] }
}

async function writeTreeMetadata(firestore: Firestore, tree: TalentTree, uid: string) {
  const refs = treeReferences(firestore)
  await setDoc(
    refs.tree,
    { ...cleanFirestoreValue(treeMetadata(tree)), updatedAt: serverTimestamp(), updatedBy: uid },
    { merge: true },
  )
}

async function commitInChunks(
  firestore: Firestore,
  operations: Array<(batch: ReturnType<typeof writeBatch>) => void>,
) {
  for (let offset = 0; offset < operations.length; offset += BATCH_SIZE) {
    const batch = writeBatch(firestore)
    for (const operation of operations.slice(offset, offset + BATCH_SIZE)) operation(batch)
    await batch.commit()
  }
}

async function replaceRemoteTree(firestore: Firestore, tree: TalentTree, uid: string) {
  const refs = treeReferences(firestore)
  await writeTreeMetadata(firestore, tree, uid)

  const operations: Array<(batch: ReturnType<typeof writeBatch>) => void> = []
  const [remoteNodes, remoteEdges] = await Promise.all([getDocs(refs.nodes), getDocs(refs.edges)])
  const nextNodeIds = new Set(tree.nodes.map((node) => node.id))
  const nextEdgeIds = new Set(tree.edges.map((edge) => edge.id))
  for (const nodeDocument of remoteNodes.docs) {
    if (!nextNodeIds.has(nodeDocument.id)) {
      operations.push((batch) => batch.delete(nodeDocument.ref))
    }
  }
  for (const edgeDocument of remoteEdges.docs) {
    if (!nextEdgeIds.has(edgeDocument.id)) {
      operations.push((batch) => batch.delete(edgeDocument.ref))
    }
  }
  for (const node of tree.nodes) {
    operations.push((batch) =>
      batch.set(doc(refs.nodes, node.id), {
        ...cleanFirestoreValue(node),
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      }),
    )
  }
  for (const edge of tree.edges) {
    operations.push((batch) =>
      batch.set(doc(refs.edges, edge.id), {
        ...cleanFirestoreValue(edge),
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      }),
    )
  }
  await commitInChunks(firestore, operations)
}

async function commitPendingChanges(
  firestore: Firestore,
  changes: PendingTreeChanges,
  uid: string,
) {
  const refs = treeReferences(firestore)
  const operations: Array<(batch: ReturnType<typeof writeBatch>) => void> = []

  if (changes.metadata?.after) {
    const patch = changedFields(
      changes.metadata.before ?? changes.metadata.after,
      changes.metadata.after,
      METADATA_FIELDS,
    )
    operations.push((batch) =>
      batch.set(
        refs.tree,
        { ...patch, updatedAt: serverTimestamp(), updatedBy: uid },
        { merge: true },
      ),
    )
  }

  for (const [id, change] of changes.nodes) {
    const reference = doc(refs.nodes, id)
    if (!change.after) {
      operations.push((batch) => batch.delete(reference))
    } else if (!change.before) {
      operations.push((batch) =>
        batch.set(reference, {
          ...cleanFirestoreValue(change.after),
          updatedAt: serverTimestamp(),
          updatedBy: uid,
        }),
      )
    } else {
      const patch = changedFields(change.before, change.after, NODE_FIELDS)
      operations.push((batch) =>
        batch.update(reference, { ...patch, updatedAt: serverTimestamp(), updatedBy: uid }),
      )
    }
  }

  for (const [id, change] of changes.edges) {
    const reference = doc(refs.edges, id)
    if (!change.after) {
      operations.push((batch) => batch.delete(reference))
    } else if (!change.before) {
      operations.push((batch) =>
        batch.set(reference, {
          ...cleanFirestoreValue(change.after),
          updatedAt: serverTimestamp(),
          updatedBy: uid,
        }),
      )
    } else {
      const patch = changedFields(change.before, change.after, EDGE_FIELDS)
      operations.push((batch) =>
        batch.update(reference, { ...patch, updatedAt: serverTimestamp(), updatedBy: uid }),
      )
    }
  }

  await commitInChunks(firestore, operations)
}

export function useFirebaseTalentTreeSync({
  readOnly = false,
  selectedNodeId = null,
}: { readOnly?: boolean; selectedNodeId?: string | null } = {}): FirebaseTreeSyncResult {
  const [status, setStatus] = useState<FirebaseTreeSyncStatus>(
    isFirebaseConfigured ? 'connecting' : 'disabled',
  )
  const [error, setError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const flushNowRef = useRef<(() => Promise<void>) | null>(null)
  const selectedNodeIdRef = useRef(selectedNodeId)
  const previousSelectedNodeIdRef = useRef(selectedNodeId)

  const saveNow = useCallback(async () => {
    if (readOnly) return
    await flushNowRef.current?.()
  }, [readOnly])

  useEffect(() => {
    const previousSelectedNodeId = previousSelectedNodeIdRef.current
    selectedNodeIdRef.current = selectedNodeId
    previousSelectedNodeIdRef.current = selectedNodeId
    if (!readOnly && previousSelectedNodeId !== selectedNodeId) {
      void flushNowRef.current?.()
    }
  }, [readOnly, selectedNodeId])

  useEffect(() => {
    const services = getFirebaseServices()
    if (!services) return
    const firestore = services.firestore

    if (readOnly) {
      let disposed = false
      let generation = 0
      let legacyLoaded = false
      let currentCache: Awaited<ReturnType<typeof getCachedPublishedTalentTree>> = null
      const cachedPromise = getCachedPublishedTalentTree().then((cached) => {
        currentCache = cached
        if (!disposed && cached) {
          useTalentTreeStore.getState().importTree(cleanFirestoreValue(cached.tree))
          setStatus('synced')
        }
        return cached
      })

      setStatus('connecting')
      setError(null)
      const unsubscribe = onSnapshot(
        publishedManifestReference(firestore),
        (snapshot) => {
          const currentGeneration = ++generation
          void (async () => {
            await cachedPromise
            const cached = currentCache
            if (!snapshot.exists()) {
              // Transitional fallback for projects that have not opened the
              // optimized builder once yet. It is a one-shot load, not a large listener.
              if (cached || legacyLoaded) return
              legacyLoaded = true
              const refs = treeReferences(firestore)
              const [treeSnapshot, nodesSnapshot, edgesSnapshot] = await Promise.all([
                getDoc(refs.tree),
                getDocs(refs.nodes),
                getDocs(refs.edges),
              ])
              if (disposed || currentGeneration !== generation) return
              const local = useTalentTreeStore.getState().tree
              const metadata = treeSnapshot.exists()
                ? (stripSyncFields(treeSnapshot.data()) as TreeMetadata)
                : treeMetadata(local)
              useTalentTreeStore.getState().importTree({
                ...metadata,
                nodes: nodesSnapshot.docs.map(
                  (nodeDocument) => stripSyncFields(nodeDocument.data()) as TalentTreeNode,
                ),
                edges: edgesSnapshot.docs.map(
                  (edgeDocument) => stripSyncFields(edgeDocument.data()) as TalentTreeEdge,
                ),
              })
              setStatus('synced')
              return
            }

            const manifest = parsePublishedManifest(snapshot.data())
            if (!manifest) throw new Error('Manifesto publicado da árvore é inválido.')
            if (cached?.manifest.revision === manifest.revision) {
              if (!disposed) {
                useTalentTreeStore.getState().importTree(cleanFirestoreValue(cached.tree))
                setLastSavedAt(new Date())
                setStatus('synced')
              }
              return
            }
            const loaded = await loadPublishedTalentTree(firestore, manifest, cached)
            if (disposed || currentGeneration !== generation) return
            currentCache = loaded
            useTalentTreeStore.getState().importTree(cleanFirestoreValue(loaded.tree))
            setLastSavedAt(new Date())
            setStatus('synced')
          })().catch((loadError) => {
            if (!disposed && currentGeneration === generation) {
              setError(errorMessage(loadError))
              setStatus('error')
            }
          })
        },
        (listenerError) => {
          if (!disposed) {
            setError(errorMessage(listenerError))
            setStatus('error')
          }
        },
      )

      return () => {
        disposed = true
        unsubscribe()
      }
    }

    let disposed = false
    let applyingRemote = false
    let initialized = false
    let seeding = false
    let pending = emptyPendingChanges()
    let inFlight: PendingTreeChanges | null = null
    let flushTimer: number | null = null
    let flushPromise: Promise<void> | null = null
    let flushRequested = false
    let localUnsubscribe: Unsubscribe | null = null
    let publishedManifest: PublishedTalentTreeManifest | null = null
    let publicationReady = false
    let lastCommittedTree = useTalentTreeStore.getState().tree
    const remote: RemoteTreeState = {
      metadata: null,
      nodes: new Map(),
      edges: new Map(),
      metadataReady: false,
      nodesReady: false,
      edgesReady: false,
    }
    const listenerUnsubscribes: Unsubscribe[] = []

    function reportError(syncError: unknown) {
      if (disposed) return
      setError(errorMessage(syncError))
      setStatus('error')
    }

    function hasLocalWork() {
      return hasPendingChanges(pending) || inFlight !== null
    }

    function remoteTree(): TalentTree {
      const local = useTalentTreeStore.getState().tree
      return {
        id: remote.metadata?.id ?? local.id,
        name: remote.metadata?.name ?? local.name,
        description: remote.metadata?.description ?? local.description,
        version: remote.metadata?.version,
        nodes: [...remote.nodes.values()],
        edges: [...remote.edges.values()],
      }
    }

    async function reconcile(uid: string) {
      if (
        disposed ||
        seeding ||
        !remote.metadataReady ||
        !remote.nodesReady ||
        !remote.edgesReady ||
        !publicationReady
      )
        return

      const remoteIsEmpty = !remote.metadata && remote.nodes.size === 0 && remote.edges.size === 0
      if (!initialized) {
        initialized = true
        if (remoteIsEmpty) {
          if (readOnly) {
            applyingRemote = true
            useTalentTreeStore.getState().importTree(remoteTree())
            applyingRemote = false
          } else {
            seeding = true
            setStatus('syncing')
            try {
              await replaceRemoteTree(firestore, useTalentTreeStore.getState().tree, uid)
            } finally {
              seeding = false
            }
          }
        } else {
          applyingRemote = true
          useTalentTreeStore.getState().importTree(remoteTree())
          applyingRemote = false
        }
        lastCommittedTree = remoteIsEmpty ? useTalentTreeStore.getState().tree : remoteTree()
        publishedManifest = await publishTalentTree(
          firestore,
          lastCommittedTree,
          uid,
          publishedManifest,
        )
        startLocalSync(uid)
        if (!disposed) {
          setLastSavedAt(new Date())
          setStatus('synced')
        }
        return
      }

      // Never replace optimistic local edits with an older listener snapshot.
      // The remote maps continue receiving changes and are applied after flush.
      if (hasLocalWork()) return
      applyingRemote = true
      lastCommittedTree = remoteTree()
      useTalentTreeStore.getState().importTree(lastCommittedTree)
      applyingRemote = false
      setLastSavedAt(new Date())
      setStatus('synced')
    }

    async function flushPending(uid: string) {
      if (readOnly || disposed) return
      if (flushTimer !== null) {
        window.clearTimeout(flushTimer)
        flushTimer = null
      }
      if (flushPromise) {
        flushRequested = true
        await flushPromise
        if (hasPendingChanges(pending)) await flushPending(uid)
        return
      }
      if (!hasPendingChanges(pending)) {
        setStatus('synced')
        return
      }

      const run = async () => {
        do {
          flushRequested = false
          if (!hasPendingChanges(pending)) break
          inFlight = pending
          const changesToCommit = inFlight
          pending = emptyPendingChanges()
          setStatus('syncing')
          setError(null)
          try {
            await commitPendingChanges(firestore, changesToCommit, uid)
          } catch (flushError) {
            mergeFailedChanges(pending, changesToCommit)
            inFlight = null
            reportError(flushError)
            break
          }
          lastCommittedTree = applyTreeChanges(lastCommittedTree, changesToCommit)
          try {
            publishedManifest = await publishTalentTree(
              firestore,
              lastCommittedTree,
              uid,
              publishedManifest,
            )
          } catch (publishError) {
            inFlight = null
            reportError(publishError)
            break
          }
          inFlight = null
          if (!disposed) {
            setLastSavedAt(new Date())
            setStatus(hasPendingChanges(pending) ? 'syncing' : 'synced')
            await reconcile(uid)
          }
        } while (flushRequested)
      }

      flushPromise = run()
      try {
        await flushPromise
      } finally {
        flushPromise = null
      }
    }

    function scheduleFlush(uid: string, immediate: boolean) {
      if (flushTimer !== null) window.clearTimeout(flushTimer)
      setStatus('syncing')
      setError(null)
      flushTimer = window.setTimeout(
        () => {
          flushTimer = null
          void flushPending(uid)
        },
        immediate ? 0 : AUTOSAVE_DEBOUNCE_MS,
      )
    }

    function startLocalSync(uid: string) {
      if (readOnly || localUnsubscribe) return
      localUnsubscribe = useTalentTreeStore.subscribe((state, previousState) => {
        if (disposed || applyingRemote || state.tree === previousState.tree) return
        queueTreeDifference(pending, previousState.tree, state.tree)
        if (!hasPendingChanges(pending)) {
          if (flushTimer !== null) window.clearTimeout(flushTimer)
          flushTimer = null
          if (!inFlight) setStatus('synced')
          return
        }
        if (
          onlySelectedNodeContentChanged(previousState.tree, state.tree, selectedNodeIdRef.current)
        ) {
          if (flushTimer !== null) window.clearTimeout(flushTimer)
          flushTimer = null
          setStatus('pending')
          setError(null)
          return
        }
        scheduleFlush(
          uid,
          onlyNodePositionsChanged(previousState.tree, state.tree) ||
            structureChanged(previousState.tree, state.tree),
        )
      })
    }

    async function connect() {
      setStatus('connecting')
      setError(null)
      try {
        // Public readers do not need a Firebase session. Editors still need a
        // UID for audit fields and are protected by both the route and rules.
        const uid = requireFirebaseUser()
        if (disposed) return
        const refs = treeReferences(firestore)
        const onListenerError = (listenerError: Error) => reportError(listenerError)

        flushNowRef.current = () => flushPending(uid)
        listenerUnsubscribes.push(
          onSnapshot(
            refs.tree,
            (snapshot) => {
              remote.metadata = snapshot.exists()
                ? (stripSyncFields(snapshot.data()) as TreeMetadata)
                : null
              remote.metadataReady = true
              void reconcile(uid).catch(reportError)
            },
            onListenerError,
          ),
          onSnapshot(
            refs.nodes,
            (snapshot) => {
              for (const change of snapshot.docChanges()) {
                if (change.type === 'removed') remote.nodes.delete(change.doc.id)
                else
                  remote.nodes.set(
                    change.doc.id,
                    stripSyncFields(change.doc.data()) as TalentTreeNode,
                  )
              }
              remote.nodesReady = true
              void reconcile(uid).catch(reportError)
            },
            onListenerError,
          ),
          onSnapshot(
            refs.edges,
            (snapshot) => {
              for (const change of snapshot.docChanges()) {
                if (change.type === 'removed') remote.edges.delete(change.doc.id)
                else
                  remote.edges.set(
                    change.doc.id,
                    stripSyncFields(change.doc.data()) as TalentTreeEdge,
                  )
              }
              remote.edgesReady = true
              void reconcile(uid).catch(reportError)
            },
            onListenerError,
          ),
          onSnapshot(
            publishedManifestReference(firestore),
            (snapshot) => {
              publishedManifest = snapshot.exists() ? parsePublishedManifest(snapshot.data()) : null
              publicationReady = true
              void reconcile(uid).catch(reportError)
            },
            onListenerError,
          ),
        )
      } catch (connectError) {
        reportError(connectError)
      }
    }

    void connect()
    return () => {
      disposed = true
      if (flushTimer !== null) window.clearTimeout(flushTimer)
      flushNowRef.current = null
      localUnsubscribe?.()
      for (const unsubscribe of listenerUnsubscribes) unsubscribe()
    }
  }, [readOnly])

  return { saveNow, status, error, lastSavedAt }
}
