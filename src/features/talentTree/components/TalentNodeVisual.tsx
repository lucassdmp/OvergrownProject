/* eslint-disable react-refresh/only-export-components -- shared canvas geometry and component live together. */
import { useId } from 'react'
import type { TalentTreeNode, TalentNodeData, TalentNodeType } from '../../../types/talentTree'
import type { AttributeName } from '../../../types/game'

/** General nodes are slightly smaller; combat abilities keep a stronger presence. */
export const NODE_R = 31

export const ATTRIBUTE_NODE_COLORS: Record<AttributeName, string> = {
  might: '#c37470',
  grace: '#74a47d',
  wisdom: '#7698bf',
  fortitude: '#b69d5c',
  sense: '#9ba7b3',
}

export function nodeRadius(data: TalentNodeData, tier?: TalentTreeNode['tier']): number {
  const tierScale = tier === 'keystone' ? 1.22 : tier === 'notable' ? 1.1 : 1
  if (data.type === 'combatAbility') return NODE_R * 1.16 * tierScale
  if (data.type === 'attribute') return NODE_R * 0.72 * tierScale
  if (data.type === 'link') return NODE_R * 0.45
  return NODE_R * tierScale
}

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
  pc: 'PC',
  resistencia: 'RES',
  esquiva: 'ESQ',
}

export function nodeSublabel(data: TalentNodeData, attrOverride?: AttributeName): string {
  switch (data.type) {
    case 'player':
      return (data.name || 'Jogador').slice(0, 10)
    case 'attribute': {
      const attr = attrOverride ?? data.attribute
      return attr ? `+${data.value} ${ATTR_SHORT[attr] ?? attr}` : `+${data.value} ?`
    }
    case 'magic':
      return (data.name || 'Magia').slice(0, 10)
    case 'stat':
      return `+${data.value} ${STAT_SHORT[data.stat] ?? '?'}`
    case 'combatAbility':
      return (data.skillName || 'Combate').slice(0, 10)
    case 'extraDamage':
      return data.dice ?? `+${data.flat ?? 0}`
    case 'healing': {
      const parts = [data.dice, data.flat ? `+${data.flat}` : ''].filter(Boolean)
      return parts.join(' ') || 'Cura'
    }
    case 'weaponBonus':
      return (data.requiredTags[0] ?? 'Arma').slice(0, 9)
    case 'spellModifier':
      return data.effectType.slice(0, 9)
    case 'defenseBonus':
      return `-${data.value} dano`
    case 'skillBonus':
      return `+${data.value} ${(data.skillName || data.skillId).slice(0, 6)}`
    case 'link':
      return (data.name || 'Ligação').slice(0, 8)
    case 'conditional':
      return (data.name || 'Cond.').slice(0, 10)
  }
}

function parsePosition(position?: string) {
  const match = position?.match(/(-?\d+(?:\.\d+)?)%?\s+(-?\d+(?:\.\d+)?)%?/)
  if (!match) return { x: 50, y: 50 }
  const clamp = (value: number) => Math.min(100, Math.max(0, value))
  return { x: clamp(Number(match[1])), y: clamp(Number(match[2])) }
}

function NodeGlyph({ type, color, size }: { type: TalentNodeType; color: string; size: number }) {
  const common = {
    fill: 'none',
    stroke: color,
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  return (
    <g transform={`translate(${-size / 2} ${-size / 2 - 4}) scale(${size / 24})`} {...common}>
      {type === 'player' && (
        <>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 19c.8-4 3-6 6.5-6s5.7 2 6.5 6" />
        </>
      )}
      {type === 'magic' && (
        <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Zm6 12 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z" />
      )}
      {type === 'stat' && <path d="M4 12h4l2-6 4 12 2-6h4M5 20h14" />}
      {type === 'combatAbility' && (
        <>
          <path d="m5 4 14 14M19 4 5 18M4 3l4 1-3 3-1-4Zm16 0-4 1 3 3 1-4Z" />
          <path d="m3.5 20 3-3m14 3-3-3" />
        </>
      )}
      {type === 'extraDamage' && (
        <path d="m12 2 2.3 6.1L21 6l-3.2 5.8L22 16l-6.6-.8L12 22l-2.4-6.8L3 16l4.2-4.2L4 6l6.7 2.1L12 2Z" />
      )}
      {type === 'healing' && <path d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5V4Z" />}
      {type === 'weaponBonus' && <path d="m15 3 6 0-10 10-3-3L18 0m-8 12-6 6m-1 3 3-3m5-4 3 3" />}
      {type === 'spellModifier' && (
        <>
          <path d="m5 19 10-10 3 3L8 22 5 19Z" />
          <path d="m16 3 .7 2.3L19 6l-2.3.7L16 9l-.7-2.3L13 6l2.3-.7L16 3Zm5 6 .4 1.6L23 11l-1.6.4L21 13l-.4-1.6L19 11l1.6-.4L21 9Z" />
        </>
      )}
      {type === 'defenseBonus' && (
        <path d="M12 2 20 5v6c0 5-3.2 8.7-8 11-4.8-2.3-8-6-8-11V5l8-3Zm-4 10 2.5 2.5L16 9" />
      )}
      {type === 'skillBonus' && (
        <path d="M3 5c3-1 6-.4 9 2v14c-3-2.4-6-3-9-2V5Zm18 0c-3-1-6-.4-9 2v14c3-2.4 6-3 9-2V5Z" />
      )}
      {type === 'link' && <path d="m9 8 2-2a4 4 0 0 1 6 6l-2 2m0-4-6 6a4 4 0 0 1-6-6l2-2" />}
      {type === 'conditional' && (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2m0-14-2 2M7 17l-2 2" />
        </>
      )}
    </g>
  )
}

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
  const clipId = `talent-node-image-${useId().replace(/:/g, '')}`
  const r = nodeRadius(node.data, node.tier)
  const innerR = Math.max(4, r - 4)
  const sublabel = nodeSublabel(node.data, attrOverride)
  const attribute = node.data.type === 'attribute' ? (attrOverride ?? node.data.attribute) : null
  const accent = attribute ? ATTRIBUTE_NODE_COLORS[attribute] : stroke
  const { x, y } = parsePosition(node.imagePosition)
  const imageScale = Math.min(2.5, Math.max(0.5, node.imageScale ?? 1))
  const isSmall = node.data.type === 'link'
  const glyphSize = isSmall ? 12 : node.data.type === 'combatAbility' ? 25 : 22

  return (
    <g>
      {node.tier === 'keystone' && (
        <circle
          className="talent-node-decoration"
          r={r + 8}
          fill="none"
          stroke={accent}
          strokeWidth={1.4}
          opacity={0.65}
        />
      )}
      {node.tier === 'notable' && (
        <circle
          className="talent-node-decoration"
          r={r + 5}
          fill="none"
          stroke={accent}
          strokeWidth={1}
          opacity={0.5}
        />
      )}

      <circle r={r} fill="#11161b" stroke={stroke} strokeWidth={strokeWidth} />
      <circle
        r={innerR}
        fill={fill}
        stroke={accent}
        strokeWidth={node.data.type === 'combatAbility' ? 1.8 : 1}
        strokeOpacity={0.72}
      />

      {node.imageBase64 ? (
        <g className="talent-node-detail" pointerEvents="none">
          <defs>
            <clipPath id={clipId}>
              <circle r={innerR - 1} />
            </clipPath>
          </defs>
          <foreignObject
            x={-(innerR - 1)}
            y={-(innerR - 1)}
            width={(innerR - 1) * 2}
            height={(innerR - 1) * 2}
            clipPath={`url(#${clipId})`}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                borderRadius: '9999px',
              }}
            >
              <img
                src={node.imageBase64}
                alt=""
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: `${x}% ${y}%`,
                  transformOrigin: `${x}% ${y}%`,
                  transform: `scale(${imageScale})`,
                }}
              />
            </div>
          </foreignObject>
        </g>
      ) : node.data.type === 'attribute' ? (
        <g className="talent-node-detail">
          <path
            d="M-3.2-13h6.4l1.2 8.6L13-3.2v6.4L4.4 4.4 3.2 13h-6.4l-1.2-8.6L-13 3.2v-6.4l8.6-1.2L-3.2-13Z"
            fill={accent}
            fillOpacity={0.72}
            stroke={textColor}
            strokeOpacity={0.45}
            strokeWidth={0.8}
            strokeLinejoin="round"
          />
          <circle r={2.1} fill={textColor} fillOpacity={0.75} />
        </g>
      ) : (
        <g className="talent-node-detail">
          <NodeGlyph type={node.data.type} color={textColor} size={glyphSize} />
          {!isSmall && (
            <text
              className="talent-node-sublabel"
              y={r * 0.52}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={7.2}
              fill={textColor}
              style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: 'monospace' }}
            >
              {sublabel}
            </text>
          )}
        </g>
      )}
    </g>
  )
}
