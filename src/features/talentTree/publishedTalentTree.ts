import {
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore'
import type { TalentTree, TalentTreeEdge, TalentTreeNode } from '../../types/talentTree'
import { firebaseTreeId } from '../../services/firebase'

export type PublishedChunkKind = 'nodes' | 'edges' | 'images'
type TreeMetadata = Omit<TalentTree, 'nodes' | 'edges'>

export interface PublishedChunkDescriptor {
  id: string
  kind: PublishedChunkKind
  hash: string
  count: number
}

export interface PublishedTalentTreeManifest {
  schemaVersion: 1
  revision: string
  tree: TreeMetadata
  chunks: PublishedChunkDescriptor[]
}

export interface PublishedTalentTreeChunk {
  kind: PublishedChunkKind
  hash: string
  items: unknown[]
}

export interface CachedPublishedTalentTree {
  manifest: PublishedTalentTreeManifest
  chunks: Record<string, PublishedTalentTreeChunk>
  tree: TalentTree
}

const BUCKET_COUNT = 32
const TARGET_CHUNK_BYTES = 550 * 1024
const MAX_SINGLE_ITEM_BYTES = 900 * 1024
const BATCH_SIZE = 400
const CACHE_DATABASE = 'overgrown-published-tree-cache'
const CACHE_STORE = 'trees'
const memoryCache = new Map<string, CachedPublishedTalentTree>()
let cacheDatabasePromise: Promise<IDBDatabase> | null = null

function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function utf8Size(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength
}

function bucketFor(id: string) {
  let hash = 2166136261
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % BUCKET_COUNT
}

async function contentHash(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function publicationReferences(firestore: Firestore) {
  const tree = doc(firestore, 'talentTrees', firebaseTreeId)
  return {
    manifest: doc(tree, 'publications', 'current'),
    chunk: (chunkId: string) => doc(tree, 'publishedChunks', chunkId),
  }
}

function splitBucket(kind: PublishedChunkKind, bucket: number, rawItems: unknown[]) {
  const items = [...rawItems].sort((left, right) => {
    const leftId = String((left as { id?: unknown }).id ?? '')
    const rightId = String((right as { id?: unknown }).id ?? '')
    return leftId.localeCompare(rightId)
  })
  const parts: unknown[][] = []
  let current: unknown[] = []
  let currentBytes = 64

  for (const item of items) {
    const itemBytes = utf8Size(item) + 2
    if (itemBytes > MAX_SINGLE_ITEM_BYTES) {
      throw new Error(
        `O item ${String((item as { id?: unknown }).id)} excede o limite do Firestore.`,
      )
    }
    if (current.length > 0 && currentBytes + itemBytes > TARGET_CHUNK_BYTES) {
      parts.push(current)
      current = []
      currentBytes = 64
    }
    current.push(item)
    currentBytes += itemBytes
  }
  if (current.length > 0) parts.push(current)

  return parts.map((part, index) => ({
    id: `${kind}-${bucket.toString().padStart(2, '0')}-${index.toString().padStart(3, '0')}`,
    kind,
    items: part,
  }))
}

export async function buildPublishedTalentTree(tree: TalentTree) {
  const buckets: Record<PublishedChunkKind, unknown[][]> = {
    nodes: Array.from({ length: BUCKET_COUNT }, () => []),
    edges: Array.from({ length: BUCKET_COUNT }, () => []),
    images: Array.from({ length: BUCKET_COUNT }, () => []),
  }

  for (const node of tree.nodes) {
    const { imageBase64, ...publishedNode } = clean(node)
    const bucket = bucketFor(node.id)
    buckets.nodes[bucket].push(publishedNode)
    if (imageBase64) buckets.images[bucket].push({ id: node.id, imageBase64 })
  }
  for (const edge of tree.edges) {
    buckets.edges[bucketFor(edge.id)].push(clean(edge))
  }

  const rawChunks = (Object.keys(buckets) as PublishedChunkKind[]).flatMap((kind) =>
    buckets[kind].flatMap((items, bucket) => splitBucket(kind, bucket, items)),
  )
  const chunkEntries = await Promise.all(
    rawChunks.map(async ({ id, kind, items }) => {
      const hash = await contentHash({ kind, items })
      return [id, { kind, hash, items }] as const
    }),
  )
  const chunks = new Map<string, PublishedTalentTreeChunk>(chunkEntries)
  const descriptors = [...chunks.entries()]
    .map(([id, chunk]) => ({ id, kind: chunk.kind, hash: chunk.hash, count: chunk.items.length }))
    .sort((left, right) => left.id.localeCompare(right.id))
  const metadata: TreeMetadata = clean({
    id: tree.id,
    name: tree.name,
    description: tree.description,
    version: tree.version,
  })
  const revision = await contentHash({ tree: metadata, chunks: descriptors })
  const manifest: PublishedTalentTreeManifest = {
    schemaVersion: 1,
    revision,
    tree: metadata,
    chunks: descriptors,
  }
  return { manifest, chunks }
}

export function parsePublishedManifest(data: DocumentData): PublishedTalentTreeManifest | null {
  if (
    data.schemaVersion !== 1 ||
    typeof data.revision !== 'string' ||
    !data.tree ||
    !Array.isArray(data.chunks)
  ) {
    return null
  }
  return clean({
    schemaVersion: 1,
    revision: data.revision,
    tree: data.tree,
    chunks: data.chunks,
  }) as PublishedTalentTreeManifest
}

export async function publishTalentTree(
  firestore: Firestore,
  tree: TalentTree,
  uid: string,
  previousManifest: PublishedTalentTreeManifest | null,
) {
  const refs = publicationReferences(firestore)
  const publication = await buildPublishedTalentTree(tree)
  if (previousManifest?.revision === publication.manifest.revision) return publication.manifest

  const previousChunks = new Map(
    previousManifest?.chunks.map((descriptor) => [descriptor.id, descriptor]) ?? [],
  )
  const chunkWrites = [...publication.chunks.entries()].filter(
    ([id, chunk]) => previousChunks.get(id)?.hash !== chunk.hash,
  )
  const nextChunkIds = new Set(publication.manifest.chunks.map((descriptor) => descriptor.id))
  const obsoleteChunkIds = [...previousChunks.keys()].filter((id) => !nextChunkIds.has(id))

  for (let offset = 0; offset < chunkWrites.length; offset += BATCH_SIZE) {
    const batch = writeBatch(firestore)
    for (const [id, chunk] of chunkWrites.slice(offset, offset + BATCH_SIZE)) {
      batch.set(refs.chunk(id), {
        ...clean(chunk),
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      })
    }
    await batch.commit()
  }

  const manifestBatch = writeBatch(firestore)
  manifestBatch.set(refs.manifest, {
    ...clean(publication.manifest),
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  })
  await manifestBatch.commit()

  for (let offset = 0; offset < obsoleteChunkIds.length; offset += BATCH_SIZE) {
    const batch = writeBatch(firestore)
    for (const id of obsoleteChunkIds.slice(offset, offset + BATCH_SIZE)) {
      batch.delete(refs.chunk(id))
    }
    await batch.commit()
  }
  return publication.manifest
}

function assemblePublishedTree(
  manifest: PublishedTalentTreeManifest,
  chunks: Record<string, PublishedTalentTreeChunk>,
): TalentTree {
  const nodes: TalentTreeNode[] = []
  const edges: TalentTreeEdge[] = []
  const images = new Map<string, string>()
  for (const descriptor of manifest.chunks) {
    const chunk = chunks[descriptor.id]
    if (!chunk || chunk.hash !== descriptor.hash) continue
    if (chunk.kind === 'nodes') nodes.push(...(chunk.items as TalentTreeNode[]))
    else if (chunk.kind === 'edges') edges.push(...(chunk.items as TalentTreeEdge[]))
    else {
      for (const item of chunk.items as Array<{ id: string; imageBase64: string }>) {
        images.set(item.id, item.imageBase64)
      }
    }
  }
  return {
    ...manifest.tree,
    nodes: nodes.map((node) =>
      images.has(node.id) ? { ...node, imageBase64: images.get(node.id) } : node,
    ),
    edges,
  }
}

export async function loadPublishedTalentTree(
  firestore: Firestore,
  manifest: PublishedTalentTreeManifest,
  cached: CachedPublishedTalentTree | null,
) {
  const refs = publicationReferences(firestore)
  const chunks: Record<string, PublishedTalentTreeChunk> = {}
  const missing = manifest.chunks.filter((descriptor) => {
    const cachedChunk = cached?.chunks[descriptor.id]
    if (cachedChunk?.hash !== descriptor.hash) return true
    chunks[descriptor.id] = cachedChunk
    return false
  })
  const snapshots = await Promise.all(
    missing.map((descriptor) => getDoc(refs.chunk(descriptor.id))),
  )
  snapshots.forEach((snapshot, index) => {
    if (!snapshot.exists()) throw new Error(`Chunk publicado ausente: ${missing[index].id}`)
    const data = snapshot.data()
    chunks[missing[index].id] = clean({
      kind: data.kind,
      hash: data.hash,
      items: data.items,
    }) as PublishedTalentTreeChunk
  })
  const tree = assemblePublishedTree(manifest, chunks)
  const result: CachedPublishedTalentTree = { manifest, chunks, tree }
  await setCachedPublishedTalentTree(firebaseTreeId, result)
  return result
}

function openCacheDatabase(): Promise<IDBDatabase> | null {
  if (typeof indexedDB === 'undefined') return null
  if (cacheDatabasePromise) return cacheDatabasePromise
  cacheDatabasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(CACHE_DATABASE, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(CACHE_STORE)) {
        request.result.createObjectStore(CACHE_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Cache da árvore bloqueado por outra aba.'))
  }).catch((error) => {
    cacheDatabasePromise = null
    throw error
  })
  return cacheDatabasePromise
}

async function cacheRequest<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const databaseRequest = openCacheDatabase()
  if (!databaseRequest) throw new Error('IndexedDB indisponível.')
  const database = await databaseRequest
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(CACHE_STORE, mode)
    const request = operation(transaction.objectStore(CACHE_STORE))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function getCachedPublishedTalentTree(treeId = firebaseTreeId) {
  const memory = memoryCache.get(treeId)
  if (memory) return memory
  try {
    const cached = await cacheRequest<CachedPublishedTalentTree | undefined>('readonly', (store) =>
      store.get(treeId),
    )
    if (cached) memoryCache.set(treeId, cached)
    return cached ?? null
  } catch {
    return null
  }
}

export async function setCachedPublishedTalentTree(
  treeId: string,
  value: CachedPublishedTalentTree,
) {
  memoryCache.set(treeId, value)
  try {
    await cacheRequest('readwrite', (store) => store.put(value, treeId))
  } catch {
    // Public cache failures never block the live tree.
  }
}

export function publishedManifestReference(firestore: Firestore) {
  return publicationReferences(firestore).manifest
}
