import { useState } from 'react'
import { ELEMENTS } from '../../../data/elements'
import { MAGIC_TYPES } from '../../../data/magicTypes'
import { SPELL_LEVEL_LABELS } from '../../../types/game'
import type { MagicNodeData, SpellModifierNodeData } from '../../../types/talentTree'
import { useCharacterV2Stats } from '../hooks/useCharacterV2Stats'
import { SPELL_MODIFIER_EFFECT_LABELS } from '../../../types/talentTree'

function SpellModifierTag({ mod }: { mod: SpellModifierNodeData }) {
  const effectLabel = SPELL_MODIFIER_EFFECT_LABELS[mod.effectType]
  const valStr = mod.effectType === 'costReduction' ? `-${mod.value}` : `+${mod.value}`
  const diceStr = mod.dice ? `${mod.dice}+` : ''
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/40">
      {effectLabel}: {diceStr}{valStr}
    </span>
  )
}

function SpellCard({ spell, modifiers }: { spell: MagicNodeData; modifiers: SpellModifierNodeData[] }) {
  const [expanded, setExpanded] = useState(false)

  // Find modifiers that apply to this spell
  const applicableModifiers = modifiers.filter((mod) => {
    const elemMatch = mod.conditionElements.length === 0 || mod.conditionElements.some((e) => spell.elements.includes(e))
    const typeMatch = mod.conditionTypes.length === 0 || mod.conditionTypes.some((t) => spell.magicTypes.includes(t))
    return elemMatch && typeMatch
  })

  const nonEmptyLevels = spell.levels.filter((l) => l.cost || l.scaling || l.special)

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-sm text-gray-900 dark:text-white">{spell.name}</span>
            {spell.category && (
              <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                [{spell.category}]
              </span>
            )}
          </div>
          {/* Element tags */}
          <div className="flex flex-wrap gap-1 mt-1">
            {spell.elements.map((elId) => {
              const el = ELEMENTS.find((e) => e.id === elId)
              if (!el) return null
              return (
                <span
                  key={elId}
                  className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ background: el.color, color: el.textColor }}
                >
                  {el.label}
                </span>
              )
            })}
            {spell.magicTypes.map((typeId) => {
              const mt = MAGIC_TYPES.find((t) => t.id === typeId)
              if (!mt) return null
              return (
                <span
                  key={typeId}
                  className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ background: mt.color, color: mt.textColor }}
                >
                  {mt.label}
                </span>
              )
            })}
          </div>
        </div>
        <span className="text-gray-400 text-xs mt-1 shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Tree modifiers (always visible if any) */}
      {applicableModifiers.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {applicableModifiers.map((mod, i) => <SpellModifierTag key={i} mod={mod} />)}
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2.5 flex flex-col gap-2">
          {spell.description && (
            <p className="text-xs text-gray-600 dark:text-gray-300">{spell.description}</p>
          )}
          {spell.notes && (
            <p className="text-[11px] text-gray-400 italic">{spell.notes}</p>
          )}
          {/* Level table */}
          {nonEmptyLevels.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Níveis</span>
              <div className="grid gap-1">
                {nonEmptyLevels.map((entry) => (
                  <div
                    key={String(entry.level)}
                    className="grid grid-cols-[auto_1fr_1fr] gap-2 items-center bg-gray-50 dark:bg-gray-800/60 rounded px-2 py-1 text-xs"
                  >
                    <span
                      className="shrink-0 w-8 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                      style={{
                        background: entry.level === 'divino' ? '#6d28d9' : '#374151',
                        color: '#fff',
                      }}
                    >
                      {SPELL_LEVEL_LABELS[entry.level]}
                    </span>
                    <span className="text-gray-600 dark:text-gray-300 truncate">{entry.cost}</span>
                    <span className="text-gray-500 dark:text-gray-400 truncate">{entry.scaling}</span>
                    {entry.special && (
                      <span className="col-span-3 text-violet-600 dark:text-violet-400 text-[10px]">
                        ✦ {entry.special}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SpellListV2() {
  const { unlockedSpells, spellModifiers } = useCharacterV2Stats()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
          Magias
        </h2>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">da Árvore de Talento</span>
      </div>

      {unlockedSpells.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-600">
            Nenhuma magia desbloqueada ainda.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
            Adquira nós de Magia na Árvore de Talento.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {unlockedSpells.map((spell, i) => (
            <SpellCard key={spell.name + i} spell={spell} modifiers={spellModifiers} />
          ))}
        </div>
      )}
    </div>
  )
}
