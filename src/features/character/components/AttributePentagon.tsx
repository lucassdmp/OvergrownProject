import type { AttributeName } from '../../../types/game'
import { useCharacterStore, remainingAttributePoints, totalAttributePoints } from '../store/characterStore'

// ── Pentagon geometry ─────────────────────────────────────────────────────────
// viewBox: 0 0 500 480,  center: (250, 230),  radius: 155
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

// Pentagon outline path
const pentagonPath = V.map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x},${v.y}`).join(' ') + ' Z'

// Pentagram star path: skip one vertex each step  (0→2→4→1→3→0)
const starOrder = [0, 2, 4, 1, 3]
const starPath =
  starOrder.map((i, j) => `${j === 0 ? 'M' : 'L'} ${V[i].x},${V[i].y}`).join(' ') + ' Z'

// ── Sub-components ────────────────────────────────────────────────────────────

interface AttrControlProps {
  id: AttributeName
  label: string
  value: number
  canIncrease: boolean
  onChange: (v: number) => void
  /** % positions for absolute layout */
  leftPct: number
  topPct: number
}

function AttributeControl({ id, label, value, canIncrease, onChange, leftPct, topPct }: AttrControlProps) {
  void id
  return (
    <div
      className="absolute flex flex-col items-center gap-0.5"
      style={{ left: `${leftPct}%`, top: `${topPct}%`, transform: 'translate(-50%, -50%)' }}
    >
      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400/90">{label}</span>
      <div className="flex items-center gap-0.5">
        <button
          disabled={value <= 0}
          onClick={() => onChange(value - 1)}
          className="flex h-5 w-5 items-center justify-center rounded bg-gray-200 dark:bg-gray-700/80 text-xs font-bold text-gray-700 dark:text-gray-300 transition hover:bg-gray-300 dark:hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-30"
        >
          −
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-400/60 dark:border-amber-700/50 bg-white dark:bg-gray-900/90 text-xl font-bold text-gray-900 dark:text-white shadow">
          {value}
        </div>
        <button
          disabled={!canIncrease}
          onClick={() => onChange(value + 1)}
          className="flex h-5 w-5 items-center justify-center rounded bg-gray-200 dark:bg-gray-700/80 text-xs font-bold text-gray-700 dark:text-gray-300 transition hover:bg-gray-300 dark:hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AttributePentagon() {
  const character = useCharacterStore((s) => s.character)
  const setAttribute = useCharacterStore((s) => s.setAttribute)
  const setDivinity = useCharacterStore((s) => s.setDivinity)

  const remaining = remainingAttributePoints(character.attributes, character.divinity)
  const total = totalAttributePoints(character.divinity)

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Point counter */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-500 dark:text-gray-400">Pontos de Atributo:</span>
        <span className={remaining < 0 ? 'font-bold text-red-500 dark:text-red-400' : 'font-bold text-amber-600 dark:text-amber-400'}>
          {remaining} restantes
        </span>
        <span className="text-gray-400 dark:text-gray-600">/ {total} total</span>
      </div>

      {/* Pentagon container */}
      <div className="relative w-full max-w-[440px]" style={{ aspectRatio: '500/480' }}>
        {/* SVG decorative layer */}
        <svg
          viewBox="0 0 500 480"
          className="absolute inset-0 h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer pentagon fill */}
          <path d={pentagonPath} fill="rgba(180,120,40,0.04)" stroke="rgba(180,120,40,0.2)" strokeWidth="1" />

          {/* Pentagram star */}
          <path
            d={starPath}
            fill="rgba(180,120,40,0.06)"
            stroke="rgba(255,180,50,0.55)"
            strokeWidth="1.5"
            filter="url(#glow)"
          />

          {/* Vertex circles */}
          {V.map((v, i) => (
            <circle key={i} cx={v.x} cy={v.y} r="5" fill="#b45309" opacity="0.7" />
          ))}

          {/* Center circle */}
          <circle cx={CX} cy={CY} r="38" className="fill-white dark:fill-[rgba(30,25,15,0.9)]" stroke="rgba(180,120,40,0.4)" strokeWidth="1.5" />
        </svg>

        {/* Attribute controls – absolutely positioned over the SVG */}
        {ATTRS.map((attr, i) => (
          <AttributeControl
            key={attr.id}
            id={attr.id}
            label={attr.label}
            value={character.attributes[attr.id]}
            canIncrease={remaining > 0}
            onChange={(v) => setAttribute(attr.id, v)}
            leftPct={(V[i].x / 500) * 100}
            topPct={(V[i].y / 480) * 100}
          />
        ))}

        {/* Center – Divinity */}
        <div
          className="absolute flex flex-col items-center gap-0.5"
          style={{ left: `${(CX / 500) * 100}%`, top: `${(CY / 480) * 100}%`, transform: 'translate(-50%,-50%)' }}
        >
          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600/90 dark:text-amber-600/80">
            Divindade
          </span>
          <input
            type="number"
            min={1}
            max={20}
            value={character.divinity}
            onChange={(e) => setDivinity(Math.max(1, Number(e.target.value)))}
            className="w-10 rounded bg-transparent text-center text-lg font-bold text-amber-700 dark:text-amber-300 focus:outline-none"
          />
        </div>
      </div>
    </div>
  )
}
