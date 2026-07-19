import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useTalentTreeStore } from '../store/talentTreeStore'
import { nodeMatchesSearch } from '../nodeSearch'
import {
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  nodeTooltip,
  type TalentNodeType,
  type TalentTreeNode,
} from '../../../types/talentTree'
import { nodeRadius, TalentNodeVisual } from './TalentNodeVisual'

// ─────────────────────────────────────────────────────────────────────────────

export type CanvasMode = 'select' | 'connect' | `add-${TalentNodeType}`

interface Viewport {
  x: number
  y: number
  zoom: number
}

// ── Builder node wrapper (adds selection/connect highlighting) ────────────────

function BuilderNode({
  node,
  selected,
  multiSelected,
  connectPending,
  dimmed,
}: {
  node: TalentTreeNode
  selected: boolean
  multiSelected: boolean
  connectPending: boolean
  dimmed: boolean
}) {
  const { fill, stroke, text } = NODE_TYPE_COLORS[node.data.type]
  const commonStroke = selected
    ? '#2563eb'
    : multiSelected
      ? '#7c3aed'
      : connectPending
        ? '#16a34a'
        : stroke
  const commonWidth = selected || multiSelected || connectPending ? 3.5 : 2
  return (
    <g opacity={dimmed ? 0.2 : 1}>
      <TalentNodeVisual
        node={node}
        fill={fill}
        stroke={commonStroke}
        strokeWidth={commonWidth}
        textColor={text}
      />
    </g>
  )
}

// ── Canvas ────────────────────────────────────────────────────────────────────

interface Props {
  mode: CanvasMode
  setMode: (m: CanvasMode) => void
  selectedNodeId: string | null
  setSelectedNodeId: (id: string | null) => void
  gridEnabled: boolean
  gridSize: number
  snapEnabled: boolean
  searchQuery: string
}

export default function TalentTreeCanvas({
  mode,
  setMode,
  selectedNodeId,
  setSelectedNodeId,
  gridEnabled,
  gridSize,
  snapEnabled,
  searchQuery,
}: Props) {
  const {
    tree,
    addNode,
    removeNode,
    removeEdge,
    moveNode,
    toggleEdge,
    moveNodes,
    addNodes,
    removeNodes,
  } = useTalentTreeStore()
  const svgRef = useRef<SVGSVGElement>(null)
  const nodeElementRefs = useRef(new Map<string, SVGGElement>())
  const searchActive = searchQuery.trim().length > 0
  const matchingNodeIds = useMemo(
    () =>
      new Set(
        tree.nodes.filter((node) => nodeMatchesSearch(node, searchQuery)).map((node) => node.id),
      ),
    [searchQuery, tree.nodes],
  )
  const nodeById = useMemo(() => new Map(tree.nodes.map((node) => [node.id, node])), [tree.nodes])

  const [viewport, setViewport] = useState<Viewport>({ x: 80, y: 80, zoom: 0.1 })
  const fittedTreeKey = useRef<string | null>(null)
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [ctrlConnectFrom, setCtrlConnectFrom] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ nodeId: string; sx: number; sy: number } | null>(null)
  const [ctxMenu, setCtxMenu] = useState<{ nodeId: string; sx: number; sy: number } | null>(null)

  // Multi-selection
  const [multiIds, setMultiIds] = useState<Set<string>>(new Set())

  // Area selection box (world coords)
  const [selBox, setSelBox] = useState<{
    wx1: number
    wy1: number
    wx2: number
    wy2: number
  } | null>(null)

  // Internal clipboard (copy/paste)
  const clipboard = useRef<TalentTreeNode[]>([])

  // Drag state stored as ref to avoid stale-closure issues in mousemove
  const drag = useRef<{
    type: 'pan' | 'node' | 'multi' | 'select-box'
    nodeId?: string
    startPositions?: { id: string; x: number; y: number }[]
    startSX: number
    startSY: number
    startX: number
    startY: number
    startWX: number
    startWY: number
    hasMoved: boolean
    previewMoves?: { id: string; x: number; y: number }[]
  } | null>(null)

  // ── helpers ────────────────────────────────────────────────────────────────

  const svgPoint = useCallback(
    (sx: number, sy: number) => {
      const r = svgRef.current!.getBoundingClientRect()
      return {
        x: (sx - r.left - viewport.x) / viewport.zoom,
        y: (sy - r.top - viewport.y) / viewport.zoom,
      }
    },
    [viewport],
  )

  const snap = useCallback(
    (v: number) => {
      if (!snapEnabled || !gridEnabled) return v
      const interval = gridSize / 2
      return Math.round(v / interval) * interval
    },
    [snapEnabled, gridEnabled, gridSize],
  )

  function hitNode(sx: number, sy: number): TalentTreeNode | null {
    const rect = svgRef.current!.getBoundingClientRect()
    for (const node of [...tree.nodes].reverse()) {
      const nx = rect.left + viewport.x + node.x * viewport.zoom
      const ny = rect.top + viewport.y + node.y * viewport.zoom
      if (Math.hypot(sx - nx, sy - ny) <= nodeRadius(node.data, node.tier) * viewport.zoom + 6)
        return node
    }
    return null
  }

  // ── mouse down (left) ──────────────────────────────────────────────────────

  function onMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (e.button !== 0) return
    e.preventDefault()
    setCtxMenu(null)

    const hit = hitNode(e.clientX, e.clientY)

    // ── add mode ──────────────────────────────────────────────────────────────
    if (mode.startsWith('add-')) {
      if (!hit) {
        const type = mode.slice(4) as TalentNodeType
        const pos = svgPoint(e.clientX, e.clientY)
        const nodeId = addNode(snap(pos.x), snap(pos.y), type)
        setMultiIds(new Set())
        setSelectedNodeId(nodeId)
      }
      setMode('select')
      return
    }

    // ── connect mode ──────────────────────────────────────────────────────────
    if (mode === 'connect') {
      if (!hit) {
        setConnectingFrom(null)
        return
      }
      if (!connectingFrom) {
        setConnectingFrom(hit.id)
        return
      }
      if (connectingFrom === hit.id) {
        setConnectingFrom(null)
        return
      }
      toggleEdge(connectingFrom, hit.id)
      setConnectingFrom(null)
      return
    }

    // ── select mode ───────────────────────────────────────────────────────────

    // Shift+click empty = start area selection
    if (e.shiftKey && !hit) {
      const wp = svgPoint(e.clientX, e.clientY)
      setSelBox(null)
      drag.current = {
        type: 'select-box',
        startSX: e.clientX,
        startSY: e.clientY,
        startX: 0,
        startY: 0,
        startWX: wp.x,
        startWY: wp.y,
        hasMoved: false,
      }
      return
    }

    if (e.ctrlKey || e.metaKey) {
      // Ctrl+click: toggle node in multi-selection
      if (hit) {
        setMultiIds((prev) => {
          const next = new Set(prev)
          if (next.has(hit.id)) next.delete(hit.id)
          else next.add(hit.id)
          return next
        })
        setSelectedNodeId(hit.id)
        // Start multi-drag if node is (or just became) selected
        const currentMulti = new Set(multiIds)
        currentMulti.add(hit.id)
        const startPositions = tree.nodes
          .filter((n) => currentMulti.has(n.id))
          .map((n) => ({ id: n.id, x: n.x, y: n.y }))
        drag.current = {
          type: 'multi',
          startPositions,
          startSX: e.clientX,
          startSY: e.clientY,
          startX: 0,
          startY: 0,
          startWX: 0,
          startWY: 0,
          hasMoved: false,
        }
      } else {
        // Ctrl+click empty = clear multi-selection
        setMultiIds(new Set())
        setSelectedNodeId(null)
      }
      return
    }

    // Normal click on node
    if (hit) {
      // If the clicked node is part of an existing multi-selection, drag all of them
      if (multiIds.has(hit.id) && multiIds.size > 1) {
        const startPositions = tree.nodes
          .filter((n) => multiIds.has(n.id))
          .map((n) => ({ id: n.id, x: n.x, y: n.y }))
        setSelectedNodeId(hit.id)
        drag.current = {
          type: 'multi',
          startPositions,
          startSX: e.clientX,
          startSY: e.clientY,
          startX: 0,
          startY: 0,
          startWX: 0,
          startWY: 0,
          hasMoved: false,
        }
      } else {
        setMultiIds(new Set())
        setSelectedNodeId(hit.id)
        drag.current = {
          type: 'node',
          nodeId: hit.id,
          startSX: e.clientX,
          startSY: e.clientY,
          startX: hit.x,
          startY: hit.y,
          startWX: 0,
          startWY: 0,
          hasMoved: false,
        }
      }
    } else {
      setMultiIds(new Set())
      setSelectedNodeId(null)
      drag.current = {
        type: 'pan',
        startSX: e.clientX,
        startSY: e.clientY,
        startX: viewport.x,
        startY: viewport.y,
        startWX: 0,
        startWY: 0,
        hasMoved: false,
      }
    }
  }

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!drag.current) return
    const dx = e.clientX - drag.current.startSX
    const dy = e.clientY - drag.current.startSY
    if (Math.hypot(dx, dy) > 3) drag.current.hasMoved = true
    const { type, startX, startY, nodeId, hasMoved, startPositions, startWX, startWY } =
      drag.current

    if (type === 'pan') {
      setViewport((v) => ({ ...v, x: startX + dx, y: startY + dy }))
    } else if (type === 'node' && hasMoved) {
      const preview = {
        id: nodeId!,
        x: snap(startX + dx / viewport.zoom),
        y: snap(startY + dy / viewport.zoom),
      }
      drag.current.previewMoves = [preview]
      nodeElementRefs.current
        .get(preview.id)
        ?.setAttribute('transform', `translate(${preview.x} ${preview.y})`)
      setTooltip(null)
    } else if (type === 'multi' && hasMoved && startPositions) {
      const dxWorld = dx / viewport.zoom
      const dyWorld = dy / viewport.zoom
      const previews = startPositions.map((p) => ({
        id: p.id,
        x: snap(p.x + dxWorld),
        y: snap(p.y + dyWorld),
      }))
      drag.current.previewMoves = previews
      for (const preview of previews) {
        nodeElementRefs.current
          .get(preview.id)
          ?.setAttribute('transform', `translate(${preview.x} ${preview.y})`)
      }
      setTooltip(null)
    } else if (type === 'select-box') {
      const wp = svgPoint(e.clientX, e.clientY)
      setSelBox({ wx1: startWX, wy1: startWY, wx2: wp.x, wy2: wp.y })
    }
  }

  function onMouseUp() {
    const completedDrag = drag.current
    if (completedDrag?.hasMoved && completedDrag.previewMoves?.length) {
      if (completedDrag.type === 'node') {
        const [move] = completedDrag.previewMoves
        moveNode(move.id, move.x, move.y)
      } else if (completedDrag.type === 'multi') {
        moveNodes(completedDrag.previewMoves)
      }
    }
    if (drag.current?.type === 'select-box' && selBox) {
      const minX = Math.min(selBox.wx1, selBox.wx2)
      const maxX = Math.max(selBox.wx1, selBox.wx2)
      const minY = Math.min(selBox.wy1, selBox.wy2)
      const maxY = Math.max(selBox.wy1, selBox.wy2)
      const inside = tree.nodes.filter(
        (n) => n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY,
      )
      if (inside.length > 0) {
        setMultiIds(new Set(inside.map((n) => n.id)))
        setSelectedNodeId(inside[inside.length - 1].id)
      } else {
        setMultiIds(new Set())
        setSelectedNodeId(null)
      }
      setSelBox(null)
    }
    drag.current = null
  }

  function onWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault()
    const r = svgRef.current!.getBoundingClientRect()
    const mx = e.clientX - r.left
    const my = e.clientY - r.top
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    setViewport((v) => {
      const newZoom = Math.min(4, Math.max(0.04, v.zoom * factor))
      const scale = newZoom / v.zoom
      return { zoom: newZoom, x: mx - scale * (mx - v.x), y: my - scale * (my - v.y) }
    })
  }

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
    setViewport({
      zoom,
      x: rect.width / 2 - ((minX + maxX) / 2) * zoom,
      y: rect.height / 2 - ((minY + maxY) / 2) * zoom,
    })
  }, [tree.nodes])

  useEffect(() => {
    const key = `${tree.id}:${tree.version ?? 0}`
    if (fittedTreeKey.current === key || tree.nodes.length === 0) return
    fittedTreeKey.current = key
    const frame = requestAnimationFrame(fitTree)
    return () => cancelAnimationFrame(frame)
  }, [fitTree, tree.id, tree.nodes.length, tree.version])

  // ── right click ────────────────────────────────────────────────────────────

  function onContextMenu(e: React.MouseEvent<SVGSVGElement>) {
    e.preventDefault()
    const hit = hitNode(e.clientX, e.clientY)

    // Ctrl+right click = quick connect
    if (e.ctrlKey || e.metaKey) {
      if (!hit) {
        setCtrlConnectFrom(null)
        return
      }
      if (!ctrlConnectFrom) {
        setCtrlConnectFrom(hit.id)
        return
      }
      if (ctrlConnectFrom !== hit.id) {
        toggleEdge(ctrlConnectFrom, hit.id)
      }
      setCtrlConnectFrom(null)
      return
    }

    // Normal right click = context menu
    if (hit) {
      setSelectedNodeId(hit.id)
      setCtxMenu({ nodeId: hit.id, sx: e.clientX, sy: e.clientY })
    }
  }

  // ── keyboard ───────────────────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const active = document.activeElement
      const inInput = active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA'

      if ((e.key === 'Delete' || e.key === 'Backspace') && !inInput) {
        if (multiIds.size > 0) {
          removeNodes([...multiIds])
          setMultiIds(new Set())
          setSelectedNodeId(null)
        } else if (selectedNodeId) {
          removeNode(selectedNodeId)
          setSelectedNodeId(null)
        }
      }

      if (e.key === 'Escape') {
        setMode('select')
        setConnectingFrom(null)
        setCtrlConnectFrom(null)
        setCtxMenu(null)
        setMultiIds(new Set())
      }

      // Copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !inInput) {
        const ids =
          multiIds.size > 0
            ? multiIds
            : selectedNodeId
              ? new Set([selectedNodeId])
              : new Set<string>()
        clipboard.current = tree.nodes.filter((n) => ids.has(n.id))
      }

      // Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !inInput) {
        if (clipboard.current.length === 0) return
        const offset = 40
        const newNodes = clipboard.current.map((n) => ({
          ...n,
          id: crypto.randomUUID(),
          x: n.x + offset,
          y: n.y + offset,
          data: { ...n.data },
        }))
        addNodes(newNodes)
        // Select the pasted nodes
        const newIds = new Set(newNodes.map((n) => n.id))
        setMultiIds(newIds)
        setSelectedNodeId(newNodes[newNodes.length - 1].id)
        // Shift clipboard for repeated paste
        clipboard.current = newNodes
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, multiIds, tree.nodes])

  // ── cursor ─────────────────────────────────────────────────────────────────

  const edgePaths = useMemo(() => {
    const paths = { normal: '', dimmed: '' }
    for (const edge of tree.edges) {
      const from = nodeById.get(edge.from)
      const to = nodeById.get(edge.to)
      if (!from || !to) continue
      const segment = `M${from.x} ${from.y}L${to.x} ${to.y}`
      const touchesMatch = matchingNodeIds.has(from.id) || matchingNodeIds.has(to.id)
      if (searchActive && !touchesMatch) paths.dimmed += segment
      else paths.normal += segment
    }
    return paths
  }, [matchingNodeIds, nodeById, searchActive, tree.edges])

  const renderedNodes = useMemo(
    () =>
      tree.nodes.map((node) => (
        <g
          key={node.id}
          ref={(element) => {
            if (element) nodeElementRefs.current.set(node.id, element)
            else nodeElementRefs.current.delete(node.id)
          }}
          className="talent-tree-node"
          transform={`translate(${node.x} ${node.y})`}
          style={{ cursor: mode === 'select' ? 'grab' : 'pointer' }}
          onMouseEnter={(event) => {
            if (!drag.current?.hasMoved)
              setTooltip({ nodeId: node.id, sx: event.clientX, sy: event.clientY })
          }}
          onMouseLeave={() => setTooltip(null)}
          onMouseMove={(event) => {
            if (!drag.current?.hasMoved)
              setTooltip((current) =>
                current ? { ...current, sx: event.clientX, sy: event.clientY } : null,
              )
          }}
        >
          <BuilderNode
            node={node}
            selected={selectedNodeId === node.id}
            multiSelected={multiIds.has(node.id)}
            connectPending={connectingFrom === node.id || ctrlConnectFrom === node.id}
            dimmed={searchActive && !matchingNodeIds.has(node.id)}
          />
        </g>
      )),
    [
      connectingFrom,
      ctrlConnectFrom,
      matchingNodeIds,
      mode,
      multiIds,
      searchActive,
      selectedNodeId,
      tree.nodes,
    ],
  )

  const cursor = mode.startsWith('add-')
    ? 'crosshair'
    : mode === 'connect'
      ? 'pointer'
      : selBox
        ? 'crosshair'
        : 'default'

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
      <svg
        ref={svgRef}
        className="h-full w-full select-none"
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
          {gridEnabled ? (
            <pattern
              id="ttgrid-lines"
              width={gridSize * viewport.zoom}
              height={gridSize * viewport.zoom}
              patternUnits="userSpaceOnUse"
              x={viewport.x % (gridSize * viewport.zoom)}
              y={viewport.y % (gridSize * viewport.zoom)}
            >
              <path
                d={`M ${gridSize * viewport.zoom} 0 L 0 0 0 ${gridSize * viewport.zoom}`}
                fill="none"
                stroke="#9ca3af"
                strokeWidth={0.5}
                opacity={0.45}
              />
            </pattern>
          ) : (
            <pattern
              id="ttgrid-dots"
              width={40 * viewport.zoom}
              height={40 * viewport.zoom}
              patternUnits="userSpaceOnUse"
              x={viewport.x % (40 * viewport.zoom)}
              y={viewport.y % (40 * viewport.zoom)}
            >
              <circle cx={0} cy={0} r={1} fill="#9ca3af" opacity={0.4} />
            </pattern>
          )}
        </defs>
        <rect
          width="100%"
          height="100%"
          fill={gridEnabled ? 'url(#ttgrid-lines)' : 'url(#ttgrid-dots)'}
        />

        <g
          className="talent-tree-world"
          data-lod={viewport.zoom < 0.16 ? 'low' : viewport.zoom < 0.32 ? 'medium' : 'full'}
          transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`}
        >
          {/* Edges */}
          <path
            d={edgePaths.dimmed}
            fill="none"
            stroke="#6b7280"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.12}
          />
          <path
            d={edgePaths.normal}
            fill="none"
            stroke="#64748b"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.7}
          />

          {/* Wide invisible targets make individual edges easy to remove with right click. */}
          {tree.edges.map((edge) => {
            const from = nodeById.get(edge.from)
            const to = nodeById.get(edge.to)
            if (!from || !to) return null
            return (
              <line
                key={`edge-hit-${edge.id}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                fill="none"
                stroke="transparent"
                strokeWidth={14}
                vectorEffect="non-scaling-stroke"
                pointerEvents="stroke"
                style={{ cursor: 'context-menu' }}
                onContextMenu={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setCtxMenu(null)
                  setConnectingFrom(null)
                  setCtrlConnectFrom(null)
                  removeEdge(edge.id)
                }}
              />
            )
          })}

          {/* Nodes */}
          {renderedNodes}

          {/* Area selection box */}
          {selBox && (
            <rect
              x={Math.min(selBox.wx1, selBox.wx2)}
              y={Math.min(selBox.wy1, selBox.wy2)}
              width={Math.abs(selBox.wx2 - selBox.wx1)}
              height={Math.abs(selBox.wy2 - selBox.wy1)}
              fill="rgba(99,102,241,0.08)"
              stroke="#6366f1"
              strokeWidth={1 / viewport.zoom}
              strokeDasharray={`${4 / viewport.zoom} ${3 / viewport.zoom}`}
              style={{ pointerEvents: 'none' }}
            />
          )}
        </g>
      </svg>

      {/* ── Tooltip ─────────────────────────────────────────────────── */}
      {tooltip &&
        !drag.current?.hasMoved &&
        (() => {
          const node = tree.nodes.find((n) => n.id === tooltip.nodeId)
          if (!node) return null
          const lines = nodeTooltip(node.data).split('\n')
          return (
            <div
              className="pointer-events-none fixed z-50 max-w-xs rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-700 shadow-2xl dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              style={{ left: tooltip.sx + 16, top: tooltip.sy - 10 }}
            >
              <p
                className="mb-1 text-sm font-bold"
                style={{ color: NODE_TYPE_COLORS[node.data.type].stroke }}
              >
                {NODE_TYPE_LABELS[node.data.type]}
              </p>
              {lines.map((l, i) => (
                <p key={i} className={i === 0 ? 'font-semibold text-gray-900 dark:text-white' : ''}>
                  {l}
                </p>
              ))}
            </div>
          )
        })()}

      {/* ── Context menu ────────────────────────────────────────────── */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setCtxMenu(null)} />
          <div
            className="fixed z-50 min-w-[160px] rounded-xl border border-gray-200 bg-white py-1.5 text-sm shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            style={{ left: ctxMenu.sx, top: ctxMenu.sy }}
          >
            <button
              className="w-full px-4 py-1.5 text-left text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
              onClick={() => {
                setSelectedNodeId(ctxMenu.nodeId)
                setCtxMenu(null)
              }}
            >
              ✏ Editar nó
            </button>
            <button
              className="w-full px-4 py-1.5 text-left text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
              onClick={() => {
                setMode('connect')
                setConnectingFrom(ctxMenu.nodeId)
                setCtxMenu(null)
              }}
            >
              ⟶ Conectar a…
            </button>
            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
            <button
              className="w-full px-4 py-1.5 text-left text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
              onClick={() => {
                removeNode(ctxMenu.nodeId)
                if (selectedNodeId === ctxMenu.nodeId) setSelectedNodeId(null)
                setCtxMenu(null)
              }}
            >
              ✕ Remover nó
            </button>
          </div>
        </>
      )}

      {/* ── Ctrl-connect banner ──────────────────────────────────────── */}
      {ctrlConnectFrom && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg">
          Ctrl+Botão direito no segundo nó para conectar
          <button
            className="rounded-full bg-white/20 px-2 py-0.5 hover:bg-white/40"
            onClick={() => setCtrlConnectFrom(null)}
          >
            ESC
          </button>
        </div>
      )}

      {/* ── Multi-select badge ───────────────────────────────────────── */}
      {multiIds.size > 1 && !ctrlConnectFrom && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-violet-600/90 px-3 py-1 text-[10px] font-bold text-white shadow">
          {multiIds.size} nós selecionados · Del = remover · Ctrl+C = copiar
        </div>
      )}

      {/* ── Mode banner ─────────────────────────────────────────────── */}
      {(mode.startsWith('add-') || mode === 'connect') && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-amber-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg">
          {mode.startsWith('add-')
            ? `Clique no canvas para colocar: ${NODE_TYPE_LABELS[mode.slice(4) as TalentNodeType]}`
            : connectingFrom
              ? 'Clique no segundo nó para conectar'
              : 'Clique no primeiro nó'}
          <button
            className="rounded-full bg-white/20 px-2 py-0.5 hover:bg-white/40"
            onClick={() => {
              setMode('select')
              setConnectingFrom(null)
            }}
          >
            ESC
          </button>
        </div>
      )}

      {/* ── Empty-state hint ────────────────────────────────────────── */}
      {tree.nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-sm font-medium text-gray-300 select-none dark:text-gray-700">
            Use a barra de ferramentas para adicionar nós à árvore
          </p>
        </div>
      )}
    </div>
  )
}
