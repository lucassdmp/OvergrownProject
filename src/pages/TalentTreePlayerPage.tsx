import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTalentTreeStore } from '../features/talentTree/store/talentTreeStore'
import { useCharacterStore } from '../features/character/store/characterStore'
import {
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  nodeTooltip,
  talentNodeCost,
  type TalentTreeNode,
} from '../types/talentTree'
import { useDefaultTreeAutoLoad } from '../features/talentTree/defaultTree'
import { nodeRadius, TalentNodeVisual } from '../features/talentTree/components/TalentNodeVisual'
import { ELEMENTS } from '../data/elements'
import { MAGIC_TYPES } from '../data/magicTypes'
import { ATTRIBUTE_LABELS, type AttributeName } from '../types/game'
import { useSaveShortcut } from '../hooks/useSaveShortcut'
import { downloadTextFile, fileNamePart } from '../utils/downloadFile'
import { serializeCharacterFile } from '../features/character/utils/characterFile'
import { nodeMatchesSearch } from '../features/talentTree/nodeSearch'

// ── Point cost (player/link nodes are free; per-node override via node.cost) ──
const nodeCost = talentNodeCost

// ── Adjacency: node is reachable if it's connected to any acquired node ───────
// ── Attribute picker modal ────────────────────────────────────────────────────

const ATTRIBUTES: AttributeName[] = ['might', 'grace', 'wisdom', 'sense', 'fortitude']

function AttributePicker({
  value,
  onChange,
  onConfirm,
  onCancel,
}: {
  value: AttributeName | null
  onChange: (a: AttributeName) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="flex w-72 flex-col gap-3 rounded-2xl border border-amber-700/50 bg-gray-900 p-5 shadow-2xl">
        <h3 className="text-sm font-bold tracking-widest text-amber-400 uppercase">
          Escolha o Atributo
        </h3>
        <p className="text-xs text-gray-400">
          Este nó permite que você escolha qual atributo será aumentado.
        </p>
        <div className="flex flex-col gap-1.5">
          {ATTRIBUTES.map((attr) => (
            <button
              key={attr}
              onClick={() => onChange(attr)}
              className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${
                value === attr
                  ? 'border-amber-500 bg-amber-600 text-white'
                  : 'border-gray-700 text-gray-300 hover:border-amber-600 hover:text-amber-300'
              }`}
            >
              {ATTRIBUTE_LABELS[attr]}
            </button>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-700 py-1.5 text-xs text-gray-400 transition hover:text-white"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={!value}
            className="flex-1 rounded-lg bg-amber-600 py-1.5 text-xs font-bold text-white transition hover:bg-amber-500 disabled:opacity-40"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Context menu ──────────────────────────────────────────────────────────────

function NodeContextMenu({
  node,
  acquired,
  canAcquire,
  sx,
  sy,
  onAcquire,
  onRemove,
  onClose,
}: {
  node: TalentTreeNode
  acquired: boolean
  canAcquire: boolean
  sx: number
  sy: number
  onAcquire: () => void
  onRemove: () => void
  onClose: () => void
}) {
  const { stroke } = NODE_TYPE_COLORS[node.data.type]
  const lines = nodeTooltip(node.data).split('\n')

  // Clamp against a conservative menu footprint; CSS may render it smaller.
  const pos = {
    left: Math.max(8, Math.min(sx, window.innerWidth - 280)),
    top: Math.max(8, Math.min(sy, window.innerHeight - 420)),
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault()
          onClose()
        }}
      />
      <div
        className="fixed z-50 min-w-[190px] rounded-xl border border-gray-700 bg-gray-900 py-1.5 text-sm shadow-2xl"
        style={{ left: pos.left, top: pos.top }}
      >
        {/* Node type + name header */}
        <div className="mb-1 border-b border-gray-800 px-4 py-1.5">
          <span
            className="text-[10px] font-bold tracking-widest uppercase"
            style={{ color: stroke }}
          >
            {NODE_TYPE_LABELS[node.data.type]}
          </span>
          {'name' in node.data && (node.data as { name: string }).name && (
            <p className="truncate text-xs font-semibold text-white">
              {(node.data as { name: string }).name}
            </p>
          )}
          <p className="mt-0.5 text-[10px] leading-relaxed whitespace-pre-wrap text-gray-500">
            {lines[0]}
          </p>
        </div>

        {/* Magic node element/type tags */}
        {node.data.type === 'magic' && (
          <div className="mb-1 flex flex-wrap gap-1 border-b border-gray-800 px-4 pb-1.5">
            {node.data.elements.map((elId) => {
              const el = ELEMENTS.find((e) => e.id === elId)
              return el ? (
                <span
                  key={elId}
                  className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                  style={{ background: el.color, color: el.textColor }}
                >
                  {el.label}
                </span>
              ) : null
            })}
            {node.data.magicTypes.map((typeId) => {
              const mt = MAGIC_TYPES.find((t) => t.id === typeId)
              return mt ? (
                <span
                  key={typeId}
                  className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                  style={{ background: mt.color, color: mt.textColor }}
                >
                  {mt.label}
                </span>
              ) : null
            })}
          </div>
        )}

        {acquired ? (
          <button
            className="w-full px-4 py-1.5 text-left text-rose-400 hover:bg-rose-950/40"
            onClick={() => {
              onRemove()
              onClose()
            }}
          >
            ✕ Remover nó
          </button>
        ) : (
          <button
            disabled={!canAcquire}
            className={`w-full px-4 py-1.5 text-left ${
              canAcquire
                ? 'text-amber-400 hover:bg-amber-950/40'
                : 'cursor-not-allowed text-gray-600'
            }`}
            onClick={() => {
              if (canAcquire) {
                onAcquire()
                onClose()
              }
            }}
          >
            ✦ Adquirir nó{!canAcquire && ' (sem acesso)'}
          </button>
        )}
      </div>
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TalentTreePlayerPage() {
  const navigate = useNavigate()
  useDefaultTreeAutoLoad()
  const tree = useTalentTreeStore((s) => s.tree)
  const character = useCharacterStore((s) => s.character)
  const acquireNode = useCharacterStore((s) => s.acquireNode)
  const removeNode = useCharacterStore((s) => s.removeNode)
  const setNodeConfig = useCharacterStore((s) => s.setNodeConfig)

  const handleExport = useCallback(() => {
    downloadTextFile(
      serializeCharacterFile(character, tree),
      `${fileNamePart(character.name, 'personagem')}.json`,
    )
  }, [character, tree])

  useSaveShortcut(handleExport)

  // Hydration guard
  const [hydrated, setHydrated] = useState(() => useTalentTreeStore.persist.hasHydrated())
  useEffect(() => {
    if (useTalentTreeStore.persist.hasHydrated()) return
    const unsub = useTalentTreeStore.persist.onFinishHydration(() => setHydrated(true))
    return unsub
  }, [])

  const acquiredSet = useMemo(() => new Set(character.acquiredNodeIds), [character.acquiredNodeIds])
  const nodeById = useMemo(() => new Map(tree.nodes.map((node) => [node.id, node])), [tree.nodes])
  const adjacency = useMemo(() => {
    const map = new Map<string, string[]>(tree.nodes.map((node) => [node.id, []]))
    for (const edge of tree.edges) {
      map.get(edge.from)?.push(edge.to)
      map.get(edge.to)?.push(edge.from)
    }
    return map
  }, [tree.edges, tree.nodes])
  const reachableSet = useMemo(() => {
    const reachable = new Set<string>()
    for (const node of tree.nodes) {
      if (node.data.type === 'player') {
        reachable.add(node.id)
        continue
      }
      if (node.prerequisiteNodeIds?.some((requiredId) => !acquiredSet.has(requiredId))) continue
      if ((adjacency.get(node.id) ?? []).some((neighborId) => acquiredSet.has(neighborId))) {
        reachable.add(node.id)
      }
    }
    return reachable
  }, [acquiredSet, adjacency, tree.nodes])
  const nodeConfigs = character.nodeConfigs ?? {}
  const playerNodes = useMemo(
    () => tree.nodes.filter((node) => node.data.type === 'player'),
    [tree.nodes],
  )
  const acquiredPlayerCount = useMemo(
    () => playerNodes.filter((node) => acquiredSet.has(node.id)).length,
    [acquiredSet, playerNodes],
  )
  const unacquiredPlayerNodes = useMemo(
    () => playerNodes.filter((node) => !acquiredSet.has(node.id)),
    [acquiredSet, playerNodes],
  )
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const selectedNode = selectedNodeId ? (nodeById.get(selectedNodeId) ?? null) : null
  const [searchQuery, setSearchQuery] = useState('')
  const searchActive = searchQuery.trim().length > 0
  const matchingNodeIds = useMemo(
    () =>
      new Set(
        tree.nodes.filter((node) => nodeMatchesSearch(node, searchQuery)).map((node) => node.id),
      ),
    [searchQuery, tree.nodes],
  )
  const edgePaths = useMemo(() => {
    const paths = { acquired: '', available: '', dimmed: '' }
    for (const edge of tree.edges) {
      const from = nodeById.get(edge.from)
      const to = nodeById.get(edge.to)
      if (!from || !to) continue
      const segment = `M${from.x} ${from.y}L${to.x} ${to.y}`
      const touchesMatch = matchingNodeIds.has(from.id) || matchingNodeIds.has(to.id)
      if (searchActive && !touchesMatch) paths.dimmed += segment
      else if (acquiredSet.has(from.id) && acquiredSet.has(to.id)) paths.acquired += segment
      else paths.available += segment
    }
    return paths
  }, [acquiredSet, matchingNodeIds, nodeById, searchActive, tree.edges])

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<{ node: TalentTreeNode; sx: number; sy: number } | null>(
    null,
  )

  // Attribute picker
  const [attrPicker, setAttrPicker] = useState<{
    nodeId: string
    current: AttributeName | null
  } | null>(null)

  // ── Points budget ─────────────────────────────────────────────────────────
  // Nós de jogador: sempre acessíveis, custo escalonado — o 1º é gratuito,
  // o 2º custa 1, o 3º custa 2, e assim por diante (independe da ordem).
  const divinity = character.divinity ?? 0
  const totalPoints = (divinity + 1) * 5
  const nextPlayerNodeCost = acquiredPlayerCount
  const playerNodesSpent = (acquiredPlayerCount * (acquiredPlayerCount - 1)) / 2
  const spentPoints = useMemo(
    () =>
      tree.nodes
        .filter((node) => acquiredSet.has(node.id) && node.data.type !== 'player')
        .reduce((sum, node) => sum + nodeCost(node), 0) + playerNodesSpent,
    [acquiredSet, playerNodesSpent, tree.nodes],
  )
  const remainingPoints = totalPoints - spentPoints
  const effectiveCost = (node: TalentTreeNode) =>
    node.data.type === 'player'
      ? acquiredSet.has(node.id)
        ? 0
        : nextPlayerNodeCost
      : nodeCost(node)
  const canAfford = (node: TalentTreeNode) => remainingPoints >= effectiveCost(node)

  // ── Viewport pan/zoom ─────────────────────────────────────────────────────
  const svgRef = useRef<SVGSVGElement>(null)
  const worldRef = useRef<SVGGElement>(null)
  const viewportRef = useRef({ x: 0, y: 0, zoom: 1 })
  const pendingViewportRef = useRef({ x: 0, y: 0, zoom: 1 })
  const viewportFrameRef = useRef<number | null>(null)
  const fittedTreeKey = useRef<string | null>(null)
  const panning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 })

  const applyViewport = useCallback((next: { x: number; y: number; zoom: number }) => {
    viewportRef.current = next
    pendingViewportRef.current = next
    if (viewportFrameRef.current !== null) return
    viewportFrameRef.current = requestAnimationFrame(() => {
      const viewport = pendingViewportRef.current
      const world = worldRef.current
      if (world) {
        world.setAttribute(
          'transform',
          `translate(${viewport.x},${viewport.y}) scale(${viewport.zoom})`,
        )
        world.dataset.lod = viewport.zoom < 0.16 ? 'low' : viewport.zoom < 0.32 ? 'medium' : 'full'
      }
      viewportFrameRef.current = null
    })
  }, [])

  useEffect(
    () => () => {
      if (viewportFrameRef.current !== null) cancelAnimationFrame(viewportFrameRef.current)
    },
    [],
  )

  const onMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.button !== 1) return
    panning.current = true
    const viewport = viewportRef.current
    panStart.current = { x: e.clientX, y: e.clientY, vx: viewport.x, vy: viewport.y }
  }, [])

  const onMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!panning.current) return
      applyViewport({
        zoom: viewportRef.current.zoom,
        x: panStart.current.vx + e.clientX - panStart.current.x,
        y: panStart.current.vy + e.clientY - panStart.current.y,
      })
    },
    [applyViewport],
  )

  const onMouseUp = useCallback(() => {
    panning.current = false
  }, [])

  const onWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      const viewport = viewportRef.current
      const newZoom = Math.max(0.04, Math.min(3, viewport.zoom * factor))
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return applyViewport({ ...viewport, zoom: newZoom })
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      applyViewport({
        zoom: newZoom,
        x: cx - (cx - viewport.x) * (newZoom / viewport.zoom),
        y: cy - (cy - viewport.y) * (newZoom / viewport.zoom),
      })
    },
    [applyViewport],
  )

  const fitTree = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || tree.nodes.length === 0) return
    const minX = Math.min(...tree.nodes.map((node) => node.x))
    const maxX = Math.max(...tree.nodes.map((node) => node.x))
    const minY = Math.min(...tree.nodes.map((node) => node.y))
    const maxY = Math.max(...tree.nodes.map((node) => node.y))
    const width = Math.max(1, maxX - minX + 240)
    const height = Math.max(1, maxY - minY + 240)
    const zoom = Math.max(0.04, Math.min(1, (rect.width - 48) / width, (rect.height - 48) / height))
    applyViewport({
      zoom,
      x: rect.width / 2 - ((minX + maxX) / 2) * zoom,
      y: rect.height / 2 - ((minY + maxY) / 2) * zoom,
    })
  }, [applyViewport, tree.nodes])

  useEffect(() => {
    const key = `${tree.id}:${tree.version ?? 0}`
    if (fittedTreeKey.current === key || tree.nodes.length === 0) return
    fittedTreeKey.current = key
    const frame = requestAnimationFrame(fitTree)
    return () => cancelAnimationFrame(frame)
  }, [fitTree, tree.id, tree.nodes.length, tree.version])

  // ── Acquire helpers ───────────────────────────────────────────────────────

  function getAdjacentAttr(nodeId: string): AttributeName | null {
    for (const neighborId of adjacency.get(nodeId) ?? []) {
      if (!acquiredSet.has(neighborId)) continue
      const neighbor = nodeById.get(neighborId)
      if (!neighbor || neighbor.data.type !== 'attribute') continue
      const cfg = nodeConfigs[neighborId]?.attribute
      const def = neighbor.data.type === 'attribute' ? neighbor.data.attribute : undefined
      return cfg ?? def ?? null
    }
    return null
  }

  function handleAcquireNode(node: TalentTreeNode) {
    if (node.data.type === 'attribute' && !node.data.attribute) {
      const suggested = getAdjacentAttr(node.id)
      if (suggested) {
        // Neighbor defines the attribute — use it directly, no picker
        setNodeConfig(node.id, { attribute: suggested })
        acquireNode(node.id)
      } else {
        // No adjacent hint — let player choose
        setAttrPicker({ nodeId: node.id, current: null })
      }
    } else {
      acquireNode(node.id)
    }
  }

  function confirmAttrPicker() {
    if (!attrPicker || !attrPicker.current) return
    setNodeConfig(attrPicker.nodeId, { attribute: attrPicker.current })
    // Acquire if not already acquired
    if (!acquiredSet.has(attrPicker.nodeId)) {
      acquireNode(attrPicker.nodeId)
    }
    setAttrPicker(null)
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const acquiredCount = useMemo(
    () =>
      tree.nodes.filter((node) => acquiredSet.has(node.id) && node.data.type !== 'player').length,
    [acquiredSet, tree.nodes],
  )
  const totalNodes = useMemo(
    () => tree.nodes.filter((node) => node.data.type !== 'player').length,
    [tree.nodes],
  )

  // ── Loading / empty states ────────────────────────────────────────────────
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <span className="animate-pulse text-sm text-gray-500">Carregando árvore…</span>
      </div>
    )
  }

  if (tree.nodes.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="text-center">
          <p className="mb-4 text-gray-400">Nenhuma Árvore de Talento encontrada.</p>
          <p className="mb-6 text-sm text-gray-500">O GM precisa criar uma árvore no Builder.</p>
          <button
            onClick={() => navigate('/')}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-500"
          >
            ← Voltar para a Ficha
          </button>
          <button
            onClick={fitTree}
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-bold text-gray-300 transition hover:border-sky-500 hover:text-white"
          >
            Enquadrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-950">
      {/* Attribute picker modal */}
      {attrPicker && (
        <AttributePicker
          value={attrPicker.current}
          onChange={(a) => setAttrPicker((p) => (p ? { ...p, current: a } : p))}
          onConfirm={confirmAttrPicker}
          onCancel={() => setAttrPicker(null)}
        />
      )}

      {/* Context menu */}
      {ctxMenu &&
        (() => {
          const node = ctxMenu.node
          const acquired = acquiredSet.has(node.id)
          const reachable = reachableSet.has(node.id)
          const canAcquire = !acquired && reachable && canAfford(node)
          return (
            <NodeContextMenu
              node={node}
              acquired={acquired}
              canAcquire={canAcquire}
              sx={ctxMenu.sx}
              sy={ctxMenu.sy}
              onAcquire={() => handleAcquireNode(node)}
              onRemove={() => removeNode(node.id)}
              onClose={() => setCtxMenu(null)}
            />
          )
        })()}

      {/* Top bar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-800 bg-gray-900 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-bold text-gray-300 transition hover:border-amber-500 hover:text-white"
          >
            ← Ficha
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{tree.name}</h1>
            {tree.description && <p className="text-xs text-gray-500">{tree.description}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="relative flex w-60 items-center">
            <span className="pointer-events-none absolute left-2.5 text-xs text-gray-500">⌕</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar nós…"
              aria-label="Buscar nós da árvore"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 py-1.5 pr-16 pl-7 text-xs text-gray-200 transition outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <span className="absolute right-2 flex items-center gap-1 text-[10px] text-gray-500">
                {matchingNodeIds.size}
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpar busca"
                  className="rounded px-0.5 text-sm leading-none hover:text-white"
                >
                  ×
                </button>
              </span>
            )}
          </label>
          <span className="text-xs text-gray-400">
            Personagem: <span className="font-semibold text-amber-400">{character.name}</span>
          </span>
          <div className="text-xs text-gray-400">
            Nós: <span className="font-bold text-amber-400">{acquiredCount}</span>
            <span className="text-gray-600"> / {totalNodes}</span>
          </div>
          {playerNodes.length > 1 && (
            <div className="text-xs text-gray-400">
              Inícios: <span className="font-bold text-sky-400">{acquiredPlayerCount}</span>
              <span className="text-gray-600"> / {playerNodes.length}</span>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1">
            <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
              Pontos
            </span>
            <span
              className={`text-sm font-bold tabular-nums ${remainingPoints <= 0 ? 'text-red-400' : 'text-amber-400'}`}
            >
              {remainingPoints}
            </span>
            <span className="text-xs text-gray-600">/ {totalPoints}</span>
            <span className="text-[10px] text-gray-600">5 × (Div. {divinity} + 1)</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <svg
          ref={svgRef}
          className="flex-1 select-none"
          style={{ background: '#111827', cursor: 'grab' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <g ref={worldRef} className="talent-tree-world" data-lod="low">
            {/* Edges */}
            <path
              d={edgePaths.dimmed}
              fill="none"
              stroke="rgba(107,114,128,0.12)"
              strokeWidth={1.5}
              strokeDasharray="6 3"
            />
            <path
              d={edgePaths.available}
              fill="none"
              stroke="rgba(75,85,99,0.5)"
              strokeWidth={1.5}
              strokeDasharray="6 3"
            />
            <path
              d={edgePaths.acquired}
              fill="none"
              stroke="rgba(245,158,11,0.6)"
              strokeWidth={3}
            />

            {/* Nodes */}
            {tree.nodes.map((node) => {
              const acquired = acquiredSet.has(node.id)
              const selected = selectedNodeId === node.id
              const reachable = reachableSet.has(node.id)
              const dimmed = searchActive && !matchingNodeIds.has(node.id)
              const { fill, stroke, text } = NODE_TYPE_COLORS[node.data.type]

              const nodeFill = acquired
                ? fill
                : reachable
                  ? 'rgba(40,35,20,0.9)'
                  : 'rgba(20,20,30,0.85)'
              const nodeStroke = selected
                ? '#f59e0b'
                : acquired
                  ? '#f59e0b'
                  : reachable
                    ? stroke
                    : '#374151'
              const nodeWidth = selected || acquired ? 3 : 1.5
              const nodeText = acquired ? text : reachable ? '#9ca3af' : '#4b5563'
              const attrOverride = nodeConfigs[node.id]?.attribute

              return (
                <g
                  key={node.id}
                  className="talent-tree-node"
                  transform={`translate(${node.x},${node.y})`}
                  style={{
                    cursor: 'pointer',
                    opacity: dimmed ? 0.2 : 1,
                    filter: acquired ? 'drop-shadow(0 0 5px rgba(245,158,11,0.5))' : undefined,
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (e.ctrlKey || e.metaKey) {
                      // Ctrl+click: change attribute on attribute nodes, context menu otherwise
                      if (node.data.type === 'attribute') {
                        const current =
                          nodeConfigs[node.id]?.attribute ?? node.data.attribute ?? null
                        setAttrPicker({ nodeId: node.id, current })
                      } else {
                        setCtxMenu({ node, sx: e.clientX, sy: e.clientY })
                      }
                      return
                    }
                    // Normal click: acquire or remove
                    if (acquired) {
                      removeNode(node.id)
                    } else {
                      const reachable = reachableSet.has(node.id)
                      if (reachable && canAfford(node)) {
                        handleAcquireNode(node)
                      }
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setCtxMenu({ node, sx: e.clientX, sy: e.clientY })
                  }}
                >
                  {selected && (
                    <circle
                      r={nodeRadius(node.data, node.tier) + 8}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      className="animate-spin"
                      style={{ animationDuration: '8s' }}
                    />
                  )}
                  <TalentNodeVisual
                    node={node}
                    fill={nodeFill}
                    stroke={nodeStroke}
                    strokeWidth={nodeWidth}
                    textColor={nodeText}
                    attrOverride={attrOverride}
                  />
                  {acquired && (
                    <circle
                      r={6}
                      cx={nodeRadius(node.data, node.tier) * 0.72}
                      cy={-nodeRadius(node.data, node.tier) * 0.72}
                      fill="#f59e0b"
                      stroke="#92400e"
                      strokeWidth={1}
                    />
                  )}
                </g>
              )
            })}
          </g>
        </svg>

        {/* Side panel */}
        <div className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-gray-800 bg-gray-900">
          <div className="border-b border-gray-800 px-4 py-3">
            <h2 className="text-xs font-bold tracking-widest text-gray-400 uppercase">Pináculo</h2>
            <p className="mt-0.5 text-[10px] text-gray-500">
              Clique para selecionar · Ctrl+Click ou Botão Direito para menu
            </p>
            <div className="mt-2.5 flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-gray-500">Pontos de Talento</span>
                <span
                  className={`font-bold tabular-nums ${spentPoints >= totalPoints ? 'text-red-400' : 'text-amber-400'}`}
                >
                  {spentPoints} / {totalPoints}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                <div
                  className={`h-full rounded-full transition-all ${spentPoints >= totalPoints ? 'bg-red-500' : 'bg-amber-500'}`}
                  style={{
                    width: `${totalPoints > 0 ? Math.min(100, (spentPoints / totalPoints) * 100) : 0}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-gray-600">5 × (Divindade {divinity} + 1) pontos</p>
            </div>
          </div>

          {/* Legend */}
          <div className="border-b border-gray-800 px-4 py-3">
            <p className="mb-2 text-[9px] font-bold tracking-widest text-gray-600 uppercase">
              Tipos
            </p>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(NODE_TYPE_COLORS) as (keyof typeof NODE_TYPE_COLORS)[])
                .filter((t) => t !== 'player')
                .map((t) => {
                  const c = NODE_TYPE_COLORS[t]
                  return (
                    <span
                      key={t}
                      className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                      style={{ background: c.fill, border: `1px solid ${c.stroke}`, color: c.text }}
                    >
                      {NODE_TYPE_LABELS[t]}
                    </span>
                  )
                })}
            </div>
          </div>

          {playerNodes.length > 1 && unacquiredPlayerNodes.length > 0 && (
            <div className="border-b border-gray-800 px-4 py-3">
              <p className="mb-2 text-[9px] font-bold tracking-widest text-gray-600 uppercase">
                Pontos de Partida
              </p>
              <p className="text-[10px] leading-relaxed text-gray-500">
                Nós de jogador podem ser adquiridos a qualquer momento. O primeiro é gratuito; cada
                início seguinte custa 1 ponto a mais que o anterior.
              </p>
              <p className="mt-1.5 text-xs text-gray-400">
                Próximo início:{' '}
                <span
                  className={`font-bold ${nextPlayerNodeCost === 0 ? 'text-emerald-400' : 'text-sky-400'}`}
                >
                  {nextPlayerNodeCost === 0
                    ? 'Gratuito'
                    : `${nextPlayerNodeCost} ponto${nextPlayerNodeCost > 1 ? 's' : ''}`}
                </span>
              </p>
            </div>
          )}

          {/* Selected node details */}
          <div className="flex-1 px-4 py-3">
            {selectedNode ? (
              (() => {
                const acquired = acquiredSet.has(selectedNode.id)
                const reachable = reachableSet.has(selectedNode.id)
                const cost = effectiveCost(selectedNode)
                const isFree = cost === 0
                const canAcquire = !acquired && reachable && canAfford(selectedNode)
                const { stroke } = NODE_TYPE_COLORS[selectedNode.data.type]
                const lines = nodeTooltip(selectedNode.data).split('\n')

                return (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold" style={{ color: stroke }}>
                          {NODE_TYPE_LABELS[selectedNode.data.type]}
                        </span>
                        {'name' in selectedNode.data &&
                          (selectedNode.data as { name: string }).name && (
                            <p className="text-sm font-bold text-white">
                              {(selectedNode.data as { name: string }).name}
                            </p>
                          )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {!isFree && !acquired && (
                          <span
                            className={`text-[10px] font-bold ${canAfford(selectedNode) ? 'text-amber-400' : 'text-red-400'}`}
                          >
                            {canAfford(selectedNode)
                              ? `${cost} ponto${cost > 1 ? 's' : ''}`
                              : 'Sem pontos'}
                          </span>
                        )}
                        {!reachable && !acquired && (
                          <span className="text-[10px] text-gray-600">Inacessível</span>
                        )}
                        <button
                          onClick={
                            acquired
                              ? () => removeNode(selectedNode.id)
                              : () => handleAcquireNode(selectedNode)
                          }
                          disabled={!acquired && !canAcquire}
                          className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                            acquired
                              ? 'border border-rose-800/40 bg-rose-900/40 text-rose-400 hover:bg-rose-900/60'
                              : canAcquire
                                ? 'bg-amber-500 text-white shadow hover:bg-amber-400'
                                : 'cursor-not-allowed bg-gray-800 text-gray-600'
                          }`}
                        >
                          {acquired ? '✕ Remover' : '✦ Adquirir'}
                        </button>
                      </div>
                    </div>

                    <pre className="text-xs leading-relaxed whitespace-pre-wrap text-gray-400">
                      {lines.slice(1).join('\n')}
                    </pre>

                    {selectedNode.data.type === 'magic' && (
                      <div className="flex flex-wrap gap-1">
                        {selectedNode.data.elements.map((elId) => {
                          const el = ELEMENTS.find((e) => e.id === elId)
                          return el ? (
                            <span
                              key={elId}
                              className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                              style={{ background: el.color, color: el.textColor }}
                            >
                              {el.label}
                            </span>
                          ) : null
                        })}
                        {selectedNode.data.magicTypes.map((typeId) => {
                          const mt = MAGIC_TYPES.find((t) => t.id === typeId)
                          return mt ? (
                            <span
                              key={typeId}
                              className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                              style={{ background: mt.color, color: mt.textColor }}
                            >
                              {mt.label}
                            </span>
                          ) : null
                        })}
                      </div>
                    )}
                  </div>
                )
              })()
            ) : (
              <p className="mt-8 text-center text-xs text-gray-600">
                Selecione um nó para ver detalhes.
              </p>
            )}
          </div>

          {/* Acquired nodes list */}
          <div className="border-t border-gray-800 px-4 py-3">
            <p className="mb-2 text-[9px] font-bold tracking-widest text-gray-600 uppercase">
              Nós Adquiridos
            </p>
            <div className="flex max-h-40 flex-col gap-0.5 overflow-y-auto">
              {tree.nodes
                .filter((n) => acquiredSet.has(n.id) && n.data.type !== 'player')
                .map((n) => {
                  const c = NODE_TYPE_COLORS[n.data.type]
                  const label =
                    'name' in n.data
                      ? (n.data as { name: string }).name
                      : NODE_TYPE_LABELS[n.data.type]
                  return (
                    <div
                      key={n.id}
                      onClick={() => setSelectedNodeId(n.id)}
                      className="flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-0.5 transition hover:bg-gray-800"
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: c.stroke }}
                      />
                      <span className="truncate text-[10px] text-gray-300">
                        {label || NODE_TYPE_LABELS[n.data.type]}
                      </span>
                    </div>
                  )
                })}
              {acquiredCount === 0 && acquiredPlayerCount === 0 && (
                <p className="text-[10px] text-gray-600">
                  Nenhum nó adquirido. Comece pelo nó de Jogador.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
