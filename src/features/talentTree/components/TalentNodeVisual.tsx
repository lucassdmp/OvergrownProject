/* eslint-disable react-refresh/only-export-components -- shared canvas geometry and component live together. */
// Shared node visual for both the builder canvas and the player tree page.
// Exports NODE_R, shape helpers, nodeRadius, and TalentNodeVisual.
// Callers control colors; this file controls geometry and icons only.

import type { TalentTreeNode, TalentNodeData } from '../../../types/talentTree'
import type { AttributeName } from '../../../types/game'

export const NODE_R = 34

export const ATTRIBUTE_NODE_COLORS: Record<AttributeName, string> = {
  might: '#ef4444',
  grace: '#22c55e',
  wisdom: '#3b82f6',
  fortitude: '#facc15',
  sense: '#f8fafc',
}

export function hexPts(r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 - 30) * (Math.PI / 180)
    return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
}

export function diamondPts(r: number): string {
  const s = r * 1.15
  return `0,${-s} ${s},0 0,${s} ${-s},0`
}

export function pentagPts(r: number): string {
  return Array.from({ length: 5 }, (_, i) => {
    const a = (i * 72 - 90) * (Math.PI / 180)
    return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
}

export function nodeRadius(data: TalentNodeData, tier?: TalentTreeNode['tier']): number {
  const tierScale = tier === 'keystone' ? 1.28 : tier === 'notable' ? 1.12 : 1
  if (data.type === 'attribute') return NODE_R * 0.62 * tierScale
  if (data.type === 'link') return NODE_R * 0.45
  return NODE_R * tierScale
}

// ── Icon + sublabel ───────────────────────────────────────────────────────────

const ATTR_SHORT: Record<string, string> = {
  might: 'MGT',
  grace: 'GRC',
  wisdom: 'WIS',
  sense: 'SNS',
  fortitude: 'FOR',
}
const STAT_SHORT: Record<string, string> = {
  vida: 'VID',
  iep: 'IEP',
  pc: 'PC ',
  resistencia: 'RES',
  esquiva: 'ESQ',
}

export function nodeIconAndSublabel(
  data: TalentNodeData,
  attrOverride?: AttributeName,
): { icon: string; sublabel: string } {
  switch (data.type) {
    case 'player':
      return { icon: '👤', sublabel: (data.name || 'Jogador').slice(0, 10) }
    case 'attribute': {
      const attr = attrOverride ?? data.attribute
      return {
        icon: 'A',
        sublabel: attr ? `+${data.value} ${ATTR_SHORT[attr] ?? attr}` : `+${data.value} ?`,
      }
    }
    case 'magic':
      return { icon: '✦', sublabel: (data.name || 'Magia').slice(0, 10) }
    case 'stat':
      return { icon: '★', sublabel: `+${data.value} ${STAT_SHORT[data.stat] ?? '?'}` }
    case 'combatAbility':
      return { icon: '⚔', sublabel: (data.skillName || 'Combate').slice(0, 9) }
    case 'extraDamage':
      return { icon: '⊕', sublabel: data.dice ?? `+${data.flat ?? 0}` }
    case 'healing': {
      const parts: string[] = []
      if (data.dice) parts.push(data.dice)
      if (data.flat) parts.push(`+${data.flat}`)
      return { icon: '✚', sublabel: parts.join(' ') || 'Cura' }
    }
    case 'weaponBonus':
      return { icon: '🗡', sublabel: (data.requiredTags[0] ?? 'Arma').slice(0, 9) }
    case 'spellModifier':
      return { icon: '✧', sublabel: data.effectType.slice(0, 9) }
    case 'defenseBonus':
      return { icon: '🛡', sublabel: `-${data.value} dano` }
    case 'skillBonus':
      return {
        icon: '📚',
        sublabel: `+${data.value} ${(data.skillName || data.skillId).slice(0, 6)}`,
      }
    case 'link':
      return { icon: '⛓', sublabel: (data.name || 'Ligação').slice(0, 8) }
    case 'conditional':
      return { icon: '⚙', sublabel: (data.name || 'Cond.').slice(0, 10) }
  }
}

// ── Shared node visual ────────────────────────────────────────────────────────

interface Props {
  node: TalentTreeNode
  fill: string
  stroke: string
  strokeWidth: number
  textColor: string
  attrOverride?: AttributeName
}

export function TalentNodeVisual({
  node,
  fill,
  stroke,
  strokeWidth,
  textColor,
  attrOverride,
}: Props) {
  const r = nodeRadius(node.data, node.tier)
  const { icon, sublabel } = nodeIconAndSublabel(node.data, attrOverride)

  if (node.data.type === 'attribute') {
    const attribute = attrOverride ?? node.data.attribute
    const attributeColor = attribute ? ATTRIBUTE_NODE_COLORS[attribute] : '#94a3b8'
    const mythicalPlus =
      'M -3.4 -14 L 3.4 -14 L 4.6 -5.2 L 14 -3.4 L 14 3.4 L 4.6 5.2 L 3.4 14 L -3.4 14 L -4.6 5.2 L -14 3.4 L -14 -3.4 L -4.6 -5.2 Z'

    return (
      <g>
        <circle r={r} fill="#090d16" stroke={attributeColor} strokeWidth={2.4} />
        <circle
          className="talent-node-detail"
          r={r - 4}
          fill={attributeColor}
          fillOpacity={0.13}
          stroke={attributeColor}
          strokeOpacity={0.4}
          strokeWidth={0.8}
        />
        <path
          className="talent-node-detail"
          d={mythicalPlus}
          fill={attributeColor}
          stroke={attribute === 'sense' ? '#64748b' : '#ffffff'}
          strokeOpacity={attribute === 'sense' ? 0.8 : 0.35}
          strokeWidth={0.9}
          strokeLinejoin="round"
        />
        <circle className="talent-node-detail" r={2.4} fill="#ffffff" fillOpacity={0.8} />
        {strokeWidth >= 2.5 && (
          <circle
            className="talent-node-decoration"
            r={r + 5}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        )}
      </g>
    )
  }

  const shpProps = { fill, stroke, strokeWidth }

  const shape = (() => {
    switch (node.data.type) {
      case 'player':
        return <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={8} {...shpProps} />
      case 'magic':
        return <polygon points={hexPts(r)} {...shpProps} />
      case 'stat':
        return <polygon points={diamondPts(r)} {...shpProps} />
      case 'combatAbility':
        return <polygon points={pentagPts(r)} {...shpProps} />
      case 'extraDamage':
        return <circle r={r} strokeDasharray="5 3" {...shpProps} />
      case 'healing':
        return <circle r={r} strokeDasharray="8 2" {...shpProps} />
      case 'weaponBonus':
        return <polygon points={hexPts(r)} {...shpProps} />
      case 'spellModifier':
        return <polygon points={diamondPts(r)} {...shpProps} />
      case 'defenseBonus':
        return <polygon points={pentagPts(r)} {...shpProps} />
      case 'skillBonus':
        return <circle r={r} strokeDasharray="3 2" {...shpProps} />
      case 'link':
        return <circle r={r} strokeDasharray="2 2" {...shpProps} />
      case 'conditional':
        return <polygon points={hexPts(r)} strokeDasharray="6 2" {...shpProps} />
    }
  })()

  const isSmall = node.data.type === 'link'
  const iconY = isSmall ? -3 : -6
  const subY = isSmall ? 5 : 10
  const iconSz = isSmall ? 10 : 14
  const subSz = isSmall ? 6 : 8

  return (
    <g>
      {node.tier === 'keystone' && (
        <circle
          className="talent-node-decoration"
          r={r + 9}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeDasharray="3 3"
        />
      )}
      {node.tier === 'notable' && (
        <circle
          className="talent-node-decoration"
          r={r + 5}
          fill="none"
          stroke={stroke}
          strokeWidth={1.2}
          opacity={0.7}
        />
      )}
      {shape}
      <text
        className="talent-node-detail"
        y={iconY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={iconSz}
        fontWeight="bold"
        fill={textColor}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {icon}
      </text>
      <text
        className="talent-node-detail talent-node-sublabel"
        y={subY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={subSz}
        fill={textColor}
        style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: 'monospace' }}
      >
        {sublabel}
      </text>
    </g>
  )
}
