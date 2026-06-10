import { useEffect, useMemo, useState } from 'react'

type DiceType = 2 | 4 | 6 | 8 | 10 | 12 | 20 | 100

type RollResult = {
  id: string
  sides: DiceType
  value: number
}

const DICE_TYPES: Array<{ sides: DiceType; label: string }> = [
  { sides: 2, label: 'D2' },
  { sides: 4, label: 'D4' },
  { sides: 6, label: 'D6' },
  { sides: 8, label: 'D8' },
  { sides: 10, label: 'D10' },
  { sides: 12, label: 'D12' },
  { sides: 20, label: 'D20' },
  { sides: 100, label: 'D100' },
]

const DICE_SHAPES: Record<DiceType, { points?: string; circle?: boolean }> = {
  2: { circle: true },
  4: { points: '12 3 21 20 3 20' },
  6: { points: '4 4 20 4 20 20 4 20' },
  8: { points: '12 2 22 12 12 22 2 12' },
  10: { points: '12 2 20 9 17 22 7 22 4 9' },
  12: { points: '12 2 21 7 21 17 12 22 3 17 3 7' },
  20: { points: '12 2 22 9 18 22 6 22 2 9' },
  100: { points: '12 2 19 4 22 10 19 20 12 22 5 20 2 10 5 4' },
}

function rollDie(sides: DiceType) {
  return Math.floor(Math.random() * sides) + 1
}

function DiceIcon({ sides, className }: { sides: DiceType; className?: string }) {
  const shape = DICE_SHAPES[sides]
  const label = `D${sides}`
  const fontSize = sides === 100 ? 6 : 8

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label={label}
    >
      {shape.circle ? (
        <circle cx="12" cy="12" r="9" strokeWidth="1.2" />
      ) : (
        <polygon points={shape.points} strokeWidth="1.2" />
      )}
      <text
        x="12"
        y="12.5"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={fontSize}
        fontWeight="700"
        className="fill-current"
        stroke="none"
      >
        {label}
      </text>
    </svg>
  )
}

export default function DiceRoller() {
  const [pool, setPool] = useState<DiceType[]>([])
  const [results, setResults] = useState<RollResult[]>([])

  useEffect(() => {
    if (results.length > 0) {
      setResults([])
    }
  }, [pool])

  const counts = useMemo(() => {
    const map = new Map<DiceType, number>()
    for (const sides of pool) {
      map.set(sides, (map.get(sides) ?? 0) + 1)
    }
    return map
  }, [pool])

  const groupedResults = useMemo(() => {
    const map = new Map<DiceType, number[]>()
    for (const result of results) {
      const list = map.get(result.sides) ?? []
      list.push(result.value)
      map.set(result.sides, list)
    }

    return DICE_TYPES
      .filter((type) => map.has(type.sides))
      .map((type) => ({
        ...type,
        values: map.get(type.sides) ?? [],
      }))
  }, [results])

  const total = results.reduce((sum, result) => sum + result.value, 0)
  const poolSummary = DICE_TYPES
    .map((type) => {
      const count = counts.get(type.sides) ?? 0
      if (count === 0) return null
      return `${count}d${type.sides}`
    })
    .filter(Boolean)
    .join(' + ')

  function handleAdd(sides: DiceType) {
    setPool((prev) => [...prev, sides])
  }

  function handleRemove(sides: DiceType) {
    setPool((prev) => {
      const index = prev.lastIndexOf(sides)
      if (index === -1) return prev
      const next = [...prev]
      next.splice(index, 1)
      return next
    })
  }

  function handleRoll() {
    if (pool.length === 0) return
    setResults(
      pool.map((sides) => ({
        id: crypto.randomUUID(),
        sides,
        value: rollDie(sides),
      })),
    )
  }

  function handleClear() {
    setPool([])
    setResults([])
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-wide">Rolagem de Dados</h2>
        <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
          {pool.length} dados no pool
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleRoll}
            disabled={pool.length === 0}
            className="rounded-full border border-amber-400/70 dark:border-amber-700/60 px-3 py-0.5 text-xs font-semibold text-amber-600 transition hover:bg-amber-50 dark:hover:bg-amber-900/30 disabled:opacity-40"
          >
            Rolar
          </button>
          <button
            onClick={handleClear}
            disabled={pool.length === 0 && results.length === 0}
            className="rounded-full border border-gray-300 dark:border-gray-700 px-3 py-0.5 text-xs font-semibold text-gray-500 transition hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-40"
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {DICE_TYPES.map((type) => {
          const count = counts.get(type.sides) ?? 0
          return (
            <div
              key={type.sides}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-2 py-2 flex flex-col items-center gap-1"
            >
              <DiceIcon
                sides={type.sides}
                className="h-10 w-10 text-amber-600 dark:text-amber-400 fill-amber-200/70 dark:fill-amber-900/40 stroke-amber-600 dark:stroke-amber-400"
              />
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{type.label}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRemove(type.sides)}
                  disabled={count === 0}
                  className="h-6 w-6 rounded-full border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-40"
                >
                  -
                </button>
                <span className="min-w-[18px] text-center text-xs font-bold tabular-nums text-gray-700 dark:text-gray-200">
                  {count}
                </span>
                <button
                  onClick={() => handleAdd(type.sides)}
                  className="h-6 w-6 rounded-full border border-amber-400/70 dark:border-amber-700/60 text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400"
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
        <span>
          Pool: <span className="font-semibold text-gray-700 dark:text-gray-200">{poolSummary || 'vazio'}</span>
        </span>
        <span>Adicione dados e clique em Rolar para ver os resultados individuais e a soma.</span>
      </div>

      <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 px-3 py-2">
        {results.length === 0 ? (
          <span className="text-xs text-gray-400 dark:text-gray-500">Nenhuma rolagem realizada ainda.</span>
        ) : (
          <div className="flex flex-col gap-2">
            {groupedResults.map((group) => (
              <div key={group.sides} className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  <DiceIcon
                    sides={group.sides}
                    className="h-6 w-6 text-amber-600 dark:text-amber-400 fill-amber-200/60 dark:fill-amber-900/30 stroke-amber-600 dark:stroke-amber-400"
                  />
                  {group.label}
                </div>
                <div className="flex flex-wrap gap-1">
                  {group.values.map((value, index) => (
                    <span
                      key={`${group.sides}-${index}`}
                      className="rounded bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-300">
              <span>Soma total</span>
              <span className="rounded bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                {total}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
