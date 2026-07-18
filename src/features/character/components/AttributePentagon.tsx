import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AttributeName } from '../../../types/game'
import { useCharacterStats } from '../hooks/useCharacterStats'

// ── Pentagon geometry ──────────────────────────────────────────────────────────
const CX = 250
const CY = 230
const R = 155

function vertex(angleOffsetDeg: number) {
  const rad = (Math.PI / 180) * angleOffsetDeg
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) }
}

const ATTRS: { id: AttributeName; label: string; angle: number }[] = [
  { id: 'wisdom',    label: 'Wisdom',    angle: -90 },
  { id: 'sense',     label: 'Sense',     angle: -18 },
  { id: 'fortitude', label: 'Fortitude', angle:  54 },
  { id: 'might',     label: 'Might',     angle: 126 },
  { id: 'grace',     label: 'Grace',     angle: 198 },
]

const V = ATTRS.map((a) => vertex(a.angle))
const pentagonPath = V.map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x},${v.y}`).join(' ') + ' Z'
const starOrder = [0, 2, 4, 1, 3]
const starPath = starOrder.map((i, j) => `${j === 0 ? 'M' : 'L'} ${V[i].x},${V[i].y}`).join(' ') + ' Z'

function getDiceValue(val: number) {
  if (val <= 5) return '1D20'
  if (val <= 10) return '2D20'
  if (val <= 15) return '3D20'
  if (val <= 20) return '4D20'
  return '5D20'
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AttributePentagon() {
  const { attributes } = useCharacterStats()
  const navigate = useNavigate()
  const [connecting, setConnecting] = useState(false)

  function handleConnect() {
    if (connecting) return
    setConnecting(true)
    setTimeout(() => navigate('/arvore'), 1000)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-1.5 border border-amber-200 dark:border-amber-800/40 text-center">
        Atributos provenientes da Árvore de Talento, clique no Pináculo para gerenciar nós
      </p>

      {/* Pentagon container */}
      <div
        className={`relative w-full max-w-[440px] cursor-pointer transition-all duration-700 ${
          connecting ? 'scale-95 opacity-60' : 'hover:scale-[1.02]'
        }`}
        style={{ aspectRatio: '500/480' }}
        onClick={handleConnect}
        title="Clique para conectar com o Pináculo"
      >
        {/* Animated glow ring when connecting */}
        {connecting && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-48 h-48 rounded-full border-4 border-amber-400 animate-ping opacity-75" />
          </div>
        )}

        {/* SVG decorative layer */}
        <svg
          viewBox="0 0 500 480"
          className={`absolute inset-0 h-full w-full transition-all duration-700 ${
            connecting ? 'drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]' : ''
          }`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="glow-v2">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path d={pentagonPath} fill="rgba(180,120,40,0.04)" stroke="rgba(180,120,40,0.2)" strokeWidth="1" />
          <path
            d={starPath}
            fill="rgba(180,120,40,0.06)"
            stroke={connecting ? 'rgba(251,191,36,0.9)' : 'rgba(255,180,50,0.55)'}
            strokeWidth={connecting ? '3' : '1.5'}
            filter="url(#glow-v2)"
            className="transition-all duration-500"
          />
          {V.map((v, i) => (
            <circle key={i} cx={v.x} cy={v.y} r="5" fill="#b45309" opacity="0.7" />
          ))}
          <circle
            cx={CX} cy={CY} r="44"
            className="fill-white dark:fill-[rgba(30,25,15,0.9)] transition-all duration-500"
            stroke={connecting ? 'rgba(251,191,36,0.9)' : 'rgba(180,120,40,0.4)'}
            strokeWidth={connecting ? '3' : '1.5'}
          />
        </svg>

        {/* Attribute display – read-only */}
        {ATTRS.map((attr, i) => (
          <div
            key={attr.id}
            className="absolute flex flex-col items-center gap-0.5 pointer-events-none"
            style={{ left: `${(V[i].x / 500) * 100}%`, top: `${(V[i].y / 480) * 100}%`, transform: 'translate(-50%, -50%)' }}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400/90">
              {attr.label}
            </span>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-amber-400/60 dark:border-amber-700/50 bg-white dark:bg-gray-900/90 text-xl font-bold text-gray-900 dark:text-white shadow"
            >
              {attributes[attr.id]}
            </div>
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
              {getDiceValue(attributes[attr.id])}
            </span>
          </div>
        ))}

        {/* Center – Pináculo button */}
        <div
          className="absolute flex flex-col items-center gap-0.5"
          style={{ left: `${(CX / 500) * 100}%`, top: `${(CY / 480) * 100}%`, transform: 'translate(-50%,-50%)' }}
        >
          <span className="text-[8px] font-bold uppercase tracking-wider text-amber-600/90 dark:text-amber-600/80 text-center leading-tight">
            {connecting ? '✦' : '⬡'}
          </span>
        </div>
      </div>

      {/* Connect button below pentagon */}
      <button
        onClick={handleConnect}
        disabled={connecting}
        className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300 ${
          connecting
            ? 'bg-amber-300 text-amber-900 cursor-not-allowed opacity-60'
            : 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg hover:shadow-amber-400/30'
        }`}
      >
        {connecting ? (
          <>
            <span className="inline-block animate-spin">✦</span>
            Conectando…
          </>
        ) : (
          <>
            <span>✦</span>
            Conectar com o Pináculo
          </>
        )}
      </button>
    </div>
  )
}
