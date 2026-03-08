import { useRef, useState } from 'react'
import { useCharacterStore } from '../store/characterStore'
import type { CharacterAttack, CombatCategory } from '../../../types/game'
import AddAttackModal from './modals/AddAttackModal'

const CATEGORY_COLORS: Record<CombatCategory, string> = {
  melee: 'text-red-400 border-red-800/50 bg-red-900/10',
  ranged: 'text-sky-400 border-sky-800/50 bg-sky-900/10',
  effort: 'text-emerald-400 border-emerald-800/50 bg-emerald-900/10',
}

const CATEGORY_LABELS: Record<CombatCategory, string> = {
  melee: 'Corpo a Corpo',
  ranged: 'Distância',
  effort: 'Esforço',
}

function exportOne(item: object, filename: string) {
  const blob = new Blob([JSON.stringify(item, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function AttackCard({ attack }: { attack: CharacterAttack }) {
  const removeAttack = useCharacterStore((s) => s.removeAttack)
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="font-bold text-gray-900 dark:text-white truncate">{attack.name}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${CATEGORY_COLORS[attack.category]}`}
          >
            {CATEGORY_LABELS[attack.category]}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-xs">
          {attack.cost && (
            <span className="font-bold text-orange-400" title="Custo PC">
              {attack.cost} PC
            </span>
          )}
          {attack.damage && (
            <span className="text-rose-300" title="Dano">
              ⚔ {attack.damage}
            </span>
          )}
          <button
            onClick={() => exportOne(attack, `${attack.name}.json`)}
            title="Exportar este ataque"
            className="text-gray-400 dark:text-gray-500 transition hover:text-red-400"
          >
            ↓
          </button>
          <button onClick={() => setExpanded((v) => !v)} className="text-gray-500 dark:text-gray-400 transition hover:text-gray-900 dark:hover:text-white">
            {expanded ? '▲' : '▼'}
          </button>
          <button onClick={() => removeAttack(attack.id)} className="text-gray-500 transition hover:text-red-400">
            ✕
          </button>
        </div>
      </div>

      {expanded && attack.description && (
        <div className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700/40">
          {attack.description}
        </div>
      )}
    </div>
  )
}

export default function AttackList() {
  const attacks = useCharacterStore((s) => s.character.characterAttacks)
  const importAttacks = useCharacterStore((s) => s.importAttacks)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState<CombatCategory | 'all'>('all')
  const importRef = useRef<HTMLInputElement>(null)

  const visible = filter === 'all' ? attacks : attacks.filter((a) => a.category === filter)

  function handleExport() {
    const json = JSON.stringify(attacks, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ataques.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        const list: CharacterAttack[] = Array.isArray(data) ? data : [data]
        importAttacks(list)
      } catch {
        alert('Arquivo JSON inválido.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-red-400/80">
          ⚔ Lista de Ataques
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={attacks.length === 0}
            title="Exportar ataques"
            className="rounded-full border border-red-400/50 dark:border-red-800/40 px-2.5 py-0.5 text-xs font-semibold text-red-400/70 transition hover:text-red-400 hover:border-red-400 disabled:opacity-30"
          >
            ↓ Exportar
          </button>
          <button
            onClick={() => importRef.current?.click()}
            title="Importar ataques"
            className="rounded-full border border-red-400/50 dark:border-red-800/40 px-2.5 py-0.5 text-xs font-semibold text-red-400/70 transition hover:text-red-400 hover:border-red-400"
          >
            ↑ Importar
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <button
            onClick={() => setShowModal(true)}
            className="rounded-full border border-red-400/70 dark:border-red-800/50 px-3 py-0.5 text-xs font-semibold text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            + Adicionar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5">
        {(['all', 'melee', 'ranged', 'effort'] as const).map((cat) => {
          const labels = { all: 'Todos', melee: 'Corpo a Corpo', ranged: 'Distância', effort: 'Esforço' }
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition border ${
                filter === cat
                ? 'border-gray-400 dark:border-gray-500 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'border-gray-300 dark:border-gray-700 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
              }`}
            >
              {labels[cat]}
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-600">
          Nenhum ataque adicionado.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((attack) => (
            <AttackCard key={attack.id} attack={attack} />
          ))}
        </div>
      )}

      {showModal && <AddAttackModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
