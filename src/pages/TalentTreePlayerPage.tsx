import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTalentTreeStore } from '../features/talentTree/store/talentTreeStore'
import { useCharacterV2Store } from '../features/characterV2/store/characterV2Store'
import {
  NODE_TYPE_COLORS, NODE_TYPE_LABELS, nodeTooltip,
  type TalentTreeNode,
} from '../types/talentTree'
import { ELEMENTS } from '../data/elements'
import { MAGIC_TYPES } from '../data/magicTypes'

// ── Geometry constants ────────────────────────────────────────────────────────
const NODE_R = 34

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

// ── Player Node Visual ────────────────────────────────────────────────────────

function PlayerNodeVisual({
  node, acquired, onClick,
}: {
  node: TalentTreeNode
  acquired: boolean
  onClick: () => void
}) {
  const { fill, stroke, text } = NODE_TYPE_COLORS[node.data.type]
  const outerStroke = acquired ? '#f59e0b' : stroke
  const outerWidth = acquired ? 3.5 : 2
  const nodeFill = acquired ? fill : 'rgba(30,30,40,0.85)'
  const nodeText = acquired ? text : '#9ca3af'

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
    case 'weaponBonus':
      icon = '🗡'; sublabel = (node.data.requiredTags[0] ?? 'Arma').slice(0, 9); break
    case 'spellModifier':
      icon = '✧'; sublabel = node.data.effectType.slice(0, 9); break
    case 'defenseBonus':
      icon = '🛡'; sublabel = `-${node.data.value} dano`; break
    case 'skillBonus':
      icon = '📚'; sublabel = `+${node.data.value} ${(node.data.skillName || node.data.skillId).slice(0, 6)}`; break
  }

  const shpProps = { fill: nodeFill, stroke: outerStroke, strokeWidth: outerWidth }
  const shape = (() => {
    switch (node.data.type) {
      case 'player':        return <rect x={-NODE_R} y={-NODE_R} width={NODE_R * 2} height={NODE_R * 2} rx={8} {...shpProps} />
      case 'attribute':     return <circle r={NODE_R} {...shpProps} />
      case 'magic':         return <polygon points={hexPts(NODE_R)} {...shpProps} />
      case 'stat':          return <polygon points={diamondPts(NODE_R)} {...shpProps} />
      case 'combatAbility': return <polygon points={pentagPts(NODE_R)} {...shpProps} />
      case 'extraDamage':   return <circle r={NODE_R} strokeDasharray="5 3" {...shpProps} />
      case 'healing':       return <circle r={NODE_R} strokeDasharray="8 2" {...shpProps} />
      case 'weaponBonus':   return <polygon points={hexPts(NODE_R)} {...shpProps} />
      case 'spellModifier': return <polygon points={diamondPts(NODE_R)} {...shpProps} />
      case 'defenseBonus':  return <polygon points={pentagPts(NODE_R)} {...shpProps} />
      case 'skillBonus':    return <circle r={NODE_R} {...shpProps} />
    }
  })()

  return (
    <g
      onClick={onClick}
      className="cursor-pointer"
      style={{ filter: acquired ? 'drop-shadow(0 0 6px rgba(245,158,11,0.6))' : undefined }}
    >
      {shape}
      <text y={-6} textAnchor="middle" dominantBaseline="middle" fontSize={14} fontWeight="bold" fill={nodeText} style={{ pointerEvents: 'none' }}>
        {icon}
      </text>
      <text y={10} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill={nodeText} style={{ pointerEvents: 'none' }}>
        {sublabel}
      </text>
      {acquired && (
        <circle r={6} cx={NODE_R * 0.72} cy={-NODE_R * 0.72} fill="#f59e0b" stroke="#92400e" strokeWidth={1} />
      )}
    </g>
  )
}

// ── Node Details Panel ────────────────────────────────────────────────────────

function NodeDetails({ node, acquired, onAcquire, onRemove }: {
  node: TalentTreeNode
  acquired: boolean
  onAcquire: () => void
  onRemove: () => void
}) {
  const { stroke } = NODE_TYPE_COLORS[node.data.type]
  const tooltip = nodeTooltip(node.data)

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 mt-3 pt-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold" style={{ color: stroke }}>{NODE_TYPE_LABELS[node.data.type]}</span>
          {'name' in node.data && (
            <span className="text-sm font-bold text-gray-900 dark:text-white">{(node.data as { name: string }).name}</span>
          )}
        </div>
        <button
          onClick={acquired ? onRemove : onAcquire}
          className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
            acquired
              ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/40'
              : 'bg-amber-500 hover:bg-amber-400 text-white shadow'
          }`}
        >
          {acquired ? '✕ Remover' : '✦ Adquirir'}
        </button>
      </div>
      <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">{tooltip}</pre>

      {/* Extra detail for magic nodes */}
      {node.data.type === 'magic' && (
        <div className="mt-2 flex flex-wrap gap-1">
          {node.data.elements.map((elId) => {
            const el = ELEMENTS.find((e) => e.id === elId)
            return el ? (
              <span key={elId} className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: el.color, color: el.textColor }}>
                {el.label}
              </span>
            ) : null
          })}
          {node.data.magicTypes.map((typeId) => {
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
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TalentTreePlayerPage() {
  const navigate = useNavigate()
  const tree = useTalentTreeStore((s) => s.tree)
  const character = useCharacterV2Store((s) => s.character)
  const acquireNode = useCharacterV2Store((s) => s.acquireNode)
  const removeNode = useCharacterV2Store((s) => s.removeNode)

  const acquiredSet = new Set(character.acquiredNodeIds)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const selectedNode = tree.nodes.find((n) => n.id === selectedNodeId) ?? null

  // Viewport pan/zoom
  const [vp, setVp] = useState({ x: 0, y: 0, zoom: 1 })
  const svgRef = useRef<SVGSVGElement>(null)
  const panning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 })

  const onMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 1 && !(e.button === 0 && e.altKey)) return
    panning.current = true
    panStart.current = { x: e.clientX, y: e.clientY, vx: vp.x, vy: vp.y }
  }, [vp])

  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!panning.current) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    setVp((v) => ({ ...v, x: panStart.current.vx + dx, y: panStart.current.vy + dy }))
  }, [])

  const onMouseUp = useCallback(() => { panning.current = false }, [])

  const onWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    setVp((v) => {
      const newZoom = Math.max(0.2, Math.min(3, v.zoom * factor))
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return { ...v, zoom: newZoom }
      const cx = e.clientX - rect.left; const cy = e.clientY - rect.top
      return {
        zoom: newZoom,
        x: cx - (cx - v.x) * (newZoom / v.zoom),
        y: cy - (cy - v.y) * (newZoom / v.zoom),
      }
    })
  }, [])

  const acquiredCount = character.acquiredNodeIds.length
  const totalNodes = tree.nodes.filter((n) => n.data.type !== 'player').length

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
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 bg-gray-900 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/v2')}
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-bold text-gray-300 hover:text-white hover:border-amber-500 transition"
          >
            ← Ficha
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{tree.name}</h1>
            {tree.description && (
              <p className="text-xs text-gray-500">{tree.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">
            Personagem: <span className="text-amber-400 font-semibold">{character.name}</span>
          </span>
          <div className="text-xs text-gray-400">
            Nós adquiridos:{' '}
            <span className="font-bold text-amber-400">{acquiredCount}</span>
            <span className="text-gray-600"> / {totalNodes}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <svg
          ref={svgRef}
          className="flex-1 select-none"
          style={{ background: '#111827', cursor: panning.current ? 'grabbing' : 'grab' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
        >
          <g transform={`translate(${vp.x},${vp.y}) scale(${vp.zoom})`}>
            {/* Edges */}
            {tree.edges.map((edge) => {
              const from = tree.nodes.find((n) => n.id === edge.from)
              const to = tree.nodes.find((n) => n.id === edge.to)
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
              const acquired = acquiredSet.has(node.id)
              const selected = selectedNodeId === node.id
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedNodeId(selected ? null : node.id)
                  }}
                >
                  {selected && (
                    <circle
                      r={NODE_R + 8}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      className="animate-spin"
                      style={{ animationDuration: '8s' }}
                    />
                  )}
                  <PlayerNodeVisual
                    node={node}
                    acquired={acquired}
                    onClick={() => setSelectedNodeId(selected ? null : node.id)}
                  />
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
              Clique em um nó para adquirir ou remover. Alt+arrastar ou roda do mouse para navegar.
            </p>
          </div>

          {/* Legend */}
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">Tipos</p>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(NODE_TYPE_COLORS) as (keyof typeof NODE_TYPE_COLORS)[]).filter(t => t !== 'player').map((t) => {
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

          {/* Selected node details */}
          <div className="px-4 py-3 flex-1">
            {selectedNode ? (
              <NodeDetails
                node={selectedNode}
                acquired={acquiredSet.has(selectedNode.id)}
                onAcquire={() => acquireNode(selectedNode.id)}
                onRemove={() => removeNode(selectedNode.id)}
              />
            ) : (
              <p className="text-xs text-gray-600 text-center mt-8">
                Selecione um nó na árvore para ver detalhes.
              </p>
            )}
          </div>

          {/* Quick stats */}
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
                      <span className="text-[10px] text-gray-300 truncate">{label}</span>
                    </div>
                  )
                })}
              {acquiredCount === 0 && (
                <p className="text-[10px] text-gray-600">Nenhum nó adquirido.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
