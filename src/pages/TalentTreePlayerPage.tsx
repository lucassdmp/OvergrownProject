import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTalentTreeStore } from '../features/talentTree/store/talentTreeStore'
import { useCharacterV2Store } from '../features/characterV2/store/characterV2Store'
import {
  NODE_TYPE_COLORS, NODE_TYPE_LABELS, nodeTooltip,
  type TalentTree, type TalentTreeNode,
} from '../types/talentTree'
import { nodeRadius, TalentNodeVisual } from '../features/talentTree/components/TalentNodeVisual'
import { ELEMENTS } from '../data/elements'
import { MAGIC_TYPES } from '../data/magicTypes'
import { ATTRIBUTE_LABELS, type AttributeName } from '../types/game'

// ── Point cost (player node is free) ─────────────────────────────────────────
function nodeCost(node: TalentTreeNode): number {
  return node.data.type === 'player' ? 0 : 1
}

// ── Adjacency: node is reachable if it's connected to any acquired node ───────
function isReachable(nodeId: string, acquiredSet: Set<string>, tree: TalentTree): boolean {
  const node = tree.nodes.find((n) => n.id === nodeId)
  if (!node) return false
  if (node.data.type === 'player') return true
  const edges = tree.edges.filter((e) => e.from === nodeId || e.to === nodeId)
  return edges.some((e) => {
    const neighborId = e.from === nodeId ? e.to : e.from
    return acquiredSet.has(neighborId)
  })
}

// ── Attribute picker modal ────────────────────────────────────────────────────

const ATTRIBUTES: AttributeName[] = ['might', 'grace', 'wisdom', 'sense', 'fortitude']

function AttributePicker({ value, onChange, onConfirm, onCancel }: {
  value: AttributeName | null
  onChange: (a: AttributeName) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-amber-700/50 rounded-2xl p-5 w-72 flex flex-col gap-3 shadow-2xl">
        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest">Escolha o Atributo</h3>
        <p className="text-xs text-gray-400">Este nó permite que você escolha qual atributo será aumentado.</p>
        <div className="flex flex-col gap-1.5">
          {ATTRIBUTES.map((attr) => (
            <button
              key={attr}
              onClick={() => onChange(attr)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold text-left transition border ${
                value === attr
                  ? 'bg-amber-600 border-amber-500 text-white'
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
            className="flex-1 rounded-lg border border-gray-700 py-1.5 text-xs text-gray-400 hover:text-white transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={!value}
            className="flex-1 rounded-lg py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-40 transition"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Context menu ──────────────────────────────────────────────────────────────

function NodeContextMenu({ node, acquired, canAcquire, sx, sy, onAcquire, onRemove, onClose }: {
  node: TalentTreeNode
  acquired: boolean
  canAcquire: boolean
  sx: number; sy: number
  onAcquire: () => void
  onRemove: () => void
  onClose: () => void
}) {
  const { stroke } = NODE_TYPE_COLORS[node.data.type]
  const lines = nodeTooltip(node.data).split('\n')

  // Adjust position so menu stays on screen
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: sx, top: sy })
  useEffect(() => {
    if (!menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    setPos({
      left: sx + rect.width > window.innerWidth ? sx - rect.width : sx,
      top: sy + rect.height > window.innerHeight ? sy - rect.height : sy,
    })
  }, [sx, sy])

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }} />
      <div
        ref={menuRef}
        className="fixed z-50 rounded-xl border border-gray-700 bg-gray-900 shadow-2xl py-1.5 min-w-[190px] text-sm"
        style={{ left: pos.left, top: pos.top }}
      >
        {/* Node type + name header */}
        <div className="px-4 py-1.5 border-b border-gray-800 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: stroke }}>
            {NODE_TYPE_LABELS[node.data.type]}
          </span>
          {'name' in node.data && (node.data as { name: string }).name && (
            <p className="text-xs font-semibold text-white truncate">{(node.data as { name: string }).name}</p>
          )}
          <p className="text-[10px] text-gray-500 mt-0.5 whitespace-pre-wrap leading-relaxed">{lines[0]}</p>
        </div>

        {/* Magic node element/type tags */}
        {node.data.type === 'magic' && (
          <div className="px-4 pb-1.5 flex flex-wrap gap-1 border-b border-gray-800 mb-1">
            {node.data.elements.map((elId) => {
              const el = ELEMENTS.find((e) => e.id === elId)
              return el ? (
                <span key={elId} className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: el.color, color: el.textColor }}>
                  {el.label}
                </span>
              ) : null
            })}
            {node.data.magicTypes.map((typeId) => {
              const mt = MAGIC_TYPES.find((t) => t.id === typeId)
              return mt ? (
                <span key={typeId} className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: mt.color, color: mt.textColor }}>
                  {mt.label}
                </span>
              ) : null
            })}
          </div>
        )}

        {acquired ? (
          <button
            className="w-full text-left px-4 py-1.5 hover:bg-rose-950/40 text-rose-400"
            onClick={() => { onRemove(); onClose() }}
          >
            ✕ Remover nó
          </button>
        ) : (
          <button
            disabled={!canAcquire}
            className={`w-full text-left px-4 py-1.5 ${
              canAcquire
                ? 'hover:bg-amber-950/40 text-amber-400'
                : 'text-gray-600 cursor-not-allowed'
            }`}
            onClick={() => { if (canAcquire) { onAcquire(); onClose() } }}
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
  const tree = useTalentTreeStore((s) => s.tree)
  const character = useCharacterV2Store((s) => s.character)
  const acquireNode = useCharacterV2Store((s) => s.acquireNode)
  const removeNode  = useCharacterV2Store((s) => s.removeNode)
  const setNodeConfig = useCharacterV2Store((s) => s.setNodeConfig)

  // Hydration guard
  const [hydrated, setHydrated] = useState(() => useTalentTreeStore.persist.hasHydrated())
  useEffect(() => {
    if (useTalentTreeStore.persist.hasHydrated()) { setHydrated(true); return }
    const unsub = useTalentTreeStore.persist.onFinishHydration(() => setHydrated(true))
    return unsub
  }, [])

  const acquiredSet  = new Set(character.acquiredNodeIds)
  const nodeConfigs  = character.nodeConfigs ?? {}
  const playerNodes  = tree.nodes.filter((n) => n.data.type === 'player')
  const acquiredPlayerCount = playerNodes.filter((n) => acquiredSet.has(n.id)).length
  const unacquiredPlayerNodes = playerNodes.filter((n) => !acquiredSet.has(n.id))
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const selectedNode = tree.nodes.find((n) => n.id === selectedNodeId) ?? null

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<{ node: TalentTreeNode; sx: number; sy: number } | null>(null)

  // Attribute picker
  const [attrPicker, setAttrPicker] = useState<{
    nodeId: string
    current: AttributeName | null
  } | null>(null)

  // ── Points budget ─────────────────────────────────────────────────────────
  const divinity       = character.divinity ?? 0
  const totalPoints    = divinity * 5
  const spentPoints    = tree.nodes.filter((n) => acquiredSet.has(n.id)).reduce((s, n) => s + nodeCost(n), 0)
  const remainingPoints = totalPoints - spentPoints
  const canAffordPoint  = remainingPoints > 0

  // ── Viewport pan/zoom ─────────────────────────────────────────────────────
  const [vp, setVp] = useState({ x: 0, y: 0, zoom: 1 })
  const svgRef      = useRef<SVGSVGElement>(null)
  const panning     = useRef(false)
  const panStart    = useRef({ x: 0, y: 0, vx: 0, vy: 0 })

  const onMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.button !== 1) return
    panning.current = true
    panStart.current = { x: e.clientX, y: e.clientY, vx: vp.x, vy: vp.y }
  }, [vp])

  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!panning.current) return
    setVp((v) => ({ ...v, x: panStart.current.vx + e.clientX - panStart.current.x, y: panStart.current.vy + e.clientY - panStart.current.y }))
  }, [])

  const onMouseUp = useCallback(() => { panning.current = false }, [])

  const onWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    setVp((v) => {
      const newZoom = Math.max(0.2, Math.min(3, v.zoom * factor))
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return { ...v, zoom: newZoom }
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      return { zoom: newZoom, x: cx - (cx - v.x) * (newZoom / v.zoom), y: cy - (cy - v.y) * (newZoom / v.zoom) }
    })
  }, [])

  // ── Acquire helpers ───────────────────────────────────────────────────────

  function getAdjacentAttr(nodeId: string): AttributeName | null {
    const edges = tree.edges.filter((e) => e.from === nodeId || e.to === nodeId)
    for (const edge of edges) {
      const neighborId = edge.from === nodeId ? edge.to : edge.from
      if (!acquiredSet.has(neighborId)) continue
      const neighbor = tree.nodes.find((n) => n.id === neighborId)
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

  function acquireAllPlayerNodes() {
    for (const node of unacquiredPlayerNodes) acquireNode(node.id)
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
  const acquiredCount = tree.nodes.filter((n) => acquiredSet.has(n.id) && n.data.type !== 'player').length
  const totalNodes    = tree.nodes.filter((n) => n.data.type !== 'player').length

  // ── Loading / empty states ────────────────────────────────────────────────
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <span className="text-gray-500 text-sm animate-pulse">Carregando árvore…</span>
      </div>
    )
  }

  if (tree.nodes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Nenhuma Árvore de Talento encontrada.</p>
          <p className="text-gray-500 text-sm mb-6">O GM precisa criar uma árvore no Builder.</p>
          <button onClick={() => navigate('/v2')} className="rounded-lg px-4 py-2 text-sm font-bold bg-amber-600 hover:bg-amber-500 text-white">
            ← Voltar para a Ficha
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">
      {/* Attribute picker modal */}
      {attrPicker && (
        <AttributePicker
          value={attrPicker.current}
          onChange={(a) => setAttrPicker((p) => p ? { ...p, current: a } : p)}
          onConfirm={confirmAttrPicker}
          onCancel={() => setAttrPicker(null)}
        />
      )}

      {/* Context menu */}
      {ctxMenu && (() => {
        const node = ctxMenu.node
        const acquired = acquiredSet.has(node.id)
        const reachable = isReachable(node.id, acquiredSet, tree)
        const isFree = nodeCost(node) === 0
        const canAcquire = !acquired && reachable && (isFree || canAffordPoint)
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
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 bg-gray-900 shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/v2')}
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-bold text-gray-300 hover:text-white hover:border-amber-500 transition"
          >
            ← Ficha
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{tree.name}</h1>
            {tree.description && <p className="text-xs text-gray-500">{tree.description}</p>}
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs text-gray-400">
            Personagem: <span className="text-amber-400 font-semibold">{character.name}</span>
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
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Pontos</span>
            <span className={`text-sm font-bold tabular-nums ${remainingPoints <= 0 ? 'text-red-400' : 'text-amber-400'}`}>
              {remainingPoints}
            </span>
            <span className="text-gray-600 text-xs">/ {totalPoints}</span>
            <span className="text-[10px] text-gray-600">Div. {divinity} × 5</span>
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
          <g transform={`translate(${vp.x},${vp.y}) scale(${vp.zoom})`}>
            {/* Edges */}
            {tree.edges.map((edge) => {
              const from = tree.nodes.find((n) => n.id === edge.from)
              const to   = tree.nodes.find((n) => n.id === edge.to)
              if (!from || !to) return null
              const bothAcquired = acquiredSet.has(from.id) && acquiredSet.has(to.id)
              return (
                <line
                  key={edge.id}
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={bothAcquired ? 'rgba(245,158,11,0.6)' : 'rgba(75,85,99,0.5)'}
                  strokeWidth={bothAcquired ? 3 : 1.5}
                  strokeDasharray={bothAcquired ? undefined : '6 3'}
                />
              )
            })}

            {/* Nodes */}
            {tree.nodes.map((node) => {
              const acquired  = acquiredSet.has(node.id)
              const selected  = selectedNodeId === node.id
              const reachable = isReachable(node.id, acquiredSet, tree)
              const { fill, stroke, text } = NODE_TYPE_COLORS[node.data.type]

              const nodeFill   = acquired ? fill : reachable ? 'rgba(40,35,20,0.9)' : 'rgba(20,20,30,0.85)'
              const nodeStroke = selected ? '#f59e0b' : acquired ? '#f59e0b' : reachable ? stroke : '#374151'
              const nodeWidth  = selected || acquired ? 3 : 1.5
              const nodeText   = acquired ? text : reachable ? '#9ca3af' : '#4b5563'
              const attrOverride = nodeConfigs[node.id]?.attribute

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  style={{
                    cursor: 'pointer',
                    filter: acquired ? 'drop-shadow(0 0 6px rgba(245,158,11,0.6))' : undefined,
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (e.ctrlKey || e.metaKey) {
                      // Ctrl+click: change attribute on attribute nodes, context menu otherwise
                      if (node.data.type === 'attribute') {
                        const current = nodeConfigs[node.id]?.attribute ?? node.data.attribute ?? null
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
                      const reachable = isReachable(node.id, acquiredSet, tree)
                      const isFree = nodeCost(node) === 0
                      if (reachable && (isFree || canAffordPoint)) {
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
                      r={nodeRadius(node.data) + 8}
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
                      cx={nodeRadius(node.data) * 0.72}
                      cy={-nodeRadius(node.data) * 0.72}
                      fill="#f59e0b" stroke="#92400e" strokeWidth={1}
                    />
                  )}
                </g>
              )
            })}
          </g>
        </svg>

        {/* Side panel */}
        <div className="w-72 shrink-0 border-l border-gray-800 bg-gray-900 flex flex-col overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Pináculo</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Clique para selecionar · Ctrl+Click ou Botão Direito para menu
            </p>
            <div className="mt-2.5 flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-gray-500">Pontos de Talento</span>
                <span className={`font-bold tabular-nums ${spentPoints >= totalPoints ? 'text-red-400' : 'text-amber-400'}`}>
                  {spentPoints} / {totalPoints}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${spentPoints >= totalPoints ? 'bg-red-500' : 'bg-amber-500'}`}
                  style={{ width: `${totalPoints > 0 ? Math.min(100, (spentPoints / totalPoints) * 100) : 0}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-600">Divindade {divinity} × 5 pontos</p>
            </div>
          </div>

          {/* Legend */}
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">Tipos</p>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(NODE_TYPE_COLORS) as (keyof typeof NODE_TYPE_COLORS)[]).filter(t => t !== 'player').map((t) => {
                const c = NODE_TYPE_COLORS[t]
                return (
                  <span key={t} className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: c.fill, border: `1px solid ${c.stroke}`, color: c.text }}>
                    {NODE_TYPE_LABELS[t]}
                  </span>
                )
              })}
            </div>
          </div>

          {playerNodes.length > 1 && unacquiredPlayerNodes.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-800">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">Pontos de Partida</p>
              <button
                onClick={acquireAllPlayerNodes}
                className="w-full rounded-lg border border-sky-800/50 bg-sky-950/30 px-3 py-1.5 text-xs font-bold text-sky-300 hover:border-sky-600 hover:bg-sky-900/40 transition"
              >
                Ativar todos os inícios gratuitos
              </button>
            </div>
          )}

          {/* Selected node details */}
          <div className="px-4 py-3 flex-1">
            {selectedNode ? (() => {
              const acquired  = acquiredSet.has(selectedNode.id)
              const reachable = isReachable(selectedNode.id, acquiredSet, tree)
              const isFree    = nodeCost(selectedNode) === 0
              const canAcquire = !acquired && reachable && (isFree || canAffordPoint)
              const { stroke } = NODE_TYPE_COLORS[selectedNode.data.type]
              const lines = nodeTooltip(selectedNode.data).split('\n')

              return (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold" style={{ color: stroke }}>{NODE_TYPE_LABELS[selectedNode.data.type]}</span>
                      {'name' in selectedNode.data && (selectedNode.data as { name: string }).name && (
                        <p className="text-sm font-bold text-white">{(selectedNode.data as { name: string }).name}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {!isFree && !acquired && (
                        <span className={`text-[10px] font-bold ${canAffordPoint ? 'text-amber-400' : 'text-red-400'}`}>
                          {canAffordPoint ? '1 ponto' : 'Sem pontos'}
                        </span>
                      )}
                      {!reachable && !acquired && (
                        <span className="text-[10px] text-gray-600">Inacessível</span>
                      )}
                      <button
                        onClick={acquired ? () => removeNode(selectedNode.id) : () => handleAcquireNode(selectedNode)}
                        disabled={!acquired && !canAcquire}
                        className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                          acquired
                            ? 'bg-rose-900/40 text-rose-400 hover:bg-rose-900/60 border border-rose-800/40'
                            : canAcquire
                            ? 'bg-amber-500 hover:bg-amber-400 text-white shadow'
                            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        }`}
                      >
                        {acquired ? '✕ Remover' : '✦ Adquirir'}
                      </button>
                    </div>
                  </div>

                  <pre className="text-xs text-gray-400 whitespace-pre-wrap leading-relaxed">{lines.slice(1).join('\n')}</pre>

                  {selectedNode.data.type === 'magic' && (
                    <div className="flex flex-wrap gap-1">
                      {selectedNode.data.elements.map((elId) => {
                        const el = ELEMENTS.find((e) => e.id === elId)
                        return el ? (
                          <span key={elId} className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: el.color, color: el.textColor }}>
                            {el.label}
                          </span>
                        ) : null
                      })}
                      {selectedNode.data.magicTypes.map((typeId) => {
                        const mt = MAGIC_TYPES.find((t) => t.id === typeId)
                        return mt ? (
                          <span key={typeId} className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: mt.color, color: mt.textColor }}>
                            {mt.label}
                          </span>
                        ) : null
                      })}
                    </div>
                  )}
                </div>
              )
            })() : (
              <p className="text-xs text-gray-600 text-center mt-8">
                Selecione um nó para ver detalhes.
              </p>
            )}
          </div>

          {/* Acquired nodes list */}
          <div className="px-4 py-3 border-t border-gray-800">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">Nós Adquiridos</p>
            <div className="max-h-40 overflow-y-auto flex flex-col gap-0.5">
              {tree.nodes
                .filter((n) => acquiredSet.has(n.id) && n.data.type !== 'player')
                .map((n) => {
                  const c = NODE_TYPE_COLORS[n.data.type]
                  const label = 'name' in n.data ? (n.data as { name: string }).name : NODE_TYPE_LABELS[n.data.type]
                  return (
                    <div
                      key={n.id}
                      onClick={() => setSelectedNodeId(n.id)}
                      className="flex items-center gap-1.5 rounded px-1.5 py-0.5 cursor-pointer hover:bg-gray-800 transition"
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.stroke }} />
                      <span className="text-[10px] text-gray-300 truncate">{label || NODE_TYPE_LABELS[n.data.type]}</span>
                    </div>
                  )
                })}
              {acquiredCount === 0 && acquiredPlayerCount === 0 && (
                <p className="text-[10px] text-gray-600">Nenhum nó adquirido. Comece pelo nó de Jogador.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
