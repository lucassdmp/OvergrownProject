import { useState } from 'react'
import { useCharacterStore } from '../store/characterStore'
import { ELEMENTS_MAP } from '../../../data/elements'
import { MAGIC_TYPES_MAP } from '../../../data/magicTypes'
import type { CustomSpell, SpellLevel } from '../../../types/game'
import AddSpellModal from './modals/AddSpellModal'

const LEVEL_LABEL: Record<SpellLevel, string> = {
  0: '0', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', divino: 'Div',
}

function SpellCard({ spell }: { spell: CustomSpell }) {
  const removeSpell = useCharacterStore((s) => s.removeSpell)
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)

  return (
    <>
      {editing && <AddSpellModal existing={spell} onClose={() => setEditing(false)} />}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-gray-900 dark:text-white truncate">{spell.name}</span>
            {spell.elements.map((eid) => {
              const el = ELEMENTS_MAP[eid]
              if (!el) return null
              return (
                <span
                  key={eid}
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: el.color, color: el.textColor }}
                >
                  {el.label}
                </span>
              )
            })}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {spell.types.map((tid) => {
              const mt = MAGIC_TYPES_MAP[tid]
              if (!mt) return null
              return (
                <span
                  key={tid}
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: mt.color, color: mt.textColor }}
                >
                  {mt.label}
                </span>
              )
            })}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="ml-1 text-xs text-gray-500 dark:text-gray-400 transition hover:text-gray-900 dark:hover:text-white"
              title={expanded ? 'Recolher' : 'Expandir'}
            >
              {expanded ? '▲' : '▼'}
            </button>
            <button onClick={() => setEditing(true)} className="text-xs text-gray-500 transition hover:text-amber-400">
              ✎
            </button>
            <button onClick={() => removeSpell(spell.id)} className="text-xs text-gray-500 transition hover:text-red-400">
              ✕
            </button>
          </div>
        </div>

        {/* Description / category */}
        {spell.category && (
          <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-500/70 bg-amber-50 dark:bg-gray-800/40 border-b border-amber-100 dark:border-gray-700/50">
            {spell.category}
          </div>
        )}

        {expanded && (
          <>
            {spell.description && (
              <p className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 italic border-b border-gray-200 dark:border-gray-700/40">
                {spell.description}
              </p>
            )}

            {/* Level table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800/80 text-gray-500">
                    <th className="px-2 py-1 text-left w-8">Nv</th>
                    <th className="px-2 py-1 text-left">Custo</th>
                    <th className="px-2 py-1 text-left">Escala</th>
                    <th className="px-2 py-1 text-left">Especial</th>
                  </tr>
                </thead>
                <tbody>
                  {spell.levels.filter((l) => l.cost || l.scaling || l.special).map((entry) => (
                    <tr key={String(entry.level)} className="border-t border-gray-100 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                      <td className="px-2 py-1 font-bold text-amber-400">{LEVEL_LABEL[entry.level]}</td>
                      <td className="px-2 py-1 text-sky-300">{entry.cost}</td>
                      <td className="px-2 py-1 text-gray-700 dark:text-gray-300">{entry.scaling}</td>
                      <td className="px-2 py-1 text-amber-300/80 font-semibold">{entry.special ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Special descriptions */}
            {Object.keys(spell.specialDescriptions).length > 0 && (
              <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700/40 space-y-1">
                {Object.entries(spell.specialDescriptions).map(([k, v]) => (
                  <p key={k} className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-semibold text-amber-300/80">{k}:</span> {v}
                  </p>
                ))}
              </div>
            )}

            {spell.notes && (
              <p className="px-3 pb-2 text-xs text-gray-500 italic">{spell.notes}</p>
            )}
          </>
        )}
      </div>
    </>
  )
}

export default function SpellList() {
  const spells = useCharacterStore((s) => s.character.customSpells)
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-amber-400/80">
          ✦ Lista de Mágias
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-full border border-amber-400/70 dark:border-amber-800/50 px-3 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-500 transition hover:bg-amber-100 dark:hover:bg-amber-900/30"
        >
          + Adicionar
        </button>
      </div>

      {spells.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-600">
          Nenhuma magia adicionada.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {spells.map((spell) => (
            <SpellCard key={spell.id} spell={spell} />
          ))}
        </div>
      )}

      {showModal && <AddSpellModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
