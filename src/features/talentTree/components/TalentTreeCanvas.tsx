import React, { useRef, useState, useEffect } from 'react'
import { useTalentTreeStore } from '../store/talentTreeStore'
import {
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  nodeTooltip,
  type TalentNodeType,
  type TalentTreeNode,
} from '../../../types/talentTree'

// ─────────────────────────────────────────────────────────────────────────────

export type CanvasMode = 'select' | 'connect' | `add-${TalentNodeType}`

interface Viewport { x: number; y: number; zoom: number }

const NODE_R = 34 // radius in SVG units

// ── Shape helpers ─────────────────────────────────────────────────────────────

function hexPts(r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 - 30) * (Math.PI / 180)
    return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
}
function diamondPts(r: number) {
  const s = r * 1.15
  return `0,${-s} ${s},0 0,${s} ${-s},0`
}
function pentagPts(r: number) {
  return Array.from({ length: 5 }, (_, i) => {
    const a = (i * 72 - 90) * (Math.PI / 180)
    return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
}

// ── Node visual ───────────────────────────────────────────────────────────────

function NodeVisual({
  node,
  selected,
  connectPending,
}: {
  node: TalentTreeNode
  selected: boolean
  connectPending: boolean
}) {
  const { fill, stroke, text } = NODE_TYPE_COLORS[node.data.type]
  const commonStroke = selected ? '#2563eb' : connectPending ? '#16a34a' : stroke
  const commonWidth = selected || connectPending ? 3.5 : 2

  let icon = ''
  let sublabel = ''
  switch (node.data.type) {
    case 'player':
      icon = '👤'; sublabel = (node.data.name || 'Jogador').slice(0, 10); break
    case 'attribute': {
      const al: Record<string, string> = { might: 'MGT', grace: 'GRC', wisdom: 'WIS', sense: 'SNS', fortitude: 'FOR' }
      icon = 'A'; sublabel = node.data.attribute ? `+${node.data.value} ${al[node.data.attribute]}` : `+${node.data.value} ?`; break
    }
    case 'magic':
      icon = '✦'; sublabel = (node.data.name || 'Magia').slice(0, 10); break
    case 'stat': {
      const sl: Record<string, string> = { vida: 'VID', iep: 'IEP', pc: 'PC ', resistencia: 'RES', esquiva: 'ESQ' }
      icon = '★'; sublabel = `+${node.data.value} ${sl[node.data.stat] ?? '?'}`; break
    }
    case 'combatAbility':
      icon = '⚔'; sublabel = (node.data.skillName || 'Combate').slice(0, 9); break
    case 'extraDamage':
      icon = '⊕'; sublabel = node.data.dice ?? `+${node.data.flat ?? 0}`; break
    case 'healing': {
      const parts: string[] = []
      if (node.data.dice) parts.push(node.data.dice)
      if (node.data.flat) parts.push(`+${node.data.flat}`)
      icon = '✚'; sublabel = parts.join(' ') || 'Cura'; break
    }
  }

  const shpProps = { fill, stroke: commonStroke, strokeWidth: commonWidth }

  const shape = (() => {
    switch (node.data.type) {
      case 'player':        return <rect x={-NODE_R} y={-NODE_R} width={NODE_R * 2} height={NODE_R * 2} rx={8} {...shpProps} />
      case 'attribute':     return <circle r={NODE_R} {...shpProps} />
      case 'magic':         return <polygon points={hexPts(NODE_R)} {...shpProps} />
      case 'stat':          return <polygon points={diamondPts(NODE_R)} {...shpProps} />
      case 'combatAbility': return <polygon points={pentagPts(NODE_R)} {...shpProps} />
      case 'extraDamage':   return <circle r={NODE_R} strokeDasharray="5 3" {...shpProps} />
      case 'healing':       return <circle r={NODE_R} strokeDasharray="8 2" {...shpProps} />
    }
  })()

  return (
    <g>
      {shape}
      <text y={-6} textAnchor="middle" dominantBaseline="middle"
        fontSize={14} fontWeight="bold" fill={text}
        style={{ pointerEvents: 'none', userSelect: 'none' }}>{icon}</text>
      <text y={10} textAnchor="middle" dominantBaseline="middle"
        fontSize={8} fill={text}
        style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: 'monospace' }}>{sublabel}</text>
    </g>
  )
}

// ── Canvas ────────────────────────────────────────────────────────────────────

interface Props {
  mode: CanvasMode
  setMode: (m: CanvasMode) => void
  selectedNodeId: string | null
  setSelectedNodeId: (id: string | null) => void
}

export default function TalentTreeCanvas({ mode, setMode, selectedNodeId, setSelectedNodeId }: Props) {
  const { tree, addNode, removeNode, moveNode, toggleEdge } = useTalentTreeStore()
  const svgRef = useRef<SVGSVGElement>(null)

  const [viewport, setViewport] = useState<Viewport>({ x: 80, y: 80, zoom: 1 })
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ nodeId: string; sx: number; sy: number } | null>(null)
  const [ctxMenu, setCtxMenu] = useState<{ nodeId: string; sx: number; sy: number } | null>(null)

  // Drag state stored as ref to avoid stale-closure issues in mousemove
  const drag = useRef<{
    type: 'pan' | 'node'
    nodeId?: string
    startSX: number; startSY: number
    startX: number; startY: number
    hasMoved: boolean
  } | null>(null)

  // ── helpers ────────────────────────────────────────────────────────────────

  function svgPoint(sx: number, sy: number) {
    const r = svgRef.current!.getBoundingClientRect()
    return {
      x: (sx - r.left - viewport.x) / viewport.zoom,
      y: (sy - r.top - viewport.y) / viewport.zoom,
    }
  }

  function hitNode(sx: number, sy: number): TalentTreeNode | null {
    const r = svgRef.current!.getBoundingClientRect()
    for (const node of tree.nodes) {
      const nx = r.left + viewport.x + node.x * viewport.zoom
      const ny = r.top + viewport.y + node.y * viewport.zoom
      if (Math.hypot(sx - nx, sy - ny) <= NODE_R * viewport.zoom + 6) return node
    }
    return null
  }

  // ── mouse down ─────────────────────────────────────────────────────────────

  function onMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (e.button !== 0) return
    e.preventDefault()
    setCtxMenu(null)

    const hit = hitNode(e.clientX, e.clientY)

    if (mode.startsWith('add-')) {
      if (!hit) {
        const type = mode.slice(4) as TalentNodeType
        const pos = svgPoint(e.clientX, e.clientY)
        addNode(pos.x, pos.y, type)
      }
      setMode('select')
      return
    }

    if (mode === 'connect') {
      if (!hit) { setConnectingFrom(null); return }
      if (!connectingFrom) { setConnectingFrom(hit.id); return }
      if (connectingFrom === hit.id) { setConnectingFrom(null); return }
      toggleEdge(connectingFrom, hit.id)
      setConnectingFrom(null)
      return
    }

    // select mode
    if (hit) {
      setSelectedNodeId(hit.id)
      drag.current = {
        type: 'node', nodeId: hit.id,
        startSX: e.clientX, startSY: e.clientY,
        startX: hit.x, startY: hit.y,
        hasMoved: false,
      }
    } else {
      setSelectedNodeId(null)
      drag.current = {
        type: 'pan',
        startSX: e.clientX, startSY: e.clientY,
        startX: viewport.x, startY: viewport.y,
        hasMoved: false,
      }
    }
  }

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!drag.current) return
    const dx = e.clientX - drag.current.startSX
    const dy = e.clientY - drag.current.startSY
    if (Math.hypot(dx, dy) > 3) drag.current.hasMoved = true
    // Capture values BEFORE any async setState so drag.current can't be nulled mid-flight
    const { type, startX, startY, nodeId, hasMoved } = drag.current
    if (type === 'pan') {
      setViewport((v) => ({ ...v, x: startX + dx, y: startY + dy }))
    } else if (hasMoved) {
      moveNode(nodeId!, startX + dx / viewport.zoom, startY + dy / viewport.zoom)
      setTooltip(null)
    }
  }

  function onMouseUp() { drag.current = null }

  function onWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault()
    const r = svgRef.current!.getBoundingClientRect()
    const mx = e.clientX - r.left
    const my = e.clientY - r.top
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    setViewport((v) => {
      const newZoom = Math.min(4, Math.max(0.15, v.zoom * factor))
      const scale = newZoom / v.zoom
      return { zoom: newZoom, x: mx - scale * (mx - v.x), y: my - scale * (my - v.y) }
    })
  }

  function onContextMenu(e: React.MouseEvent<SVGSVGElement>) {
    e.preventDefault()
    const hit = hitNode(e.clientX, e.clientY)
    if (hit) { setSelectedNodeId(hit.id); setCtxMenu({ nodeId: hit.id, sx: e.clientX, sy: e.clientY }) }
  }

  // ── keyboard ───────────────────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && document.activeElement?.tagName !== 'INPUT') {
        if (selectedNodeId) { removeNode(selectedNodeId); setSelectedNodeId(null) }
      }
      if (e.key === 'Escape') { setMode('select'); setConnectingFrom(null); setCtxMenu(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedNodeId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── cursor ─────────────────────────────────────────────────────────────────

  const cursor = mode.startsWith('add-') ? 'crosshair' : mode === 'connect' ? 'pointer' : 'default'

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
      <svg
        ref={svgRef}
        className="w-full h-full select-none"
        style={{ cursor }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onContextMenu={onContextMenu}
      >
        {/* background grid */}
        <defs>
          <pattern
            id="ttgrid"
            width={40 * viewport.zoom} height={40 * viewport.zoom}
            patternUnits="userSpaceOnUse"
            x={viewport.x % (40 * viewport.zoom)}
            y={viewport.y % (40 * viewport.zoom)}
          >
            <circle cx={0} cy={0} r={1} fill="#9ca3af" opacity={0.4} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ttgrid)" />

        <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`}>
          {/* Edges */}
          {tree.edges.map((edge) => {
            const A = tree.nodes.find((n) => n.id === edge.from)
            const B = tree.nodes.find((n) => n.id === edge.to)
            if (!A || !B) return null
            return (
              <line
                key={edge.id}
                x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                stroke="#64748b" strokeWidth={2} strokeLinecap="round"
                opacity={0.7}
              />
            )
          })}

          {/* Nodes */}
          {tree.nodes.map((node) => (
            <g
              key={node.id}
              transform={`translate(${node.x} ${node.y})`}
              style={{ cursor: mode === 'select' ? 'grab' : 'pointer' }}
              onMouseEnter={(e) => { if (!drag.current?.hasMoved) setTooltip({ nodeId: node.id, sx: e.clientX, sy: e.clientY }) }}
              onMouseLeave={() => setTooltip(null)}
              onMouseMove={(e) => { if (!drag.current?.hasMoved) setTooltip((t) => t ? { ...t, sx: e.clientX, sy: e.clientY } : null) }}
            >
              <NodeVisual
                node={node}
                selected={selectedNodeId === node.id}
                connectPending={connectingFrom === node.id}
              />
            </g>
          ))}
        </g>
      </svg>

      {/* ── Tooltip ─────────────────────────────────────────────────── */}
      {tooltip && !drag.current?.hasMoved && (() => {
        const node = tree.nodes.find((n) => n.id === tooltip.nodeId)
        if (!node) return null
        const lines = nodeTooltip(node.data).split('\n')
        return (
          <div
            className="pointer-events-none fixed z-50 max-w-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl px-3 py-2.5 text-xs text-gray-700 dark:text-gray-200"
            style={{ left: tooltip.sx + 16, top: tooltip.sy - 10 }}
          >
            <p className="font-bold text-sm mb-1" style={{ color: NODE_TYPE_COLORS[node.data.type].stroke }}>
              {NODE_TYPE_LABELS[node.data.type]}
            </p>
            {lines.map((l, i) => <p key={i} className={i === 0 ? 'font-semibold text-gray-900 dark:text-white' : ''}>{l}</p>)}
          </div>
        )
      })()}

      {/* ── Context menu ────────────────────────────────────────────── */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setCtxMenu(null)} />
          <div
            className="fixed z-50 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl py-1.5 min-w-[160px] text-sm"
            style={{ left: ctxMenu.sx, top: ctxMenu.sy }}
          >
            <button
              className="w-full text-left px-4 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400"
              onClick={() => { setSelectedNodeId(ctxMenu.nodeId); setCtxMenu(null) }}
            >✏ Editar nó</button>
            <button
              className="w-full text-left px-4 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
              onClick={() => { setMode('connect'); setConnectingFrom(ctxMenu.nodeId); setCtxMenu(null) }}
            >⟶ Conectar a…</button>
            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
            <button
              className="w-full text-left px-4 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400"
              onClick={() => {
                removeNode(ctxMenu.nodeId)
                if (selectedNodeId === ctxMenu.nodeId) setSelectedNodeId(null)
                setCtxMenu(null)
              }}
            >✕ Remover nó</button>
          </div>
        </>
      )}

      {/* ── Mode banner ─────────────────────────────────────────────── */}
      {(mode.startsWith('add-') || mode === 'connect') && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-amber-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg">
          {mode.startsWith('add-')
            ? `Clique no canvas para colocar: ${NODE_TYPE_LABELS[mode.slice(4) as TalentNodeType]}`
            : connectingFrom
            ? 'Clique no segundo nó para conectar'
            : 'Clique no primeiro nó'}
          <button
            className="rounded-full bg-white/20 px-2 py-0.5 hover:bg-white/40"
            onClick={() => { setMode('select'); setConnectingFrom(null) }}
          >ESC</button>
        </div>
      )}

      {/* ── Empty-state hint ────────────────────────────────────────── */}
      {tree.nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-gray-300 dark:text-gray-700 text-sm font-medium select-none">
            Use a barra de ferramentas para adicionar nós à árvore
          </p>
        </div>
      )}
    </div>
  )
}
