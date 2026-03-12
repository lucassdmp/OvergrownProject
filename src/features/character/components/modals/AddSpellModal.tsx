import { useState } from 'react'
import Modal from '../../../../components/ui/Modal'
import { ELEMENTS } from '../../../../data/elements'
import { MAGIC_TYPES } from '../../../../data/magicTypes'
import type { CustomSpell, ElementId, MagicTypeId, SpellLevelEntry, SpellLevel } from '../../../../types/game'
import { useCharacterStore } from '../../store/characterStore'

const LEVEL_KEYS: SpellLevel[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'divino']

interface LevelRow {
  cost: string
  scaling: string
  special: string
}

const emptyRow = (): LevelRow => ({ cost: '', scaling: '', special: '' })

interface Props {
  onClose: () => void
  existing?: CustomSpell
}

export default function AddSpellModal({ onClose, existing }: Props) {
  const addSpell = useCharacterStore((s) => s.addSpell)
  const updateSpell = useCharacterStore((s) => s.updateSpell)

  const [name, setName] = useState(existing?.name ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [elements, setElements] = useState<ElementId[]>(existing?.elements ?? [])
  const [types, setTypes] = useState<MagicTypeId[]>(existing?.types ?? [])
  const [rows, setRows] = useState<LevelRow[]>(
    existing
      ? LEVEL_KEYS.map((lv) => {
          const entry = existing.levels.find((l) => l.level === lv)
          return { cost: entry?.cost ?? '', scaling: entry?.scaling ?? '', special: entry?.special ?? '' }
        })
      : LEVEL_KEYS.map(emptyRow),
  )
  const [specDesc, setSpecDesc] = useState<string>(
    existing ? Object.entries(existing.specialDescriptions).map(([k, v]) => `${k}: ${v}`).join('\n') : '',
  )

  function toggleElement(id: ElementId) {
    setElements((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]))
  }

  function toggleType(id: MagicTypeId) {
    setTypes((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  function updateRow(i: number, field: keyof LevelRow, value: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)))
  }

  function parseSpecialDescriptions(raw: string): Record<string, string> {
    const result: Record<string, string> = {}
    for (const line of raw.split('\n')) {
      const idx = line.indexOf(':')
      if (idx > -1) {
        result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
      }
    }
    return result
  }

  function handleSave() {
    if (!name.trim()) return

    const levels: SpellLevelEntry[] = LEVEL_KEYS.map((lv, i) => ({
      level: lv,
      cost: rows[i].cost,
      scaling: rows[i].scaling,
      special: rows[i].special.trim() || null,
    }))

    const spell: CustomSpell = {
      id: existing?.id ?? crypto.randomUUID(),
      name: name.trim(),
      category: existing?.category?.trim() ?? '',
      description: description.trim(),
      notes: notes.trim() || undefined,
      elements,
      types,
      levels,
      specialDescriptions: parseSpecialDescriptions(specDesc),
    }

    if (existing) updateSpell(spell)
    else addSpell(spell)
    onClose()
  }

  return (
    <Modal title={existing ? 'Editar Magia' : 'Adicionar Magia'} onClose={onClose} size="xl">
      {/* Basic info */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs text-gray-400">Nome da Magia *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Encharcar"
            className="input-field"
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs text-gray-400">Notas (escala)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ex: Aumenta o dano por nível"
            className="input-field"
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs text-gray-400">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="input-field resize-none"
          />
        </div>
      </div>

      {/* Elements */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 mb-1.5 block">Elementos</label>
        <div className="flex flex-wrap gap-2">
          {ELEMENTS.map((el) => (
            <button
              key={el.id}
              onClick={() => toggleElement(el.id as ElementId)}
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold transition border"
              style={{
                background: elements.includes(el.id as ElementId) ? el.color : 'transparent',
                color: elements.includes(el.id as ElementId) ? el.textColor : el.color,
                borderColor: el.color,
                opacity: elements.includes(el.id as ElementId) ? 1 : 0.5,
              }}
            >
              {el.label}
            </button>
          ))}
        </div>
      </div>

      {/* Magic Types */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 mb-1.5 block">Tipos de Magia</label>
        <div className="flex flex-wrap gap-2">
          {MAGIC_TYPES.map((mt) => (
            <button
              key={mt.id}
              onClick={() => toggleType(mt.id as MagicTypeId)}
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold transition border"
              style={{
                background: types.includes(mt.id as MagicTypeId) ? mt.color : 'transparent',
                color: types.includes(mt.id as MagicTypeId) ? mt.textColor : mt.color,
                borderColor: mt.color,
                opacity: types.includes(mt.id as MagicTypeId) ? 1 : 0.5,
              }}
            >
              {mt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Level table */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 mb-1.5 block">Tabela de Níveis</label>
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800/60">
                <th className="px-2 py-1.5 text-left text-gray-400 w-10">Nível</th>
                <th className="px-2 py-1.5 text-left text-gray-400">Custo</th>
                <th className="px-2 py-1.5 text-left text-gray-400">Escala</th>
                <th className="px-2 py-1.5 text-left text-gray-400">Especial</th>
              </tr>
            </thead>
            <tbody>
              {LEVEL_KEYS.map((lv, i) => (
                <tr key={String(lv)} className="border-b border-gray-800 hover:bg-gray-800/30">
                  <td className="px-2 py-1 font-bold text-amber-400 w-10">
                    {lv === 'divino' ? 'Div' : lv}
                  </td>
                  <td className="px-1 py-0.5">
                    <input
                      value={rows[i].cost}
                      onChange={(e) => updateRow(i, 'cost', e.target.value)}
                      placeholder="ex: 6 IEP"
                      className="w-full rounded bg-gray-800 px-1.5 py-0.5 text-gray-200 border border-transparent focus:border-amber-600 focus:outline-none"
                    />
                  </td>
                  <td className="px-1 py-0.5">
                    <input
                      value={rows[i].scaling}
                      onChange={(e) => updateRow(i, 'scaling', e.target.value)}
                      placeholder="ex: 2D8 + WIS"
                      className="w-full rounded bg-gray-800 px-1.5 py-0.5 text-gray-200 border border-transparent focus:border-amber-600 focus:outline-none"
                    />
                  </td>
                  <td className="px-1 py-0.5">
                    <input
                      value={rows[i].special}
                      onChange={(e) => updateRow(i, 'special', e.target.value)}
                      placeholder="Nome do especial"
                      className="w-full rounded bg-gray-800 px-1.5 py-0.5 text-amber-300/80 border border-transparent focus:border-amber-600 focus:outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Special descriptions */}
      <div className="mb-6">
        <label className="text-xs text-gray-400 mb-1 block">
          Descrições dos Especiais <span className="text-gray-600">(formato: Nome: Descrição, uma por linha)</span>
        </label>
        <textarea
          value={specDesc}
          onChange={(e) => setSpecDesc(e.target.value)}
          rows={3}
          placeholder="Invocação Livre: Conjura a até 9m.
Dilúvio: Transforma o terreno em alagado."
          className="input-field w-full resize-none font-mono text-xs"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">
          Cancelar
        </button>
        <button onClick={handleSave} disabled={!name.trim()} className="btn-primary disabled:opacity-40">
          {existing ? 'Salvar' : 'Adicionar Magia'}
        </button>
      </div>

      {/* Global input styles scoped to this modal */}
      <style>{`
        .input-field {
          width: 100%;
          background: rgb(31 41 55);
          border: 1px solid rgb(55 65 81);
          border-radius: 0.375rem;
          padding: 0.375rem 0.5rem;
          color: white;
          font-size: 0.875rem;
        }
        .input-field:focus { outline: none; border-color: rgb(217 119 6); }
        .btn-primary {
          background: rgb(180 83 9);
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
          padding: 0.5rem 1.25rem;
          border-radius: 0.5rem;
          transition: background 0.15s;
        }
        .btn-primary:hover:not(:disabled) { background: rgb(217 119 6); }
        .btn-secondary {
          background: transparent;
          color: rgb(156 163 175);
          font-weight: 600;
          font-size: 0.875rem;
          padding: 0.5rem 1.25rem;
          border-radius: 0.5rem;
          border: 1px solid rgb(75 85 99);
          transition: all 0.15s;
        }
        .btn-secondary:hover { border-color: rgb(156 163 175); color: white; }
      `}</style>
    </Modal>
  )
}
