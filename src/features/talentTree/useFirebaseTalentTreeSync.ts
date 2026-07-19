import { useCallback, useEffect, useState } from 'react'
import {
  collection,
  deleteDoc,
  doc,
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

export type FirebaseTreeSyncStatus = 'disabled' | 'connecting' | 'syncing' | 'synced' | 'error'

interface FirebaseTreeSyncResult {
  saveNow: () => Promise<void>
  status: FirebaseTreeSyncStatus
  error: string | null
  lastSavedAt: Date | null
}

interface RemoteTreeState {
  metadata: Omit<TalentTree, 'nodes' | 'edges'> | null
  nodes: Map<string, TalentTreeNode>
  edges: Map<string, TalentTreeEdge>
  metadataReady: boolean
  nodesReady: boolean
  edgesReady: boolean
}

const BATCH_SIZE = 400

function cleanFirestoreValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function comparable(value: unknown): string {
  return JSON.stringify(cleanFirestoreValue(value))
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

function treeReferences(firestore: Firestore) {
  const tree = doc(firestore, 'talentTrees', firebaseTreeId)
  return {
    tree,
    nodes: collection(tree, 'nodes'),
    edges: collection(tree, 'edges'),
  }
}

async function writeTreeMetadata(firestore: Firestore, tree: TalentTree, uid: string) {
  const refs = treeReferences(firestore)
  const metadata = cleanFirestoreValue({
    id: tree.id,
    name: tree.name,
    description: tree.description,
    version: tree.version,
  })
  await setDoc(
    refs.tree,
    { ...metadata, updatedAt: serverTimestamp(), updatedBy: uid },
    { merge: true },
  )
}

async function writeNode(firestore: Firestore, node: TalentTreeNode, uid: string) {
  const refs = treeReferences(firestore)
  await setDoc(doc(refs.nodes, node.id), {
    ...cleanFirestoreValue(node),
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  })
}

async function writeEdge(firestore: Firestore, edge: TalentTreeEdge, uid: string) {
  const refs = treeReferences(firestore)
  await setDoc(doc(refs.edges, edge.id), {
    ...cleanFirestoreValue(edge),
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  })
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

async function syncTreeDifference(
  firestore: Firestore,
  previous: TalentTree,
  next: TalentTree,
  uid: string,
) {
  const tasks: Promise<unknown>[] = []
  const previousMetadata = {
    id: previous.id,
    name: previous.name,
    description: previous.description,
    version: previous.version,
  }
  const nextMetadata = {
    id: next.id,
    name: next.name,
    description: next.description,
    version: next.version,
  }
  if (comparable(previousMetadata) !== comparable(nextMetadata)) {
    tasks.push(writeTreeMetadata(firestore, next, uid))
  }

  const previousNodes = new Map(previous.nodes.map((node) => [node.id, node]))
  const nextNodes = new Map(next.nodes.map((node) => [node.id, node]))
  for (const [id, node] of nextNodes) {
    if (comparable(previousNodes.get(id)) !== comparable(node)) {
      tasks.push(writeNode(firestore, node, uid))
    }
  }
  for (const id of previousNodes.keys()) {
    if (!nextNodes.has(id)) {
      tasks.push(deleteDoc(doc(treeReferences(firestore).nodes, id)))
    }
  }

  const previousEdges = new Map(previous.edges.map((edge) => [edge.id, edge]))
  const nextEdges = new Map(next.edges.map((edge) => [edge.id, edge]))
  for (const [id, edge] of nextEdges) {
    if (comparable(previousEdges.get(id)) !== comparable(edge)) {
      tasks.push(writeEdge(firestore, edge, uid))
    }
  }
  for (const id of previousEdges.keys()) {
    if (!nextEdges.has(id)) {
      tasks.push(deleteDoc(doc(treeReferences(firestore).edges, id)))
    }
  }

  await Promise.all(tasks)
}

export function useFirebaseTalentTreeSync({
  readOnly = false,
}: { readOnly?: boolean } = {}): FirebaseTreeSyncResult {
  const [status, setStatus] = useState<FirebaseTreeSyncStatus>(
    isFirebaseConfigured ? 'connecting' : 'disabled',
  )
  const [error, setError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  const saveNow = useCallback(async () => {
    if (readOnly) return
    const services = getFirebaseServices()
    if (!services) return
    setStatus('syncing')
    setError(null)
    try {
      const uid = requireFirebaseUser()
      await replaceRemoteTree(services.firestore, useTalentTreeStore.getState().tree, uid)
      setLastSavedAt(new Date())
      setStatus('synced')
    } catch (saveError) {
      setError(errorMessage(saveError))
      setStatus('error')
    }
  }, [readOnly])

  useEffect(() => {
    const services = getFirebaseServices()
    if (!services) return
    const firestore = services.firestore

    let disposed = false
    let applyingRemote = false
    let initialized = false
    let seeding = false
    let localUnsubscribe: Unsubscribe | null = null
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

    function startLocalSync(uid: string) {
      if (readOnly || localUnsubscribe) return
      localUnsubscribe = useTalentTreeStore.subscribe((state, previousState) => {
        if (disposed || applyingRemote || state.tree === previousState.tree) return
        setStatus('syncing')
        setError(null)
        void syncTreeDifference(firestore, previousState.tree, state.tree, uid)
          .then(() => {
            if (disposed) return
            setLastSavedAt(new Date())
            setStatus('synced')
          })
          .catch(reportError)
      })
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
      if (disposed || seeding || !remote.metadataReady || !remote.nodesReady || !remote.edgesReady)
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
        startLocalSync(uid)
        if (!disposed) {
          setLastSavedAt(new Date())
          setStatus('synced')
        }
        return
      }

      applyingRemote = true
      useTalentTreeStore.getState().importTree(remoteTree())
      applyingRemote = false
      setLastSavedAt(new Date())
      setStatus('synced')
    }

    async function connect() {
      setStatus('connecting')
      setError(null)
      try {
        // Public readers do not need a Firebase session. Editors still need a
        // UID for audit fields and are protected by both the route and rules.
        const uid = readOnly ? '' : requireFirebaseUser()
        if (disposed) return
        const refs = treeReferences(firestore)
        const onListenerError = (listenerError: Error) => reportError(listenerError)

        listenerUnsubscribes.push(
          onSnapshot(
            refs.tree,
            (snapshot) => {
              remote.metadata = snapshot.exists()
                ? (stripSyncFields(snapshot.data()) as Omit<TalentTree, 'nodes' | 'edges'>)
                : null
              remote.metadataReady = true
              void reconcile(uid).catch(reportError)
            },
            onListenerError,
          ),
          onSnapshot(
            refs.nodes,
            (snapshot) => {
              remote.nodes = new Map(
                snapshot.docs.map((nodeDocument) => [
                  nodeDocument.id,
                  stripSyncFields(nodeDocument.data()) as TalentTreeNode,
                ]),
              )
              remote.nodesReady = true
              void reconcile(uid).catch(reportError)
            },
            onListenerError,
          ),
          onSnapshot(
            refs.edges,
            (snapshot) => {
              remote.edges = new Map(
                snapshot.docs.map((edgeDocument) => [
                  edgeDocument.id,
                  stripSyncFields(edgeDocument.data()) as TalentTreeEdge,
                ]),
              )
              remote.edgesReady = true
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
      localUnsubscribe?.()
      for (const unsubscribe of listenerUnsubscribes) unsubscribe()
    }
  }, [readOnly])

  return { saveNow, status, error, lastSavedAt }
}
