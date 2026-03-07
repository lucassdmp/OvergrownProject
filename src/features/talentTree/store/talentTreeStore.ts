import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type {
  TalentTree,
  TalentTreeNode,
  TalentTreeEdge,
  TalentNodeData,
  TalentNodeType,
} from '../../../types/talentTree'
import { defaultNodeData } from '../../../types/talentTree'

// ── Deterministic serialization ───────────────────────────────────────────────

export function serializeTree(tree: TalentTree): string {
  const sorted: TalentTree = {
    ...tree,
    nodes: [...tree.nodes].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...tree.edges].sort((a, b) => a.id.localeCompare(b.id)),
  }
  return JSON.stringify(sorted, null, 2)
}

// ── Default tree ──────────────────────────────────────────────────────────────

const DEFAULT_TREE: TalentTree = {
  id: crypto.randomUUID(),
  name: 'Nova Árvore',
  description: '',
  nodes: [],
  edges: [],
}

// ── Store shape ───────────────────────────────────────────────────────────────

interface TalentTreeState {
  tree: TalentTree

  setTreeName: (name: string) => void
  setTreeDescription: (desc: string) => void

  addNode: (x: number, y: number, type: TalentNodeType) => string
  removeNode: (id: string) => void
  moveNode: (id: string, x: number, y: number) => void
  updateNodeData: (id: string, data: TalentNodeData) => void

  addEdge: (from: string, to: string) => void
  removeEdge: (id: string) => void
  toggleEdge: (from: string, to: string) => void

  /** Move several nodes at once (used for multi-drag) */
  moveNodes: (moves: { id: string; x: number; y: number }[]) => void
  /** Bulk-add nodes (used for paste) */
  addNodes: (nodes: TalentTreeNode[]) => void
  /** Remove multiple nodes and their edges at once */
  removeNodes: (ids: string[]) => void

  importTree: (tree: TalentTree) => void
  resetTree: () => void
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useTalentTreeStore = create<TalentTreeState>()(
  devtools(
    persist(
      (set, get) => ({
        tree: DEFAULT_TREE,

        setTreeName: (name) =>
          set((s) => ({ tree: { ...s.tree, name } }), false, 'setTreeName'),

        setTreeDescription: (desc) =>
          set((s) => ({ tree: { ...s.tree, description: desc } }), false, 'setTreeDescription'),

        addNode: (x, y, type) => {
          const id = crypto.randomUUID()
          const node: TalentTreeNode = { id, x, y, data: defaultNodeData(type) }
          set(
            (s) => ({ tree: { ...s.tree, nodes: [...s.tree.nodes, node] } }),
            false,
            'addNode',
          )
          return id
        },

        removeNode: (id) =>
          set(
            (s) => ({
              tree: {
                ...s.tree,
                nodes: s.tree.nodes.filter((n) => n.id !== id),
                edges: s.tree.edges.filter((e) => e.from !== id && e.to !== id),
              },
            }),
            false,
            'removeNode',
          ),

        moveNode: (id, x, y) =>
          set(
            (s) => ({
              tree: {
                ...s.tree,
                nodes: s.tree.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
              },
            }),
            false,
            'moveNode',
          ),

        updateNodeData: (id, data) =>
          set(
            (s) => ({
              tree: {
                ...s.tree,
                nodes: s.tree.nodes.map((n) => (n.id === id ? { ...n, data } : n)),
              },
            }),
            false,
            'updateNodeData',
          ),

        addEdge: (from, to) => {
          const id = [from, to].sort().join('--')
          // prevent duplicates
          if (get().tree.edges.some((e) => e.id === id)) return
          const edge: TalentTreeEdge = { id, from, to }
          set(
            (s) => ({ tree: { ...s.tree, edges: [...s.tree.edges, edge] } }),
            false,
            'addEdge',
          )
        },

        removeEdge: (id) =>
          set(
            (s) => ({ tree: { ...s.tree, edges: s.tree.edges.filter((e) => e.id !== id) } }),
            false,
            'removeEdge',
          ),

        toggleEdge: (from, to) => {
          const id = [from, to].sort().join('--')
          const exists = get().tree.edges.some((e) => e.id === id)
          if (exists) {
            set(
              (s) => ({ tree: { ...s.tree, edges: s.tree.edges.filter((e) => e.id !== id) } }),
              false,
              'toggleEdge/remove',
            )
          } else {
            const edge: TalentTreeEdge = { id, from, to }
            set(
              (s) => ({ tree: { ...s.tree, edges: [...s.tree.edges, edge] } }),
              false,
              'toggleEdge/add',
            )
          }
        },

        moveNodes: (moves) =>
          set(
            (s) => ({
              tree: {
                ...s.tree,
                nodes: s.tree.nodes.map((n) => {
                  const m = moves.find((mv) => mv.id === n.id)
                  return m ? { ...n, x: m.x, y: m.y } : n
                }),
              },
            }),
            false,
            'moveNodes',
          ),

        addNodes: (nodes) =>
          set(
            (s) => ({ tree: { ...s.tree, nodes: [...s.tree.nodes, ...nodes] } }),
            false,
            'addNodes',
          ),

        removeNodes: (ids) =>
          set(
            (s) => ({
              tree: {
                ...s.tree,
                nodes: s.tree.nodes.filter((n) => !ids.includes(n.id)),
                edges: s.tree.edges.filter((e) => !ids.includes(e.from) && !ids.includes(e.to)),
              },
            }),
            false,
            'removeNodes',
          ),

        importTree: (tree) =>
          set(() => ({ tree }), false, 'importTree'),

        resetTree: () =>
          set(
            () => ({ tree: { ...DEFAULT_TREE, id: crypto.randomUUID() } }),
            false,
            'resetTree',
          ),
      }),
      { name: 'overgrown-talent-tree' },
    ),
    { name: 'TalentTreeStore' },
  ),
)
